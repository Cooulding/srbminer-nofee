#!/usr/bin/env python3
# patch_win.py v2 —— Windows pin patch（ReadProcessMemory + 启发式发现 + 崩溃自动重启）
#
#  用法: python patch_win.py <SRBMiner.exe> [矿工参数透传...] [--guarded-discover] [--no-discover] [--auto-restart]
#
#  开关:
#    --guarded-discover 显式开启 guarded 发现（默认已是该模式，仅为可读性保留）
#    --no-discover    关闭启发式 pin 发现
#    --auto-restart   矿工崩溃/退出后自动重启（间隔 8 秒）
#
#  启发式发现（对付新 devpool，不用改脚本）:
#    ① 锚点扩展：在「已知 pin」出现的位置 ±1KB 范围内，找新的 32 字节高熵块
#       （pin 都存在同一类结构里，新 devpool 的 pin 大概率就在老 pin 旁边）
#    ② IP 锚定：在内存里搜新 devpool 的 IP 字符串，附近找 32 字节高熵块
#
#  guarded 试写（默认，替代旧版盲写）:
#    候选逐个写入 → 观察 120 秒：矿工崩溃 → 拉黑（持久化到 pins_state.json），
#    重启后测下一个候选；存活 → 保留为新 pin（同样持久化）。
#    旧版"出现≥3次直接加入"在 3.8 上盲写了毒数据导致 0xC0000374 崩溃，已废弃。
import subprocess, time, sys, os, json, socket, ssl, ctypes, signal
import ctypes.wintypes as wt
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path: sys.path.insert(0, HERE)

REAL_PINS = [
    bytes.fromhex("bd3a865abeed8323371c2cdf489d116686d34d7ec250c320ce426a6c1a6f442b"),
    bytes.fromhex("bfdb1716f350202f9b2e57811b9af14949ed2f9011441f0b334b71419cb5d74b"),
    bytes.fromhex("7747a10d0c5a539214bf850759722d40aa9d27c6a7a99725417728223c05fe69"),
    bytes.fromhex("b9bc7fe6e7a89774f63bc6322c6ce8a89e562e6721baa704962f293cc592562a"),
    bytes.fromhex("52dc6759812d4c8156aef4dc158576d82046e7713a413797f40d7a40ad9c3c3e"),
]

# 实测写必崩的毒数据（0xC0000374）：看起来像 pin（高熵、出现在端点表附近）但不是 pin 槽位。
# 预置进黑名单，guarded 试写永远不会碰它们。
KNOWN_POISON = [
    "00904324407fa1fd6fd8e5d277621d383326d9769cfe01a88059f9e25119eae1",
    "36322e35333a3132303000128a96d4cbfbdf5acaa1f7d503963898dff177c602",  # ASCII "62.53:1200\0" 碎片
]

SOAK_SECONDS = 120  # 每个候选的观察期

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pins_state.json")

def load_state():
    """pins_state.json: {"blacklist": [...], "accepted": [...]}（均为 hex 字符串）"""
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            s = json.load(f)
        return set(s.get("blacklist", [])), list(s.get("accepted", []))
    except Exception:
        return set(), []

def save_state(blacklist, accepted):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"blacklist": sorted(blacklist), "accepted": list(accepted)}, f, indent=1)
    os.replace(tmp, STATE_FILE)

# 新 devpool 线索（直连取不到证书时，用 IP 锚定法在内存里找它的 pin）
DEVPOOL_HINTS = [
    "91.107.234.212",   # :18005 直连被拒，pin 未知 → 靠启发式
    "37.27.63.70",      # fi.pearl.herominers.com:1200
]

k32 = ctypes.windll.kernel32
k32.OpenProcess.restype = ctypes.c_void_p
k32.OpenProcess.argtypes = [wt.DWORD, wt.BOOL, wt.DWORD]
k32.ReadProcessMemory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
k32.WriteProcessMemory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]
k32.VirtualProtectEx.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t, wt.DWORD, ctypes.POINTER(wt.DWORD)]
k32.VirtualQueryEx.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
k32.VirtualQueryEx.restype = ctypes.c_size_t

class MBI(ctypes.Structure):
    _fields_ = [("BaseAddress", ctypes.c_size_t), ("AllocationBase", ctypes.c_size_t),
        ("AllocationProtect", wt.DWORD), ("_pad1", wt.DWORD), ("RegionSize", ctypes.c_size_t),
        ("State", wt.DWORD), ("Protect", wt.DWORD), ("Type", wt.DWORD)]

PROCESS_ALL_ACCESS = 0x1F0FFF
MEM_COMMIT = 0x1000
WRITABLE = {0x04, 0x06, 0x40, 0x02, 0x20, 0x80}

