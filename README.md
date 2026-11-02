# SRBMiner-nofee

## Core Principle

Modify the miner's runtime behavior so that it trusts any certificate when connecting to DevPool, then use a SOCKS5 proxy to redirect DevPool traffic and replace the wallet address.

## Deployment Notes

It is recommended to prepare at least two machines to improve the success rate.

Deploy a SOCKS5 honeypot server on another machine inside the internal network, so that it can handle DevPool traffic redirection and wallet field replacement.

## Network Architecture

```text
              Upstream pool
                  ▲
                  │
          SOCKS5 honeypot server
     (DevPool redirect / wallet replacement)
                  ▲
                  │
          ┌───────┼───────┐
          │       │       │
       Miner1  Miner2  Miner3 ...
```

Every miner must specify the actual IP address and port of the SOCKS5 server through `--proxy`.

## Usage

```bash
# for Windows
python patch_win.py <path to SRBMiner-MULTI.exe> --proxy 192.168.1.2:1080 --pool xxx --wallet xxx

#python patch_win.py "C:\Users\Administrator\Downloads\SRBMiner-Multi-3-7-5\SRBMiner-MULTI.exe" --disable-cpu --algorithm quantus --pool hk.lproute.com:5660 --wallet ??.?? --proxy 192.168.1.2:1080 --api-enable

# for Linux

sudo iptables -A OUTPUT -p tcp -m multiport --dports 8049,8048,3360,5660,1200,18005 -j DROP

# The Linux version of the miner calls wget to download a file. To keep this file from changing or from generating extra network traffic, wrap a wget that returns the local dont_block_4.txt
chmod +x wget
export PATH="$PWD:$PATH"

python patch_linux.py <path to SRBMiner-MULTI.exe> --proxy 192.168.1.2:1080 --pool xxx --wallet xxx

#python3 /root/patch_linux.py /root/SRBMiner-Multi-3-7-5/SRBMiner-MULTI -disable-cpu --algorithm quantus --pool hk.lproute.com:5660 --wallet ??.?? --proxy 192.168.1.2:1080 --api-enable
```

Change `192.168.1.2:1080` to the SOCKS5 honeypot server you deployed. Port 1080 is recommended.

**Note:** If the kernel cannot reach DevPool through the SOCKS5 proxy, it may try to bypass the proxy and connect to DevPool directly, which would break the redirection and wallet replacement test.

Therefore, you can block direct connections on the specified ports with a firewall on the miner itself, to be absolutely sure.

**Execute on the miner (not on the SOCKS5 server):**

For Windows (persistent):

```powershell
New-NetFirewallRule `
  -DisplayName "Block TCP Outbound devpool Ports" `
  -Direction Outbound `
  -Action Block `
  -Protocol TCP `
  -RemotePort 1200,8049,8048,3360,5660,18005 `
  -Profile Any
```

For Linux (lost after reboot):

```shell
sudo iptables -A OUTPUT -p tcp -m multiport --dports 1200,8049,8048,3360,5660,18005 -j DROP
```

## Restoring Firewall Rules

After testing is complete, run the following on the miner:
For Windows (persistent):

```powershell
Remove-NetFirewallRule -DisplayName "Block TCP Outbound devpool Ports"
```

## Running the Honeypot Server

```shell
cd srbminer-nofee\SOCKS5 honeypot
npm i
npm start
```

# SRBMiner-nofee

## 核心原理

修改矿工运行时行为，使其连接 DevPool 时信任任意证书，再通过 SOCKS5 代理实现 DevPool 重定向及钱包地址替换。

## 部署说明

由于建立防火墙规则防止miner本身逃逸,一定程度上也会阻止SOCKS5 蜜罐服务器连接到你的用户矿池,所以建议至少准备两台机器，以提高成功率,如果你是技术大牛,也可以在矿机上运行.

在内网另一台机器上部署 SOCKS5 蜜罐服务器，用于处理 DevPool 流量重定向及钱包字段替换。

## 网络架构

```text
              上游矿池
                  ▲
                  │
          SOCKS5 蜜罐服务器
        (DevPool 重定向 / 钱包替换)
                  ▲
                  │
          ┌───────┼───────┐
          │       │       │
        矿机1    矿机2    矿机3 ...
```

所有矿机都必须通过 `--proxy` 指定 SOCKS5 服务器的实际 IP 和端口。


## 使用方法

```bash
#for win
python patch_win.py <SRBMiner-MULTI.exe路径> --proxy 192.168.1.2:1080 --pool xxx --wallet xxx

#python patch_win.py "C:\Users\Administrator\Downloads\SRBMiner-Multi-3-7-5\SRBMiner-MULTI.exe" --disable-cpu --algorithm quantus --pool hk.lproute.com:5660 --wallet ??.?? --proxy 192.168.1.2:1080 --api-enable

#for Linux

sudo iptables -A OUTPUT -p tcp -m multiport --dports 8049,8048,3360,5660,1200,18005 -j DROP

#Linux版本miner会调用wget下载一个文件,避免这个文件发生变化或额外使用网络,封装一个wget返回本地的dont_block_4.txt
chmod +x wget
export PATH="$PWD:$PATH"

python patch_linux.py <SRBMiner-MULTI.exe路径> --proxy 192.168.1.2:1080 --pool xxx --wallet xxx

#python3 /root/patch_linux.py /root/SRBMiner-Multi-3-7-5/SRBMiner-MULTI -disable-cpu --algorithm quantus --pool hk.lproute.com:5660 --wallet ??.?? --proxy 192.168.1.2:1080 --api-enable
```
192.168.1.2:1080修改为你部署的SOCKS5 蜜罐服务器,建议使用1080端口

**注意：** 如果内核无法通过 SOCKS5 连接 DevPool，可能会尝试绕过代理直接连接 DevPool，导致重定向和钱包替换测试失效。

因此，可以在矿机上通过防火墙限制指定端口的直连行为,万无一失。

**在矿机上执行（不是 SOCKS5 服务器）：**

对于windows(持久化):
```powershell
New-NetFirewallRule `
  -DisplayName "Block TCP Outbound devpool Ports" `
  -Direction Outbound `
  -Action Block `
  -Protocol TCP `
  -RemotePort 1200,8049,8048,3360,5660,18005 `
  -Profile Any
```

对于linux(重启后失效):
```shell
sudo iptables -A OUTPUT -p tcp -m multiport --dports 1200,8049,8048,3360,5660,18005 -j DROP
```
## 恢复防火墙规则

测试完成后，在矿机上执行：
对于windows(持久化):
```powershell
Remove-NetFirewallRule -DisplayName "Block TCP Outbound devpool Ports"
```





运行蜜罐服务器:

```shell
cd srbminer-nofee\SOCKS5 honeypot
npm i
npm start
```






