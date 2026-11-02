'use strict';
// 内存压测：大量份额 + 连接 churn + 配置热切换 + SSE 订阅，观察堆增长与结构上限
// 用法：node scripts/soak-memory.cjs [webPort] [entryPort]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const webPort = Number(process.argv[2]) || 3390;
const entryPort = Number(process.argv[3]) || 19090;

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-soak-'));
  const sockets = new Set();
  const pool = net.createServer({ allowHalfOpen: true }, socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buffer = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      let position;
      while ((position = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, position + 1);
        buffer = buffer.slice(position + 1);
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.method === 'mining.authorize' || message.method === 'login') {
          socket.write(JSON.stringify({ id: message.id, result: true, error: null }) + '\n');
          socket.write(JSON.stringify({ method: 'mining.notify', params: { job_id: 'soak-job', difficulty: 1000 } }) + '\n');
        } else if (message.method === 'mining.submit' || message.method === 'submit') {
          socket.write(JSON.stringify({ id: message.id, result: true, error: null }) + '\n');
        } else if (message.id !== undefined) {
          socket.write(JSON.stringify({ id: message.id, result: true, error: null }) + '\n');
        }
      }
    });
  });
  await new Promise(resolve => pool.listen(0, '127.0.0.1', resolve));
  const poolPort = pool.address().port;
  const config = JSON.parse(fs.readFileSync(path.join(root, 'data/config.json'), 'utf8'));
  config.settings.web = { host: '127.0.0.1', port: webPort };
  config.listeners = [];
  fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify(config, null, 2));
  const app = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, WEB_HOST: '127.0.0.1', WEB_PORT: String(webPort), WEB_TOKEN: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  app.stdout.on('data', chunk => { output += chunk; });
  app.stderr.on('data', chunk => { output += chunk; });
  const call = async (route, method = 'GET', data) => {
    const response = await fetch(`http://127.0.0.1:${webPort}${route}`, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
    return response.json();
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const eventually = async (check, timeout = 8000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const value = await check(); if (value) return value; await delay(50); }
    throw new Error(`等待超时 | ${output.slice(-300)}`);
  };
  const sampleMemory = async label => {
    await delay(400);
    const samples = [];
    for (let index = 0; index < 4; index += 1) { const state = await call('/api/status'); samples.push(state.memory); await delay(250); }
    const rss = Math.min(...samples.map(item => item.rss));
    const heapUsed = Math.min(...samples.map(item => item.heapUsed));
    console.log(`[mem] ${label}: RSS ${(rss / 1048576).toFixed(1)} MB · heapUsed ${(heapUsed / 1048576).toFixed(1)} MB`);
    return { rss, heapUsed };
  };
  const socksLogin = async wallet => {
    const socket = net.connect({ host: '127.0.0.1', port: entryPort });
    socket.on('error', () => {});
    socket.resume();
    await new Promise(resolve => socket.once('connect', resolve));
    socket.write(Buffer.from([5, 1, 0]));
    await delay(80);
    const host = Buffer.from('pool.example');
    socket.write(Buffer.concat([Buffer.from([5, 1, 0, 3, host.length]), host, Buffer.from([0x0d, 0x20])]));
    await delay(80);
    let buffer = '';
    socket.on('data', chunk => { buffer += chunk.toString(); });
    socket.write(` {"id":1,"method":"mining.authorize","params":{"wallet":"${wallet}","type":"v2"}}\r\n`);
    await eventually(() => buffer.includes('"id":1'));
    return socket;
  };
  try {
    await eventually(async () => { try { return (await fetch(`http://127.0.0.1:${webPort}/api/status`)).ok; } catch { return false; } });
    const settings = (await call('/api/status')).settings;
    const base = { coins: { prl: { ...settings.coins.prl, enabled: true, poolHost: '127.0.0.1', poolPort, poolTls: false, wallet: 'own-prl', wallets: ['own-prl'] }, qtc: settings.coins.qtc }, nock: settings.nock, routing: settings.routing, tls: settings.tls };
    await call('/api/settings', 'PUT', base);
    await call('/api/listeners', 'POST', { name: '压测入口', enabled: true, listenHost: '127.0.0.1', listenPort: entryPort, mode: 'direct', clientTransport: 'auto' });
    if (process.env.SOAK_VIEWER !== '0') {
      const viewer = await fetch(`http://127.0.0.1:${webPort}/api/events`);
      const reader = viewer.body.getReader();
      (async () => { try { while (true) { const { done } = await reader.read(); if (done) break; } } catch {} })();
    }
    const miner = await socksLogin('soak.3080');
    for (let index = 0; index < 500; index += 1) miner.write(JSON.stringify({ id: 100 + index, method: 'mining.submit', params: { job_id: 'soak-job', nonce: 'x' } }) + '\n');
    const early = await sampleMemory('500 份额后');
    for (let index = 0; index < 6000; index += 1) miner.write(JSON.stringify({ id: 1000 + index, method: 'mining.submit', params: { job_id: 'soak-job', nonce: 'x' } }) + '\n');
    await delay(800);
    const afterShares = await sampleMemory('6500 份额后');
    for (let index = 0; index < 150; index += 1) { const socket = await socksLogin(`churn.${index % 20}`); socket.destroy(); if (index % 30 === 0) await delay(50); }
    const afterChurn = await sampleMemory('150 次连接 churn 后');
    for (let index = 0; index < 10; index += 1) {
      base.coins.prl = { ...base.coins.prl, wallets: [`own-prl-${index}`], wallet: `own-prl-${index}` };
      await call('/api/settings', 'PUT', base);
      await delay(120);
    }
    const afterSwitches = await sampleMemory('10 次热切换后');
    const runtime = await call('/api/runtime');
    const bucketTotal = Object.values(runtime.gateways).flatMap(gateway => gateway.miners).reduce((sum, item) => sum + (item.shareBuckets?.length || 0), 0);
    const state = await call('/api/status');
    console.log(`[结构] 矿机行 ${state.miners.length} · 桶合计 ${bucketTotal} · 会话 ${state.sessions.length}`);
    console.log(`[结论] 份额从 500 → 6500 堆增长 ${((afterShares.heapUsed - early.heapUsed) / 1048576).toFixed(1)} MB；churn 后 ${((afterChurn.heapUsed - early.heapUsed) / 1048576).toFixed(1)} MB；热切换后 ${((afterSwitches.heapUsed - early.heapUsed) / 1048576).toFixed(1)} MB`);
    const failures = [];
    if (afterShares.heapUsed - early.heapUsed > 20 * 1048576) failures.push('份额增长导致堆增长超过 20MB');
    if (afterChurn.heapUsed > 150 * 1048576) failures.push('churn 后堆超过 150MB');
    if (afterSwitches.heapUsed > 160 * 1048576) failures.push('热切换后堆超过 160MB');
    if (bucketTotal > state.miners.length * 361) failures.push(`桶数量 ${bucketTotal} 超过结构上限`);
    console.log(failures.length ? `未通过: ${failures.join('; ')}` : '内存压测通过');
    if (failures.length) process.exitCode = 1;
  } finally {
    app.kill();
    for (const socket of sockets) socket.destroy();
    pool.close();
    await delay(300);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch(error => { console.error('压测失败:', error.message); process.exit(1); });