def iter_regions(h):
    addr = 0
    mbi = MBI()
    while True:
        if k32.VirtualQueryEx(h, addr, ctypes.byref(mbi), ctypes.sizeof(mbi)) == 0:
            return
        base, size = mbi.BaseAddress, mbi.RegionSize
        if size:
            addr = base + size
        else:
            addr += 0x1000
            continue
        if mbi.State != MEM_COMMIT or mbi.Protect & 0xFF not in WRITABLE:
            continue
        if size > 4 * 1024 * 1024:
            continue
        buf = (ctypes.c_ubyte * size)()
        rb = ctypes.c_size_t()
        if k32.ReadProcessMemory(h, base, buf, size, ctypes.byref(rb)):
            yield base, bytes(buf[:rb.value])

def is_hash_like(blk):
    if len(set(blk)) < 28: return False
    # 拒绝含长 ASCII 串的块（如 IP:port 字符串碎片 "62.53:1200\0"），替换这类块会写坏堆。
    # 阈值取 8：随机 32 字节出现 ≥8 连续可打印字符的概率 <1%，误杀真 pin 风险很小
    run = 0
    for b in blk:
        if 32 <= b < 127:
            run += 1
            if run >= 8: return False
        else:
            run = 0
    return True

def is_shifted_copy(blk, known_pins):
    """blk 是否与某个已知 32 字节块重叠（滑动窗口产生的错位副本）。
    只要有一个字节重叠就拒绝：写这种窗口会波及相邻关键字段（如端点表毒数据的
    头字节），实测会触发 0xC0000374 崩溃；且这类块本身也不是 pin。"""
    for pin in known_pins:
        for sh in range(1, 32):
            if blk[sh:] == pin[:32 - sh]: return True   # blk 覆盖 pin 头部
            if blk[:32 - sh] == pin[sh:]: return True   # blk 覆盖 pin 尾部
    return False

def scan_and_patch(h, mine_sha, pins, discover=None):
    """一遍扫描：替换已知 pin；discover 为 Counter 时同时收集锚点附近的新候选"""
    n = 0
    for base, data in iter_regions(h):
        for pin in pins:
            idx = data.find(pin)
            while idx >= 0:
                old = wt.DWORD()
                if k32.VirtualProtectEx(h, base + idx, 32, 0x40, ctypes.byref(old)):
                    w = ctypes.c_size_t()
                    if k32.WriteProcessMemory(h, base + idx, mine_sha, 32, ctypes.byref(w)):
                        n += 1
                idx = data.find(pin, idx + 32)
        if discover is not None:
            # ① 锚点扩展：已知 pin ±1KB 找新 32B 高熵块
            for pin in pins:
                idx = data.find(pin)
                while idx >= 0:
                    lo, hi = max(0, idx - 1024), min(len(data), idx + 1024 + 32)
                    w = data[lo:hi]
                    for off in range(0, len(w) - 32):
                        blk = w[off:off + 32]
                        if blk != mine_sha and blk not in pins and is_hash_like(blk)                            and not is_shifted_copy(blk, pins + [mine_sha]):
                            discover[blk] += 1
                    idx = data.find(pin, idx + 32)
            # ② IP 锚定：devpool IP 字符串 ±1KB 找 32B 高熵块
            for ip in DEVPOOL_HINTS:
                ipb = ip.encode()
                idx = data.find(ipb)
                while idx >= 0:
                    lo, hi = max(0, idx - 1024), min(len(data), idx + 1024 + 32)
                    w = data[lo:hi]
                    for off in range(0, len(w) - 32):
                        blk = w[off:off + 32]
                        if blk != mine_sha and blk not in pins and is_hash_like(blk)                            and not is_shifted_copy(blk, pins + [mine_sha]):
                            discover[blk] += 1
                    idx = data.find(ipb, idx + len(ipb))
    return n

def parse_proxy(args):
    for i, a in enumerate(args):
        if a == "--proxy" and i + 1 < len(args): return args[i + 1]
        if a.startswith("--proxy="): return a.split("=", 1)[1]
    return None

def proxy_spki(proxy):
    import spki_util
    h, p = proxy.rsplit(":", 1)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    raw = socket.create_connection((h, int(p)), timeout=8)
    raw.sendall(bytes([5, 1, 0])); raw.recv(2)
    th = b"193.70.33.43"
    raw.sendall(bytes([5, 1, 0, 3, len(th)]) + th + (3360).to_bytes(2, "big")); raw.recv(10)
    tls = ctx.wrap_socket(raw, server_hostname="x")
    sp = spki_util.spki_from_peer_cert(tls); tls.close(); return sp

def find_miner_pid():
    try:
        out = subprocess.run(["tasklist", "/FO", "CSV"], capture_output=True).stdout.decode("gbk", "replace")
        for line in out.splitlines():
            if "SRBMiner" in line:
                pid = line.split('","')[1]
                return int(pid)
    except Exception:
        pass
    return None

def main():
    argv = sys.argv[1:]
    auto_restart = "--auto-restart" in argv or "--restart" in argv
    no_discover = "--no-discover" in argv
    argv = [a for a in argv if a not in ("--auto-restart", "--restart", "--no-discover", "--guarded-discover")]

    if not argv:
        print("用法: python patch_win.py <SRBMiner.exe> [矿工参数...] [--auto-restart] [--no-discover]")
        return 1
    exe, miner_args = argv[0], argv[1:]
    if not os.path.isfile(exe): print("[X] 找不到:", exe); return 1

    print("=" * 60)
    print("patch_win v2 (ReadProcessMemory + 启发式%s)" % ("[关]" if no_discover else "[guarded试写]"))
    print("=" * 60)
    proxy = parse_proxy(miner_args)
    if not proxy: print("[X] 缺 --proxy"); return 1
    try:
        mine_hex = proxy_spki(proxy)
        mine_sha = bytes.fromhex(mine_hex)
        print("  替换目标(%s): %s" % (proxy, mine_hex))
    except Exception as e:
        print("[X] 探测代理失败:", e); return 1

    blacklist, accepted = load_state()
    blacklist |= set(KNOWN_POISON)
    pins = list(REAL_PINS)
    for hx in accepted:
        b = bytes.fromhex(hx)
        if b not in pins:
            pins.append(b)
    if not os.path.isfile(STATE_FILE):
        save_state(blacklist, accepted)
    print("  初始 pin: %d 个（含持久化新 pin %d 个）/ 黑名单 %d 个 / IP 锚点: %d 个"
          % (len(pins), len(accepted), len(blacklist), len(DEVPOOL_HINTS)))
    print("  auto-restart: %s\n" % ("开" if auto_restart else "关"))

    logf = open(os.path.join(os.path.dirname(os.path.abspath(exe)), "run_out.log"), "ab")

    def cleanup(*a):
        print("\n  退出中...")
        try:
            p.terminate(); p.wait(timeout=8)
        except Exception:
            subprocess.run(["taskkill", "/F", "/PID", str(p.pid)], capture_output=True)
        sys.exit(0)
    signal.signal(signal.SIGINT, cleanup); signal.signal(signal.SIGTERM, cleanup)

    while True:  # 重启循环
        p = subprocess.Popen([exe] + miner_args, cwd=os.path.dirname(os.path.abspath(exe)),
                             stdout=logf, stderr=logf, stdin=subprocess.DEVNULL,
                             creationflags=0x00000008)
        print("  矿工 pid=%d，等 8 秒加载 pin..." % p.pid, flush=True)
        time.sleep(8)

        h = k32.OpenProcess(PROCESS_ALL_ACCESS, False, p.pid)
        if not h:
            print("[X] OpenProcess 失败"); return 1

        # 第一轮：patch + 启发式发现
        t0 = time.time()
        cands = Counter() if not no_discover else None
        n = scan_and_patch(h, mine_sha, pins, discover=cands)
        total = n
        if n:
            print("[%0.1fs] 替换 %d 处（累计 %d）" % (time.time() - t0, n, total), flush=True)

        # guarded 试写：候选逐个写入观察，崩→拉黑，活→保留（替代旧版盲写）
        if cands:
            overlap_refs = pins + [mine_sha] + [bytes.fromhex(h) for h in blacklist if len(h) == 64]
            for blk, cnt in cands.most_common(8):
                hx = blk.hex()
                if cnt < 3 or blk in pins:
                    continue
                if hx in blacklist:
                    print("  · 跳过黑名单候选 %s" % hx, flush=True)
                    continue
                if is_shifted_copy(blk, overlap_refs):
                    print("  · 跳过与已知块重叠的候选 %s" % hx, flush=True)
                    continue
                print("  ◆ 试写候选 %s（计数 %d）→ 观察 %d 秒..." % (hx, cnt, SOAK_SECONDS), flush=True)
                nw = scan_and_patch(h, mine_sha, pins + [blk])
                print("    写入 %d 处" % nw, flush=True)
                dead = False
                t_end = time.time() + SOAK_SECONDS
                while time.time() < t_end:
                    if p.poll() is not None:
                        dead = True
                        break
                    scan_and_patch(h, mine_sha, pins + [blk])
                    time.sleep(0.3)
                if dead:
                    print("    ✗ 矿工崩溃 → 拉黑 %s（重启后测下一个候选）" % hx, flush=True)
                    if not auto_restart:
                        print("    （未开 --auto-restart：重新运行本脚本将继续测试剩余候选）")
                    blacklist.add(hx)
                    save_state(blacklist, accepted)
                    break
                print("    ✓ 观察期通过 → 保留为新 pin", flush=True)
                pins.append(blk)
                accepted.append(hx)
                save_state(blacklist, accepted)

        # 后续循环：持续 patch（矿工可能重新解密 pin）
        while True:
            if p.poll() is not None:
                break
            n = scan_and_patch(h, mine_sha, pins)
            total += n
            if n:
                print("[%0.1fs] 替换 %d 处（累计 %d）" % (time.time() - t0, n, total), flush=True)
            time.sleep(0.3)

        k32.CloseHandle(h)
        rc = p.returncode
        if not auto_restart:
            print("矿工退出 rc=%s，总替换 %d 处" % (rc, total))
            break
        print("矿工退出 rc=%s，8 秒后重启..." % rc, flush=True)
        time.sleep(8)

if __name__ == "__main__":
    main()
