'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { Transform, PassThrough } = require('node:stream');
const selfsigned = require('selfsigned');

// SOCKS5 connections
class SocketReader {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.waiter = null;
    this.error = null;
    this.onData = chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      if (this.buffer.length > 262144) this.onError(new Error('SOCKS5 握手缓冲过大'));
      this.drain();
    };
    this.onError = error => { this.error ||= error; this.drain(); };
    this.onClose = () => this.onError(new Error('SOCKS5 连接已关闭'));
    socket.on('data', this.onData);
    socket.on('error', this.onError);
    socket.on('close', this.onClose);
    socket.on('end', this.onClose);
    socket.resume();
  }
  drain() {
    if (!this.waiter) return;
    const { length, resolve, reject } = this.waiter;
    if (this.buffer.length >= length) {
      const result = this.buffer.subarray(0, length);
      this.buffer = this.buffer.subarray(length);
      this.waiter = null;
      resolve(result);
    } else if (this.error) { this.waiter = null; reject(this.error); }
  }
  read(length) {
    if (this.waiter) throw new Error('不能并发读取 SOCKS5 握手');
    return new Promise((resolve, reject) => { this.waiter = { length, resolve, reject }; this.drain(); });
  }
  release() {
    this.socket.pause();
    this.socket.off('data', this.onData);
    this.socket.off('error', this.onError);
    this.socket.off('close', this.onClose);
    this.socket.off('end', this.onClose);
    if (this.buffer.length && !this.socket.destroyed) this.socket.unshift(this.buffer);
    this.buffer = Buffer.alloc(0);
  }
}

function ipv6Bytes(host) {
  let value = host;
  if (value.includes('.')) {
    const last = value.lastIndexOf(':');
    const octets = value.slice(last + 1).split('.').map(Number);
    value = value.slice(0, last + 1) + ((octets[0] << 8) | octets[1]).toString(16) + ':' + ((octets[2] << 8) | octets[3]).toString(16);
  }
  const [left, right] = value.split('::');
  const a = left ? left.split(':') : [];
  const b = right ? right.split(':') : [];
  const words = [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  const buffer = Buffer.alloc(16);
  words.forEach((word, i) => buffer.writeUInt16BE(parseInt(word, 16), i * 2));
  return buffer;
}

function addressBytes(host) {
  if (net.isIP(host) === 4) return Buffer.from([1, ...host.split('.').map(Number)]);
  if (net.isIP(host) === 6) return Buffer.concat([Buffer.from([4]), ipv6Bytes(host)]);
  const name = Buffer.from(host, 'utf8');
  if (!name.length || name.length > 255) throw new Error('SOCKS5 地址无效');
  return Buffer.concat([Buffer.from([3, name.length]), name]);
}

function reply(code, host = '0.0.0.0', port = 0) {
  const suffix = Buffer.alloc(2);
  suffix.writeUInt16BE(port);
  return Buffer.concat([Buffer.from([5, code, 0]), addressBytes(host), suffix]);
}

async function readAddress(reader, type) {
  if (type === 1) return [...await reader.read(4)].join('.');
  if (type === 4) {
    const bytes = await reader.read(16);
    return Array.from({ length: 8 }, (_, i) => bytes.readUInt16BE(i * 2).toString(16)).join(':');
  }
  if (type === 3) {
    const length = (await reader.read(1))[0];
    if (!length) throw new Error('SOCKS5 目标域名为空');
    const host = (await reader.read(length)).toString('utf8');
    if (/[\s\x00/\\]/.test(host)) throw new Error('SOCKS5 目标域名无效');
    return host;
  }
  const error = new Error('不支持的 SOCKS5 地址类型');
  error.replyCode = 8;
  throw error;
}

function equalSecret(value, expected) {
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function receiveRequest(socket, reader, rule) {
  const greeting = await reader.read(2);
  if (greeting[0] !== 5 || !greeting[1]) throw new Error('SOCKS5 问候无效');
  const methods = await reader.read(greeting[1]);
  const method = rule.listenUsername ? 2 : 0;
  if (!methods.includes(method)) {
    socket.write(Buffer.from([5, 255]));
    throw new Error('miner 不支持入口要求的 SOCKS5 认证方式');
  }
  socket.write(Buffer.from([5, method]));
  if (method === 2) {
    const header = await reader.read(2);
    const username = (await reader.read(header[1])).toString('utf8');
    const length = (await reader.read(1))[0];
    const password = (await reader.read(length)).toString('utf8');
    const valid = header[0] === 1 && equalSecret(username, rule.listenUsername) && equalSecret(password, rule.listenPassword);
    socket.write(Buffer.from([1, valid ? 0 : 1]));
    if (!valid) throw new Error('miner SOCKS5 用户名或密码错误');
  }
  const header = await reader.read(4);
  if (header[0] !== 5 || header[2] !== 0) throw new Error('SOCKS5 请求无效');
  if (header[1] !== 1) {
    const error = new Error('矿池入口仅支持 SOCKS5 TCP CONNECT');
    error.replyCode = 7;
    throw error;
  }
  const host = await readAddress(reader, header[3]);
  const port = (await reader.read(2)).readUInt16BE(0);
  if (!port) throw new Error('SOCKS5 目标端口无效');
  return { host, port };
}

function openTcp(host, port, { signal, onSocket = () => {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port, allowHalfOpen: true, signal });
    socket.on('error', () => {});
    onSocket(socket);
    const timer = setTimeout(() => socket.destroy(new Error('连接矿池或上游代理超时')), 10000);
    const cleanup = () => { clearTimeout(timer); socket.off('error', fail); socket.off('close', closed); };
    const fail = error => { cleanup(); reject(error); };
    const closed = () => fail(new Error('连接建立前已关闭'));
    socket.once('error', fail);
    socket.once('close', closed);
    socket.once('connect', () => {
      cleanup();
      socket.setNoDelay(true);
      socket.setKeepAlive(true, 30000);
      socket.pause();
      resolve(socket);
    });
  });
}

async function connectPool(rule, options) {
  const socket = await openTcp(rule.mode === 'socks5' ? rule.socksHost : rule.poolHost, rule.mode === 'socks5' ? rule.socksPort : rule.poolPort, options);
  if (rule.mode !== 'socks5') return socket;
  const reader = new SocketReader(socket);
  socket.setTimeout(10000, () => socket.destroy(new Error('上游 SOCKS5 握手超时')));
  try {
    const authenticated = Boolean(rule.socksUsername || rule.socksPassword);
    socket.write(Buffer.from(authenticated ? [5, 2, 0, 2] : [5, 1, 0]));
    const greeting = await reader.read(2);
    if (greeting[0] !== 5 || greeting[1] === 255) throw new Error('上游 SOCKS5 拒绝认证方式');
    if (greeting[1] === 2) {
      if (!authenticated) throw new Error('上游 SOCKS5 要求用户名密码');
      const user = Buffer.from(rule.socksUsername || '');
      const password = Buffer.from(rule.socksPassword || '');
      socket.write(Buffer.concat([Buffer.from([1, user.length]), user, Buffer.from([password.length]), password]));
      const response = await reader.read(2);
      if (response[0] !== 1 || response[1] !== 0) throw new Error('上游 SOCKS5 认证失败');
    } else if (greeting[1] !== 0) throw new Error('上游 SOCKS5 认证方式不支持');
    const port = Buffer.alloc(2);
    port.writeUInt16BE(rule.poolPort);
    socket.write(Buffer.concat([Buffer.from([5, 1, 0]), addressBytes(rule.poolHost), port]));
    const response = await reader.read(4);
    if (response[0] !== 5 || response[2] !== 0 || response[1] !== 0) throw new Error(`上游 SOCKS5 连接矿池失败 (${response[1]})`);
    await readAddress(reader, response[3]);
    await reader.read(2);
    return socket;
  } catch (error) { socket.destroy(); throw error; }
  finally { reader.release(); socket.setTimeout(0); }
}

function connectPoolTls(socket, rule, onSocket) {
  const options = { socket, host: rule.poolHost, rejectUnauthorized: rule.poolVerifyTls, allowHalfOpen: true, minVersion: 'TLSv1.2' };
  const servername = rule.poolServername || (net.isIP(rule.poolHost) ? '' : rule.poolHost);
  if (servername) options.servername = servername;
  if (rule.poolCaPem) options.ca = rule.originalRoute ? [...tls.rootCertificates, rule.poolCaPem] : rule.poolCaPem;
  const secure = tls.connect(options);
  secure.on('error', () => {});
  onSocket(secure);
  return waitHandshake(secure, 'secureConnect', '矿池 TLS 握手失败');
}

function waitHandshake(socket, event, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => socket.destroy(new Error(`${label}：超时`)), 10000);
    const cleanup = () => { clearTimeout(timer); socket.off('error', fail); socket.off('close', closed); };
    const fail = error => { cleanup(); reject(new Error(`${label}：${error.message}`)); };
    const closed = () => fail(new Error('握手完成前连接关闭'));
    socket.once('error', fail);
    socket.once('close', closed);
    socket.once(event, () => { cleanup(); socket.pause(); resolve(socket); });
  });
}

function detectTransport(socket) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    let finished = false;
    const finish = (error, transport) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.off('readable', read);
      socket.off('error', failed);
      socket.off('end', ended);
      socket.off('close', ended);
      if (length && !socket.destroyed) socket.unshift(Buffer.concat(chunks, length));
      if (error) reject(error); else resolve(transport);
    };
    const failed = error => finish(error);
    const ended = () => finish(new Error('miner 在登录前关闭连接'));
    const read = () => {
      let chunk;
      while ((chunk = socket.read()) !== null) { chunks.push(chunk); length += chunk.length; }
      if (!length) return;
      const bytes = Buffer.concat(chunks, length);
      if (bytes[0] !== 0x16) return finish(null, 'tcp');
      if (length >= 5) {
        if (bytes[1] !== 3 || bytes[2] > 4 || !bytes.readUInt16BE(3)) return finish(new Error('无法识别 miner 的 TLS 握手'));
        finish(null, 'tls');
      }
    };
    const timer = setTimeout(() => finish(new Error('miner 未在 10 秒内发送 TLS 握手或登录报文')), 10000);
    socket.on('readable', read);
    socket.once('error', failed);
    socket.once('end', ended);
    socket.once('close', ended);
    read();
  });
}

// TLS certificates
function validateCertificate(cert, key, passphrase = '') {
  const certificate = new crypto.X509Certificate(cert);
  const privateKey = crypto.createPrivateKey({ key, passphrase });
  if (!certificate.checkPrivateKey(privateKey)) throw new Error('证书与私钥不匹配');
  if (new Date(certificate.validFrom).getTime() > Date.now()) throw new Error('证书尚未生效');
  if (new Date(certificate.validTo).getTime() <= Date.now()) throw new Error('证书已过期');
  tls.createSecureContext({ cert, key, passphrase });
  return certificate;
}

function certificateName(value) {
  const host = String(value).toLowerCase().replace(/\.$/, '');
  if (!net.isIP(host) && !/^(?=.{1,253}$)[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/.test(host)) throw new Error('TLS 服务器名称无效');
  return host;
}

class CertificateManager {
  constructor(directory, bundledDirectory = null) { this.directory = directory; this.bundledDirectory = bundledDirectory; this.defaultSource = 'generated'; this.ca = null; this.cache = new Map(); this.leafKey = null; }
  async seedBundledDefaults() {
    if (!this.bundledDirectory) return;
    const hasBundledDirectory = await fs.access(this.bundledDirectory).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
    if (!hasBundledDirectory) return;
    const certPath = path.join(this.directory, 'gateway-ca.pem');
    const keyPath = path.join(this.directory, 'gateway-ca-key.pem');
    const hasCert = await fs.access(certPath).then(() => true, () => false);
    const hasKey = await fs.access(keyPath).then(() => true, () => false);
    if (hasCert || hasKey) return;
    let cert, key, serverKey;
    try {
      [cert, key, serverKey] = await Promise.all(['gateway-ca.pem', 'gateway-ca-key.pem', 'gateway-server-key.pem'].map(name => fs.readFile(path.join(this.bundledDirectory, name), 'utf8')));
      if (!validateCertificate(cert, key).ca) throw new Error('默认证书不是 CA 证书');
      crypto.createPrivateKey(serverKey);
    } catch (error) { throw new Error(`随项目提供的默认证书加载失败：${error.message}`); }
    const serverPath = path.join(this.directory, 'gateway-server-key.pem');
    if (!await fs.access(serverPath).then(() => true, () => false)) await fs.writeFile(serverPath, serverKey, { mode: 0o600, flag: 'wx' });
    await fs.writeFile(keyPath, key, { mode: 0o600, flag: 'wx' });
    await fs.writeFile(certPath, cert, { mode: 0o600, flag: 'wx' });
  }
  async init() {
    await fs.mkdir(this.directory, { recursive: true });
    await this.seedBundledDefaults();
    const leafPath = path.join(this.directory, 'gateway-server-key.pem');
    let privateKey;
    try { privateKey = await fs.readFile(leafPath, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      privateKey = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1', privateKeyEncoding: { format: 'pem', type: 'pkcs8' }, publicKeyEncoding: { format: 'pem', type: 'spki' } }).privateKey;
      await fs.writeFile(leafPath, privateKey, { mode: 0o600 });
    }
    this.leafKey = { privateKey, publicKey: crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) };
    const certPath = path.join(this.directory, 'gateway-ca.pem');
    const keyPath = path.join(this.directory, 'gateway-ca-key.pem');
    try {
      const cert = await fs.readFile(certPath, 'utf8');
      const key = await fs.readFile(keyPath, 'utf8');
      const x509 = validateCertificate(cert, key);
      if (!x509.ca) throw new Error('本地 CA 文件不是 CA 证书');
      this.ca = { cert, key };
      if (this.bundledDirectory) {
        const bundledCert = await fs.readFile(path.join(this.bundledDirectory, 'gateway-ca.pem'), 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
        if (bundledCert.trim() === cert.trim()) this.defaultSource = 'bundled';
      }
      return;
    } catch (error) {
      // Never silently rotate an existing trust root: miners may already trust it.
      if (error.code !== 'ENOENT') throw new Error(`本地 CA 加载失败：${error.message}`);
      const hasCert = await fs.access(certPath).then(() => true, () => false);
      const hasKey = await fs.access(keyPath).then(() => true, () => false);
      if (hasCert || hasKey) throw new Error('本地 CA 的证书或私钥缺失，请恢复 data 中的配套文件');
    }
    const generated = await selfsigned.generate([{ name: 'commonName', value: 'Miner SOCKS Gateway Local CA' }], {
      keyType: 'ec', curve: 'P-256', algorithm: 'sha256',
      notBeforeDate: new Date(Date.now() - 86400000), notAfterDate: new Date(Date.now() + 5 * 365 * 86400000),
      extensions: [{ name: 'basicConstraints', cA: true }, { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true }]
    });
    this.ca = { cert: generated.cert, key: generated.private };
    await fs.mkdir(this.directory, { recursive: true });
    await fs.writeFile(keyPath, this.ca.key, { mode: 0o600 });
    await fs.writeFile(certPath, this.ca.cert, { mode: 0o600 });
  }
  publicInfo(settings) {
    const cert = settings.mode === 'custom' ? settings.certPem : this.ca.cert;
    const x509 = new crypto.X509Certificate(cert);
    return { mode: settings.mode, source: settings.mode === 'custom' ? 'custom' : this.defaultSource, isCA: x509.ca, subject: x509.subject, validTo: x509.validTo, fingerprint: x509.fingerprint256 };
  }
  publicCertificate(settings) { return settings.mode === 'custom' ? settings.certPem : this.ca.cert; }
  async context(host, settings) {
    const certificate = settings.mode === 'custom' ? { cert: settings.certPem, key: settings.keyPem, passphrase: settings.passphrase || undefined } : this.ca;
    const issuer = new crypto.X509Certificate(certificate.cert);
    const name = certificateName(host);
    const id = `${issuer.fingerprint256}:${issuer.ca ? name : 'fixed'}`;
    const cached = this.cache.get(id);
    if (cached && cached.expires > Date.now() + 86400000) return cached.promise;
    const promise = (async () => {
      if (!issuer.ca) return tls.createSecureContext(certificate);
      const key = crypto.createPrivateKey({ key: certificate.key, passphrase: certificate.passphrase }).export({ type: 'pkcs8', format: 'pem' });
      const generated = await selfsigned.generate([{ name: 'commonName', value: name }], {
        keyType: 'ec', curve: 'P-256', algorithm: 'sha256', ca: { cert: certificate.cert, key }, keyPair: this.leafKey,
        notBeforeDate: new Date(Date.now() - 3600000),
        notAfterDate: new Date(Math.min(Date.now() + 30 * 86400000, new Date(issuer.validTo).getTime())),
        extensions: [
          { name: 'basicConstraints', cA: false }, { name: 'keyUsage', digitalSignature: true },
          { name: 'extKeyUsage', serverAuth: true },
          { name: 'subjectAltName', altNames: [net.isIP(name) ? { type: 7, ip: name } : { type: 2, value: name }] }
        ]
      });
      return tls.createSecureContext({ cert: generated.cert + '\n' + certificate.cert, key: generated.private, minVersion: 'TLSv1.2' });
    })();
    if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(id, { promise, expires: Math.min(Date.now() + 30 * 86400000, new Date(issuer.validTo).getTime()) });
    promise.catch(() => this.cache.delete(id));
    return promise;
  }
  async accept(socket, requestedHost, settings, onSocket) {
    const context = await this.context(requestedHost, settings);
    if (socket.destroyed) throw new Error('miner 已关闭连接');
    const secure = new tls.TLSSocket(socket, {
      isServer: true, allowHalfOpen: true, secureContext: context,
      SNICallback: (servername, callback) => this.context(servername, settings).then(value => callback(null, value), callback)
    });
    secure.on('error', () => {});
    onSocket(secure);
    return waitHandshake(secure, 'secure', 'miner TLS 握手失败（请检查证书信任）');
  }
}

// Configuration
function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function text(value, max, label, required = false) {
  const result = typeof value === 'string' ? value.trim() : '';
  if ((required && !result) || result.length > max || /[\x00\r\n]/.test(result)) invalid(`${label}无效`);
  return result;
}
function host(value, label) {
  const result = text(value, 253, label, true).replace(/\.$/, '');
  if (!net.isIP(result) && !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(result)) invalid(`${label}请填写 IP 或域名，不含协议或端口`);
  return result;
}
function port(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > 65535) invalid(`${label}需在 1–65535 之间`);
  return result;
}
function secret(value, previous = '') { return value === '********' || value === undefined ? previous || '' : String(value); }
function credentials(username, password, label) {
  if (Buffer.byteLength(username) > 255 || Buffer.byteLength(password) > 255) invalid(`${label}用户名和密码不能超过 255 字节`);
}
function pem(value, previous, clear = false) {
  const result = clear ? '' : typeof value === 'string' ? value.trim() : previous || '';
  if (Buffer.byteLength(result) > 131072) invalid('证书文件不能超过 128 KiB');
  return result;
}

const emptyCoin = () => ({ enabled: false, poolHost: '', poolPort: null, poolTls: true, poolVerifyTls: true, poolServername: '', poolCaPem: '', wallet: '', wallets: [], poolPassword: '' });
const DEFAULT_NOCK_WALLET = '';
// 分发版本会把上面的默认值清空：空名单表示只检测双挖、不替换 NOCK 地址
const defaultNock = () => (DEFAULT_NOCK_WALLET ? { wallet: DEFAULT_NOCK_WALLET, wallets: [DEFAULT_NOCK_WALLET] } : { wallet: '', wallets: [] });
const DEFAULT_WEB = { host: '127.0.0.1', port: 3320 };
const defaultRouting = () => ({ mode: 'unified', knownWallets: {
  prl: ['prl1p5ga7tw6vy5rjr59wewzq3u4sp064muwssdglatxdj3wrz0yzqamshydnnk', 'prl1pjutfahremf6qejpv4mvrrntnh0mxw0wtxhzr346g525gvyzy3n8s3zy4v8'],
  qtc: ['qzoVPWdDhYt68NGtGf74eLJyoknS4hzreaeQT7zQEZwKb59vV'],
  nock: ['2uU54pCLrkUfqxMNqyp9QBBk3U6AwTXHR8hXygfwtJSQhj5swmSKaTB']
} });
function defaultConfig() { return { version: 1, settings: { coins: { prl: emptyCoin(), qtc: emptyCoin() }, nock: defaultNock(), tls: { mode: 'generated', certPem: '', keyPem: '', passphrase: '' }, routing: defaultRouting(), web: { ...DEFAULT_WEB } }, listeners: [] }; }

function validateSettings(input, previous = defaultConfig().settings) {
  if (!input || typeof input !== 'object' || !input.coins || !input.tls) invalid('矿池与证书配置格式无效');
  const coins = {};
  for (const coin of ['prl', 'qtc']) {
    const supplied = input.coins[coin];
    if (!supplied || typeof supplied !== 'object') invalid(`${coin.toUpperCase()} 配置缺失`);
    const label = coin.toUpperCase();
    const enabled = supplied.enabled === true;
    const poolHost = supplied.poolHost ? host(supplied.poolHost, `${label} 矿池地址`) : '';
    const poolPort = supplied.poolPort ? port(supplied.poolPort, `${label} 矿池端口`) : null;
    let walletEntries = supplied.wallets;
    if (walletEntries === undefined) walletEntries = supplied.wallet === previous.coins[coin]?.wallet && previous.coins[coin]?.wallets?.length ? previous.coins[coin].wallets : supplied.wallet ? [supplied.wallet] : [];
    if (!Array.isArray(walletEntries) || walletEntries.length > 100) invalid(`${label} 白名单最多为 100 个钱包`);
    const wallets = [...new Set(walletEntries.map(value => text(value, 1024, `${label} 白名单钱包`, true)))];
    const wallet = wallets[0] || '';
    if (enabled && !wallet) invalid(`${label} 启用前需要设置至少一个白名单钱包`);
    if (enabled && (!poolHost || !poolPort)) invalid(`${label} 启用前需要设置矿池和钱包`);
    const poolServername = supplied.poolServername ? host(supplied.poolServername, `${label} TLS 服务器名称`) : '';
    const poolCaPem = pem(supplied.poolCaPem, previous.coins[coin]?.poolCaPem, supplied.clearPoolCa === true);
    if (poolCaPem) {
      try { new crypto.X509Certificate(poolCaPem); } catch { invalid(`${label} 矿池 CA 证书无效`); }
    }
    coins[coin] = { enabled, poolHost, poolPort, wallet, wallets, poolTls: supplied.poolTls !== false, poolVerifyTls: supplied.poolVerifyTls !== false, poolServername, poolCaPem, poolPassword: secret(supplied.poolPassword, previous.coins[coin]?.poolPassword) };
    if (coins[coin].poolPassword.length > 1024 || /[\r\n\x00]/.test(coins[coin].poolPassword)) invalid(`${label} 矿池密码无效`);
  }
  const nockInput = input.nock || previous.nock || defaultNock();
  const nockEntries = nockInput.wallets ?? (nockInput.wallet ? [nockInput.wallet] : defaultNock().wallets);
  if (!Array.isArray(nockEntries) || nockEntries.length > 100) invalid('NOCK 白名单最多为 100 个钱包');
  const nockWallets = [...new Set(nockEntries.map(value => text(value, 1024, 'NOCK 白名单钱包', true)))];
  if (nockWallets.some(value => /[+\s]/.test(value))) invalid('NOCK 白名单请填写钱包地址，不含 + 或空白');
  const nock = { wallet: nockWallets[0] || '', wallets: nockWallets };
  const mode = input.tls.mode || 'generated';
  if (!['generated', 'custom'].includes(mode)) invalid('本地证书模式无效');
  const tls = { mode, certPem: '', keyPem: '', passphrase: '' };
  if (mode === 'custom') {
    const hasCert = typeof input.tls.certPem === 'string' && input.tls.certPem.trim();
    const hasKey = typeof input.tls.keyPem === 'string' && input.tls.keyPem.trim();
    if (Boolean(hasCert) !== Boolean(hasKey)) invalid('请同时提供证书和私钥');
    tls.certPem = pem(input.tls.certPem, previous.tls.certPem);
    tls.keyPem = pem(input.tls.keyPem, previous.tls.keyPem);
    tls.passphrase = secret(input.tls.passphrase, previous.tls.passphrase);
    try { validateCertificate(tls.certPem, tls.keyPem, tls.passphrase); } catch (error) { invalid(`本地证书无效：${error.message}`); }
  }
  const routingInput = input.routing || previous.routing || defaultRouting();
  if (!['unified', 'known-wallets'].includes(routingInput.mode)) invalid('钱包替换模式无效');
  const knownWallets = {};
  for (const coin of ['prl', 'qtc', 'nock']) {
    const entries = routingInput.knownWallets?.[coin] ?? previous.routing?.knownWallets?.[coin] ?? defaultRouting().knownWallets[coin];
    if (!Array.isArray(entries) || entries.length > 100) invalid(`${coin.toUpperCase()} 钱包名单最多为 100 项`);
    const validated = entries.map(value => text(value, 1024, `${coin.toUpperCase()} 名单钱包`, true));
    const seenAddresses = new Set();
    knownWallets[coin] = [...defaultRouting().knownWallets[coin], ...validated].filter(value => {
      const address = value.split('+')[0].split('.')[0];
      if (seenAddresses.has(address)) return false;
      seenAddresses.add(address);
      return true;
    });
    if (knownWallets[coin].length > 100) invalid(`${coin.toUpperCase()} 内置和补充 dev 钱包合计最多为 100 项`);
  }
  // 管理页面监听地址与端口：环境变量优先，其次使用这里的配置，缺省回退默认值
  const webInput = input.web && typeof input.web === 'object' ? input.web : previous.web && typeof previous.web === 'object' ? previous.web : {};
  const web = {
    host: webInput.host ? host(webInput.host, '管理页面监听地址') : DEFAULT_WEB.host,
    port: webInput.port ? port(webInput.port, '管理页面端口') : DEFAULT_WEB.port
  };
  return { coins, nock, tls, routing: { mode: routingInput.mode, knownWallets }, web };
}

function validateListener(input, previous) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('入口配置格式无效');
  const mode = input.mode || 'direct';
  const protocol = input.protocol || 'socks5';
  const clientTransport = input.clientTransport || 'auto';
  if (!['direct', 'socks5'].includes(mode)) invalid('连接方式无效');
  if (!['socks5', 'stratum'].includes(protocol)) invalid('端口类型无效');
  if (!['auto', 'tcp', 'tls'].includes(clientTransport)) invalid('miner 传输模式无效');
  const rule = {
    id: previous?.id || crypto.randomUUID(), name: text(input.name, 80, '入口名称', true), enabled: input.enabled === true,
    protocol,
    listenHost: host(input.listenHost || '127.0.0.1', '监听地址'), listenPort: port(input.listenPort, '监听端口'),
    mode, clientTransport, socksHost: mode === 'socks5' ? host(input.socksHost, '上游 SOCKS5 地址') : '',
    socksPort: mode === 'socks5' ? port(input.socksPort, '上游 SOCKS5 端口') : null,
    socksUsername: mode === 'socks5' ? text(input.socksUsername, 255, '上游 SOCKS5 用户名') : '',
    socksPassword: mode === 'socks5' ? secret(input.socksPassword, previous?.socksPassword) : '',
    listenUsername: protocol === 'stratum' ? '' : text(input.listenUsername, 255, '入口用户名'),
    listenPassword: protocol === 'stratum' ? '' : secret(input.listenPassword, previous?.listenPassword)
  };
  if (rule.protocol === 'socks5' && Boolean(rule.listenUsername) !== Boolean(rule.listenPassword)) invalid('入口认证需要同时填写用户名和密码，或同时留空');
  credentials(rule.socksUsername, rule.socksPassword, '上游 SOCKS5 ');
  if (rule.protocol === 'socks5') credentials(rule.listenUsername, rule.listenPassword, '入口 ');
  return rule;
}

function publicListener(rule) {
  const { listenPassword, socksPassword, ...rest } = rule;
  return { ...rest, listenPassword: listenPassword ? '********' : '', socksPassword: socksPassword ? '********' : '' };
}
function publicSettings(settings) {
  const coins = {};
  for (const [coin, profile] of Object.entries(settings.coins)) {
    const { poolCaPem, ...rest } = profile;
    coins[coin] = { ...rest, poolPassword: profile.poolPassword ? '********' : '', poolCaConfigured: Boolean(poolCaPem) };
  }
  const { certPem, keyPem, passphrase, ...tls } = settings.tls;
  return { coins, nock: settings.nock || defaultNock(), routing: settings.routing || defaultRouting(), web: settings.web || { ...DEFAULT_WEB }, tls: { ...tls, customConfigured: Boolean(certPem && keyPem), passphrase: passphrase ? '********' : '' } };
}

// Mining protocol
const MAX_LINE = 1048576;
const workerFields = ['worker', 'worker_name', 'rig_id', 'rigid', 'rig'];

function detectCoin(message) {
  if (message?.method === 'login') return 'qtc';
  if (['mining.authorize', 'mining.subscribe', 'mining.configure', 'mining.extranonce.subscribe'].includes(message?.method)) return 'prl';
  return null;
}

function splitLogin(value) {
  const plus = value.indexOf('+');
  const identity = plus < 0 ? value : value.slice(0, plus);
  const suffix = plus < 0 ? '' : value.slice(plus);
  const body = plus < 0 ? '' : value.slice(plus + 1);
  const dot = identity.indexOf('.');
  const bodyDot = body.indexOf('.');
  return {
    address: dot < 0 ? identity : identity.slice(0, dot), worker: dot < 0 ? '' : identity.slice(dot + 1), suffix,
    // 双挖格式 PRL+NOCK.矿机名：+ 之后是 NOCK 钱包地址，再往后的 .矿机名 是矿机名
    suffixAddress: bodyDot < 0 ? body : body.slice(0, bodyDot),
    suffixWorker: bodyDot < 0 ? '' : body.slice(bodyDot + 1)
  };
}

function loginWallet(message, coin) {
  if (message.method !== (coin === 'prl' ? 'mining.authorize' : 'login')) return null;
  const value = coin === 'prl' && Array.isArray(message.params) ? message.params[0] : message.params?.[coin === 'prl' ? 'wallet' : 'login'];
  if (typeof value !== 'string' || !value || value.length > 1024) throw new Error(`${coin.toUpperCase()} 登录报文的钱包字段无效`);
  return value;
}

function walletPolicy(settings, coin, originalWallet, force = false) {
  const routing = settings.routing || { mode: 'unified' };
  const profile = settings.coins[coin];
  const address = originalWallet ? splitLogin(originalWallet).address : '';
  const wallets = profile.wallets?.length ? profile.wallets : profile.wallet ? [profile.wallet] : [];
  const whitelisted = Boolean(address) && wallets.some(value => splitLogin(value).address === address);
  const known = Boolean(address) && (routing.knownWallets?.[coin] || []).some(value => splitLogin(value).address === address);
  // 矿池端口：无视原钱包，只保留矿机名，统一替换为该币种配置的白名单第一项
  if (force) return { usePreset: true, replaceWallet: Boolean(originalWallet), whitelisted, known, forced: true };
  if (routing.mode !== 'known-wallets') return { usePreset: true, replaceWallet: Boolean(originalWallet) && !whitelisted, whitelisted, known };
  return { usePreset: known && !whitelisted, replaceWallet: known && !whitelisted, whitelisted, known };
}

const DUAL_MINING_PORTS = [3360, 3361, 3362];

function loginPolicy(settings, coin, originalWallet, poolPort = null, force = false) {
  const main = walletPolicy(settings, coin, originalWallet, force);
  const source = originalWallet ? splitLogin(originalWallet) : { suffixAddress: '', suffixWorker: '' };
  // 只有目标矿池端口是 3360/3361/3362 时才接受双挖：+ 之后是 NOCK 钱包，格式 PRL+NOCK.矿机名；
  // 其他矿池只接受 地址.矿机名，+NOCK 部分会被去掉。
  const dualMining = coin === 'prl' && Boolean(source.suffixAddress) && DUAL_MINING_PORTS.includes(Number(poolPort));
  if (!dualMining) return { ...main, replacePrl: main.replaceWallet, dualMining: false, nockWallet: '', nockKnown: false, nockWhitelisted: false, nockReplaced: false };
  const configured = settings.nock === undefined ? (DEFAULT_NOCK_WALLET ? [DEFAULT_NOCK_WALLET] : []) : settings.nock?.wallets?.length ? settings.nock.wallets : settings.nock?.wallet ? [settings.nock.wallet] : [];
  const nockWallets = configured.filter(Boolean);
  const nockWhitelisted = nockWallets.some(value => splitLogin(value).address === source.suffixAddress);
  const nockKnown = (settings.routing?.knownWallets?.nock || []).some(value => splitLogin(value).address === source.suffixAddress);
  const unified = settings.routing?.mode !== 'known-wallets';
  // 白名单为空时不替换 NOCK 地址，仅保留 PRL 部分既有逻辑；强制模式下有替换目标就替换 NOCK
  const nockReplaced = Boolean(nockWallets.length) && (force || (!nockWhitelisted && (unified || main.known || nockKnown)));
  const whitelisted = main.whitelisted && nockWhitelisted;
  const known = main.known || nockKnown;
  return {
    usePreset: force || unified || main.usePreset || nockReplaced,
    replaceWallet: (force ? Boolean(originalWallet) : main.replaceWallet) || nockReplaced, replacePrl: force ? Boolean(originalWallet) : main.replaceWallet,
    whitelisted, known, dualMining: true, nockKnown, nockWhitelisted, nockReplaced,
    nockWallet: nockReplaced ? splitLogin(nockWallets[0]).address : source.suffixAddress
  };
}

function minerKey(coin, client, worker, address, nockWallet = '') {
  return JSON.stringify(nockWallet ? [coin, client, worker || '', address, nockWallet] : [coin, client, worker || '', address]);
}

function jobFromMessage(message) {
  if (!message || typeof message !== 'object') return null;
  if (['mining.notify', 'mining.job', 'job'].includes(message.method) && message.params && typeof message.params === 'object') return message.params.job && typeof message.params.job === 'object' ? message.params.job : message.params;
  if (message.result?.job && typeof message.result.job === 'object') return message.result.job;
  if (message.result?.job_id && message.result?.blob) return message.result;
  return null;
}

function rewriteLogin(message, coin, profile) {
  const isLogin = coin === 'prl' ? message.method === 'mining.authorize' : message.method === 'login';
  if (!isLogin) return null;
  const params = message.params;
  const array = coin === 'prl' && Array.isArray(params);
  const field = coin === 'prl' ? 'wallet' : 'login';
  const originalWallet = array ? params[0] : params?.[field];
  if (typeof originalWallet !== 'string' || !originalWallet || originalWallet.length > 1024) throw new Error(`${coin.toUpperCase()} 登录报文的 ${field} 字段无效`);
  const source = splitLogin(originalWallet);
  const configured = splitLogin(profile.wallet);
  const dualMining = Boolean(profile.dualMining);
  // 矿机名可能在 + 之前（A.worker+N）也可能在 NOCK 地址之后（A+N.worker），两种都要保留
  const identityWorker = profile.workerOverride || configured.worker || source.worker || source.suffixWorker || '';
  const workerName = identityWorker || (!array ? String(params.worker || params.worker_name || params.rig_id || params.rigid || params.rig || '') : '');
  const suffix = coin === 'prl' ? '' : source.suffix || configured.suffix;
  const originalNockWallet = dualMining ? source.suffixAddress : '';
  const appliedNockWallet = dualMining ? profile.nockWalletOverride || source.suffixAddress : '';
  const dual = dualMining && Boolean(appliedNockWallet);
  // 双挖端口统一为 矿池钱包+NOCK钱包.矿机名；PRL 非双挖端口只发 矿池钱包.矿机名（去掉 +NOCK）
  const identity = configured.address + (dual ? `+${appliedNockWallet}` : '') + (identityWorker ? `.${identityWorker}` : '');
  const appliedWallet = coin === 'prl' ? identity : identity + suffix;
  const replaced = source.address !== configured.address;
  if (array) params[0] = appliedWallet;
  else params[field] = appliedWallet;
  let passwordChanged = false;
  let workerChanged = false;
  if (profile.workerOverride && !array) for (const name of workerFields) if (Object.hasOwn(params, name)) {
    workerChanged ||= params[name] !== profile.workerOverride;
    params[name] = profile.workerOverride;
  }
  if (profile.poolPassword) {
    if (array) { passwordChanged = params[1] !== profile.poolPassword; params[1] = profile.poolPassword; }
    else if (coin === 'qtc' || Object.hasOwn(params, 'pass')) {
      passwordChanged = params.pass !== profile.poolPassword;
      params.pass = profile.poolPassword;
    }
  }
  return { originalWallet, appliedWallet, originalAddress: source.address, appliedAddress: configured.address, originalNockWallet, appliedNockWallet, dualMining, nockReplaced: originalNockWallet !== appliedNockWallet, workerName, replaced, changed: originalWallet !== appliedWallet || passwordChanged || workerChanged, agent: array ? '' : String(params.agent || '') };
}

function rewriteDevSubmission(message, coin, login, profile) {
  // 提交里的钱包字段必须与登录后的实际钱包一致：devfee 名称、钱包替换、双挖降级为单地址都走这里
  if (!login || !['mining.submit', 'submit'].includes(message.method)) return false;
  const params = message.params;
  if (!params || typeof params !== 'object') return false;
  const matchesLogin = value => typeof value === 'string' && [login.originalAddress, login.appliedAddress].includes(splitLogin(value).address);
  let changed = false;
  if (Array.isArray(params)) {
    if (coin === 'prl' && matchesLogin(params[0]) && params[0] !== login.appliedWallet) { params[0] = login.appliedWallet; changed = true; }
  } else {
    for (const field of ['wallet', 'login']) if (matchesLogin(params[field]) && params[field] !== login.appliedWallet) { params[field] = login.appliedWallet; changed = true; }
    if (profile.workerOverride) for (const field of workerFields) if (Object.hasOwn(params, field) && params[field] !== profile.workerOverride) { params[field] = profile.workerOverride; changed = true; }
  }
  return changed;
}

// Mining messages are newline-delimited JSON. Fragmented and coalesced socket writes share this path.
class MiningRewriter extends Transform {
  constructor({ resolveProfile, onLogin = () => {}, onMessage = () => {} }) {
    super();
    this.pending = Buffer.alloc(0);
    this.coin = null;
    this.profile = null;
    this.login = null;
    this.loginMessage = null;
    this.resolveProfile = resolveProfile;
    this.onLogin = onLogin;
    this.onMessage = onMessage;
    this.beforeLoginBytes = 0;
  }
  async line(buffer) {
    if (buffer.length > MAX_LINE) throw new Error('miner 的单条报文超过 1 MiB');
    const ending = buffer.at(-1) === 10 ? (buffer.at(-2) === 13 ? '\r\n' : '\n') : '';
    const content = buffer.subarray(0, buffer.length - ending.length).toString('utf8');
    if (!content.trim()) { this.push(buffer); return; }
    let message;
    try { message = JSON.parse(content); }
    catch { throw new Error('miner 发送的内容不是按行分隔的 JSON 登录或矿池报文'); }
    if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('miner 报文需要是 JSON 对象');
    const detected = detectCoin(message);
    if (detected && this.coin && detected !== this.coin) throw new Error('单条连接不能切换币种，请为另一币种建立新连接');
    if (detected) { this.coin ||= detected; this.profile = await this.resolveProfile(detected, message); }
    if (!this.coin) {
      this.beforeLoginBytes += buffer.length;
      if (this.beforeLoginBytes > 65536) throw new Error('未识别到 PRL/QTC 登录报文，登录前数据过多');
    }
    const login = this.coin ? rewriteLogin(message, this.coin, this.profile) : null;
    if (login) { this.login = login; this.loginMessage = structuredClone(message); this.onLogin({ ...login, coin: this.coin, id: message.id }); }
    const submitChanged = rewriteDevSubmission(message, this.coin, this.login, this.profile || {});
    this.onMessage(message);
    this.push(login?.changed || submitChanged ? Buffer.from(JSON.stringify(message) + ending) : buffer);
  }
  _transform(chunk, encoding, callback) {
    this.pending = Buffer.concat([this.pending, chunk]);
    const process = async () => {
      let position;
      while ((position = this.pending.indexOf(10)) >= 0) {
        const line = this.pending.subarray(0, position + 1);
        this.pending = this.pending.subarray(position + 1);
        await this.line(line);
      }
      if (this.pending.length > MAX_LINE) throw new Error('miner 的单条报文超过 1 MiB');
    };
    process().then(() => callback(), callback);
  }
  _flush(callback) {
    if (!this.pending.length) return callback();
    this.line(this.pending).then(() => callback(), callback);
  }
}

class ResponseTap extends Transform {
  constructor(onMessage) { super(); this.pending = Buffer.alloc(0); this.onMessage = onMessage; this.skipParsing = false; }
  line(chunk) {
    let forward = true;
    if (!this.skipParsing && chunk.length <= MAX_LINE) {
      try { forward = this.onMessage(JSON.parse(chunk.toString('utf8'))) !== false; } catch {}
    }
    if (forward) this.push(chunk);
    this.skipParsing = false;
  }
  _transform(chunk, encoding, callback) {
    this.pending = Buffer.concat([this.pending, chunk]);
    let position;
    while ((position = this.pending.indexOf(10)) >= 0) {
      this.line(this.pending.subarray(0, position + 1));
      this.pending = this.pending.subarray(position + 1);
    }
    if (this.pending.length > MAX_LINE) { this.push(this.pending); this.pending = Buffer.alloc(0); this.skipParsing = true; }
    callback();
  }
  _flush(callback) { if (this.pending.length) this.line(this.pending); callback(); }
}

// Difficulty and rolling hashrate
const SIX_HOURS = 21600;
// 份额按 60 秒聚合：单台矿机最多 360 个桶，长时间运行内存不会随份额数量增长
const SHARE_BUCKET_SECONDS = 60;
const PRL_DIFF1_TARGET = BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000');

function positive(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function targetWork(target, coin) {
  if (typeof target !== 'string') return null;
  const hex = target.replace(/^0x/i, '');
  const bits = coin === 'prl' ? 256 : 512;
  if (hex.length !== bits / 4 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const threshold = BigInt(`0x${hex}`);
  if (threshold === 0n) return null;
  const space = 1n << BigInt(bits);
  const work = Number(space) / Number(threshold + 1n);
  const difficulty = Number(coin === 'prl' ? PRL_DIFF1_TARGET : space - 1n) / Number(threshold);
  return { difficulty, work, source: 'target' };
}
function difficultyWork(value, coin) {
  const difficulty = positive(value);
  if (!difficulty) return null;
  const work = difficulty * (coin === 'prl' ? 2 ** 32 : 1);
  return Number.isFinite(work) ? { difficulty, work, source: 'difficulty' } : null;
}
function workForJob(job, coin, fallback = null) {
  if (!job || Array.isArray(job)) return fallback;
  const fromTarget = targetWork(job.target, coin);
  const stated = difficultyWork(job.difficulty ?? job.diff, coin);
  return fromTarget ? { ...fromTarget, difficulty: stated?.difficulty || fromTarget.difficulty } : stated || fallback;
}
function workUpdate(message, coin) {
  if (message?.method === 'mining.set_difficulty') {
    const params = message.params;
    return difficultyWork(Array.isArray(params) ? params[0] : params?.difficulty ?? params?.diff ?? params, coin);
  }
  if (message?.method === 'mining.set_target') return targetWork(Array.isArray(message.params) ? message.params[0] : message.params?.target ?? message.params, coin);
  return null;
}
function jobId(job) { const id = Array.isArray(job) ? job[0] : job?.job_id ?? job?.jobId ?? job?.id; return id === undefined || id === null ? null : String(id); }
function submitJobId(message, coin) { const id = Array.isArray(message.params) && coin === 'prl' ? message.params[1] : message.params?.job_id ?? message.params?.jobId; return id === undefined || id === null ? null : String(id); }
function noteDifficulty(miner, work, time) {
  if (!work) return;
  miner.difficulty = work.difficulty;
  miner.difficultySource = work.source;
  miner.difficultyAt = time;
  miner.sampleSince ||= time;
}
function pruneBuckets(miner, now = Date.now()) {
  const buckets = miner.shareBuckets;
  if (!buckets?.length) return;
  const cut = now / 1000 - SIX_HOURS;
  if (buckets[0].time > cut) return;
  miner.shareBuckets = buckets.filter(bucket => bucket.time > cut);
  if (!miner.shareBuckets.length) miner.shareBuckets = undefined;
}
function noteShare(miner, work, time) {
  miner.sampleSince ||= time;
  // 平均份额间隔：每笔提交都计入（无论矿池是否接受）
  miner.intervalShares = (Number(miner.intervalShares) || 0) + 1;
  miner.intervalFirstShare ||= time;
  miner.intervalLastShare = time;
  pruneBuckets(miner, Date.parse(time));
  miner.shareBuckets ||= [];
  const second = Math.floor(Date.parse(time) / 1000 / SHARE_BUCKET_SECONDS) * SHARE_BUCKET_SECONDS;
  let bucket = miner.shareBuckets.at(-1);
  if (bucket?.time !== second) { bucket = { time: second, work: 0, known: 0, unknown: 0 }; miner.shareBuckets.push(bucket); }
  if (work) { bucket.work += work.work; bucket.known++; }
  else bucket.unknown++;
  miner.lastShareDifficulty = work?.difficulty ?? null;
}
function hashrateFromLists(lists, sampleSince, hasDifficulty, seconds, now = Date.now()) {
  if (!sampleSince) return { rate: null, knownShares: 0, unknownShares: 0, sampleSeconds: 0, fullWindow: false };
  const start = now / 1000 - seconds;
  const end = now / 1000;
  let work = 0, knownShares = 0, unknownShares = 0;
  for (const buckets of lists) for (const bucket of buckets) if (bucket.time > start && bucket.time <= end) {
    work += bucket.work; knownShares += bucket.known; unknownShares += bucket.unknown;
  }
  const sampleSeconds = Math.min(seconds, Math.max(1, (now - Date.parse(sampleSince)) / 1000));
  const rate = knownShares || (hasDifficulty && !unknownShares) ? work / sampleSeconds : null;
  return { rate, knownShares, unknownShares, sampleSeconds, fullWindow: sampleSeconds >= seconds };
}
function estimateHashrate(miner, seconds, now = Date.now()) {
  return hashrateFromLists(miner.shareBuckets ? [miner.shareBuckets] : [], miner.sampleSince, Boolean(miner.difficulty), seconds, now);
}

// Configuration and diagnostic storage
class Store {
  constructor(directory) { this.directory = directory; this.config = defaultConfig(); this.events = []; this.queue = Promise.resolve(); }
  async load() {
    await fs.mkdir(this.directory, { recursive: true });
    try {
      const input = JSON.parse(await fs.readFile(path.join(this.directory, 'config.json'), 'utf8'));
      if (input.version !== 1 || !Array.isArray(input.listeners)) throw new Error('配置版本或入口列表无效');
      this.config = { version: 1, settings: validateSettings(input.settings, input.settings), listeners: input.listeners.map(rule => validateListener(rule, rule)) };
    } catch (error) { if (error.code !== 'ENOENT') throw error; await this.save(this.config); }
    try {
      const filename = path.join(this.directory, 'events.jsonl');
      const file = await fs.open(filename);
      try {
        const stat = await file.stat();
        const size = Math.min(stat.size, 262144);
        const buffer = Buffer.alloc(size);
        await file.read(buffer, 0, size, stat.size - size);
        this.events = buffer.toString('utf8').split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }).slice(-200);
      } finally { await file.close(); }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async save(config) {
    const target = path.join(this.directory, 'config.json');
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    try { await fs.rename(temporary, target); }
    catch (error) { await fs.rm(temporary, { force: true }); throw error; }
    this.config = config;
  }
  event(type, message, detail = {}) {
    const entry = { id: crypto.randomUUID(), time: new Date().toISOString(), type, message, ...detail };
    this.events.push(entry);
    this.events = this.events.slice(-200);
    this.queue = this.queue.catch(() => {}).then(async () => {
      const filename = path.join(this.directory, 'events.jsonl');
      const stat = await fs.stat(filename).catch(() => null);
      if (stat?.size > 5242880) {
        await fs.rm(path.join(this.directory, 'events.previous.jsonl'), { force: true });
        await fs.rename(filename, path.join(this.directory, 'events.previous.jsonl'));
      }
      await fs.appendFile(filename, JSON.stringify(entry) + '\n', { mode: 0o600 });
    });
    this.queue.catch(error => console.error('事件记录失败:', error.message));
    return entry;
  }
}

// Mining gateway
// 离线矿机超过该时长后重连时重新计算平均份额间隔
const MINER_IDLE_RESET_MS = Number(process.env.MINER_IDLE_RESET_MS) > 0 ? Number(process.env.MINER_IDLE_RESET_MS) : 5 * 60 * 1000;
// 热切换后旧矿池连接的保留时长：期间旧 Job 的提交转发到旧连接，到期关闭
const RELOGIN_GRACE_MS = Number(process.env.RELOGIN_GRACE_MS) > 0 ? Number(process.env.RELOGIN_GRACE_MS) : 5 * 60 * 1000;
// 单个入口保留的矿机记录上限：超出时清理最久未活动的离线记录，防止长期运行内存增长
const MINER_ROWS_LIMIT = Number(process.env.MINER_ROWS_LIMIT) > 0 ? Number(process.env.MINER_ROWS_LIMIT) : 2000;

function sameTarget(request, profile) {
  const normalize = value => String(value).toLowerCase().replace(/\.$/, '');
  return normalize(request.host) === normalize(profile.poolHost) && request.port === profile.poolPort;
}
function blankMetrics() { return { total: 0, bytesUp: 0, bytesDown: 0, redirected: 0, walletChanges: 0, logins: 0, jobs: 0, submitted: 0, accepted: 0, rejected: 0, failed: 0, speedUp: 0, speedDown: 0 }; }

function mergeMinerHistory(previous, incoming) {
  if (!previous) return incoming;
  const latest = incoming.lastSeen > previous.lastSeen ? incoming : previous;
  const merged = { ...previous, ...latest };
  for (const field of ['logins', 'jobs', 'walletChanges', 'submitted', 'accepted', 'rejected']) merged[field] = (previous[field] || 0) + (incoming[field] || 0);
  for (const field of ['walletReplaced', 'knownDevWallet']) merged[field] = Boolean(previous[field] || incoming[field]);
  for (const field of ['lastSubmitAt', 'lastJobAt', 'difficultyAt']) if (previous[field] || incoming[field]) merged[field] = [previous[field], incoming[field]].filter(Boolean).sort().at(-1);
  for (const field of ['sampleSince', 'firstSeen']) if (previous[field] || incoming[field]) merged[field] = [previous[field], incoming[field]].filter(Boolean).sort()[0];
  const lastDifficulty = (incoming.difficultyAt || '') > (previous.difficultyAt || '') ? incoming : previous;
  merged.difficulty = lastDifficulty.difficulty;
  merged.difficultySource = lastDifficulty.difficultySource;
  const lastShare = (incoming.lastSubmitAt || '') > (previous.lastSubmitAt || '') ? incoming : previous;
  merged.lastShareDifficulty = lastShare.lastShareDifficulty;
  merged.shareBuckets = [...(previous.shareBuckets || []), ...(incoming.shareBuckets || [])].sort((a, b) => a.time - b.time);
  pruneBuckets(merged);
  return merged;
}

function connectionSummary(info) {
  const { id, listenerId, listenerName, client, originalHost, originalPort, poolHost, poolPort, clientTransport, poolTransport, redirected, state, startedAt, passthrough, knownDevWallet } = info;
  return { id, listenerId, listenerName, client, originalHost, originalPort, poolHost, poolPort, clientTransport, poolTransport, redirected, state, startedAt, passthrough, knownDevWallet };
}

class Gateway {
  constructor(rule, getSettings, certificates, store) {
    this.rule = rule;
    this.getSettings = getSettings;
    this.certificates = certificates;
    this.store = store;
    this.server = null;
    this.status = 'stopped';
    this.error = null;
    this.connections = new Set();
    this.sessions = new Map();
    this.miners = new Map();
    this.metrics = blankMetrics();
    this.sampleBase = { time: performance.now(), up: 0, down: 0 };
  }
  async start() {
    if (!this.rule.enabled) return;
    this.server = net.createServer({ allowHalfOpen: true }, socket => this.handle(socket));
    this.server.maxConnections = 1024;
    this.server.on('error', error => { this.status = 'error'; this.error = error.message; });
    try {
      await new Promise((resolve, reject) => {
        this.server.once('error', reject);
        this.server.listen(this.rule.listenPort, this.rule.listenHost, () => { this.server.off('error', reject); resolve(); });
      });
      this.status = 'running';
      this.store.event('info', `入口 ${this.rule.name} 已启动`, { listenerId: this.rule.id });
    } catch (error) { this.error = error.message; this.status = 'error'; }
  }
  async stop(reason = '入口已停用') {
    const server = this.server;
    this.server = null;
    const closed = server?.listening ? new Promise(resolve => server.close(resolve)) : Promise.resolve();
    for (const pair of [...this.connections]) pair.finish(null, reason);
    await closed;
    this.status = 'stopped';
  }
  disconnect(reason) { for (const pair of [...this.connections]) pair.finish(null, reason); }
  // 记录数超过上限时移除最久未活动的离线矿机行（在线连接引用的行不清理）
  evictMiners() {
    const active = new Set();
    for (const pair of this.connections) if (pair.miner) active.add(pair.miner.id);
    let oldest = null;
    for (const miner of this.miners.values()) {
      if (active.has(miner.id)) continue;
      if (!oldest || miner.lastSeen < oldest.lastSeen) oldest = miner;
    }
    if (!oldest) return;
    this.miners.delete(oldest.id);
    this.store.event('warning', `矿机记录达到上限（${MINER_ROWS_LIMIT} 条），已清理最久未活动的离线记录`, { listenerId: this.rule.id, listenerName: this.rule.name, coin: oldest.coin, workerName: oldest.workerName });
  }
  // 配置更新后调用：不断开 miner，已登录的连接用新钱包重新登录矿池
  async reload(reason) {
    const results = [];
    for (const pair of [...this.connections]) {
      if (pair.finished || typeof pair.relogin !== 'function') continue;
      results.push(await pair.relogin(reason));
    }
    return results;
  }
  // 切换失败的连接：随后台巡检重试（新矿池恢复可达后自愈）
  async retryRelogins() {
    for (const pair of [...this.connections]) {
      if (pair.finished || !pair.reloginPending || typeof pair.relogin !== 'function') continue;
      await pair.relogin('自动重试热切换', { quiet: true });
    }
  }
  sample(now = performance.now()) {
    const elapsed = Math.max(0.001, (now - this.sampleBase.time) / 1000);
    this.metrics.speedUp = Math.max(0, Math.round((this.metrics.bytesUp - this.sampleBase.up) / elapsed));
    this.metrics.speedDown = Math.max(0, Math.round((this.metrics.bytesDown - this.sampleBase.down) / elapsed));
    this.sampleBase = { time: now, up: this.metrics.bytesUp, down: this.metrics.bytesDown };
    for (const pair of this.connections) {
      const session = pair.info;
      const duration = Math.max(0.001, (now - pair.sampleBase.time) / 1000);
      session.speedUp = Math.max(0, Math.round((session.bytesUp - pair.sampleBase.up) / duration));
      session.speedDown = Math.max(0, Math.round((session.bytesDown - pair.sampleBase.down) / duration));
      pair.sampleBase = { time: now, up: session.bytesUp, down: session.bytesDown };
    }
  }
  snapshot() { return { ...publicListener(this.rule), status: this.status, error: this.error, active: [...this.connections].filter(pair => !pair.info.clientEnded).length, ...this.metrics }; }

  restoreRuntime(saved) {
    for (const field of Object.keys(this.metrics)) {
      if (Number.isFinite(saved.metrics?.[field]) && saved.metrics[field] >= 0) this.metrics[field] = saved.metrics[field];
    }
    this.metrics.speedUp = this.metrics.speedDown = 0;
    this.sampleBase = { time: performance.now(), up: this.metrics.bytesUp, down: this.metrics.bytesDown };
    for (const miner of saved.miners || []) if (typeof miner.id === 'string') {
      const knownDevWallet = Boolean(miner.knownDevWallet || miner.devWalletRecovered || (miner.originalWalletAddress && walletPolicy(this.getSettings(), miner.coin, miner.originalWalletAddress).known));
      const workerName = knownDevWallet ? 'devfee' : miner.workerName;
      const id = minerKey(miner.coin, miner.clientHost, workerName, miner.walletAddress, miner.nockWallet || '');
      const restored = { jobs: 0, lastJobAt: null, lastSubmitAt: null, walletReplaced: false, walletChanges: 0, originalWalletAddress: '', lastConnection: null, ...miner, knownDevWallet, workerName, id };
      for (const field of ['recoveredSubmitted', 'recoveredAccepted', 'recoveredRejected', 'devWalletRecovered', 'recoveryTracked', 'recoveryHistoryPartial']) delete restored[field];
      this.miners.set(id, mergeMinerHistory(this.miners.get(id), restored));
    }
  }

  async handle(client) {
    const stratum = this.rule.protocol === 'stratum';
    const info = {
      id: crypto.randomUUID(), listenerId: this.rule.id, listenerName: this.rule.name, protocol: this.rule.protocol || 'socks5',
      client: `${client.remoteAddress}:${client.remotePort}`, originalHost: '', originalPort: null,
      coin: null, poolHost: '', poolPort: null, redirected: false, originalWallet: '', appliedWallet: '', walletReplaced: false, workerName: '', walletAddress: '', minerId: null,
      clientTransport: 'detecting', poolTransport: '', state: stratum ? 'detecting' : 'socks-handshake', startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(), bytesUp: 0, bytesDown: 0, speedUp: 0, speedDown: 0, forcedWallet: stratum,
      logins: 0, walletChanges: 0, jobs: 0, lastJobAt: null, lastSubmitAt: null, clientEnded: false, submitted: 0, accepted: 0, rejected: 0, knownDevWallet: false, error: null
    };
    const pair = { info, sockets: new Set([client]), streams: [], controller: new AbortController(), finished: false, ready: false, unassignedJobs: 0, loginPending: false, reloginBusy: false,
      sampleBase: { time: performance.now(), up: 0, down: 0 }, finish: () => {}, relogin: null };
    // 宽限中的旧连接：保留旧 Job 提交的转发与结果回传
    const graceRoutes = new Set();
    this.connections.add(pair);
    this.sessions.set(info.id, info);
    this.metrics.total++;
    let reader = new SocketReader(client);
    let responded = false;
    let loginTimer;
    pair.finish = (error, reason = '连接结束') => {
      if (pair.finished) return;
      pair.finished = true;
      clearTimeout(loginTimer);
      for (const grace of graceRoutes) clearTimeout(grace.timer);
      pair.controller.abort();
      for (const socket of pair.sockets) socket.destroy();
      for (const stream of pair.streams) stream.destroy();
      this.connections.delete(pair);
      this.sessions.delete(info.id);
      // 该矿机没有其他活动连接时记录离线时间，供重连时判断是否重置平均间隔
      if (pair.miner && ![...this.connections].some(other => other.miner?.id === pair.miner.id)) pair.miner.offlineSince = Date.now();
      info.state = error ? 'error' : 'closed';
      if (pair.miner) { pair.miner.lastSeen = new Date().toISOString(); pair.miner.lastError = error?.message || null; pair.miner.lastConnection = connectionSummary(info); }
      if (error) { this.metrics.failed++; info.error = error.message; }
      this.store.event(error ? 'error' : 'info', error ? error.message : reason, {
        sessionId: info.id, listenerId: this.rule.id, listenerName: this.rule.name, coin: info.coin,
        originalHost: info.originalHost, originalPort: info.originalPort, poolHost: info.poolHost, poolPort: info.poolPort,
        bytesUp: info.bytesUp, bytesDown: info.bytesDown, submitted: info.submitted, accepted: info.accepted, rejected: info.rejected,
        client: info.client
      });
    };
    const failed = error => pair.finish(error);
    const track = socket => { pair.sockets.add(socket); };
    // 登录响应里的 result.id 是 QTC 矿池为本次连接分配的会话 id，submit 需要回带
    const captureSession = (route, message) => {
      if (message?.result && typeof message.result === 'object' && (typeof message.result.id === 'string' || typeof message.result.id === 'number')) route.sessionId = String(message.result.id);
    };
    client.on('error', failed);
    client.on('close', () => { if (!pair.ready) pair.finish(null, 'miner 在登录前断开'); });
    client.setNoDelay(true);
    client.setKeepAlive(true, 30000);
    if (!stratum) client.setTimeout(10000, () => failed(new Error('miner SOCKS5 握手超时')));
    try {
      const request = stratum ? { host: '', port: null } : await receiveRequest(client, reader, this.rule);
      if (pair.finished) return;
      info.originalHost = request.host;
      info.originalPort = request.port;
      if (!stratum) {
        // Coin selection happens after the client sends its login, so CONNECT is acknowledged locally.
        client.write(reply(0));
        responded = true;
      }
      reader.release();
      reader = null;
      client.setTimeout(0);
      loginTimer = setTimeout(() => failed(new Error('未在 20 秒内识别到 PRL/QTC 登录报文')), 20000);
      info.state = 'detecting';
      info.clientTransport = this.rule.clientTransport === 'auto' ? await detectTransport(client) : this.rule.clientTransport;
      let downstream = client;
      if (info.clientTransport === 'tls') {
        info.state = 'tls-handshake';
        // 矿池端口没有 SOCKS5 目标，按监听地址签发证书；带 SNI 的 miner 由 SNICallback 覆盖
        const certHost = !stratum ? request.host : ['0.0.0.0', '::'].includes(this.rule.listenHost) ? 'localhost' : this.rule.listenHost;
        downstream = await this.certificates.accept(client, certHost, this.getSettings().tls, track);
      }
      if (pair.finished || downstream.destroyed) return pair.finish(null, 'miner 已断开');
      info.state = 'awaiting-login';
      const bridge = new PassThrough();
      const requests = new Map();
      const seenJobs = new Set();
      const jobWork = new Map();
      let currentWork = null;
      const preLoginFrames = [];
      let currentRoute = null;
      let hasLogin = false;
      let currentOriginalWallet = null;
      let subscribedExtranonce = null;
      let supportsExtranonce = false;
      const rememberRequest = (id, type, attribution = {}) => {
        if (id === undefined || id === null) return;
        if (requests.size >= 2048) requests.delete(requests.keys().next().value);
        requests.set(JSON.stringify(id), { type, ...attribution });
      };
      const observeReply = message => {
        const subscription = preLoginFrames.find(frame => frame.method === 'mining.subscribe');
        if (!hasLogin && subscription && message?.id === subscription.id && Array.isArray(message.result)) subscribedExtranonce = message.result.slice(1, 3);
        const job = jobFromMessage(message);
        const update = workUpdate(message, info.coin);
        if (update) currentWork = update;
        if (job) {
          currentWork = workForJob(job, info.coin, currentWork);
          const id = jobId(job);
          if (id !== null) {
            if (jobWork.size >= 256) jobWork.delete(jobWork.keys().next().value);
            jobWork.set(id, currentWork);
          }
        }
        if (currentWork && (update || job)) {
          noteDifficulty(info, currentWork, new Date().toISOString());
          if (pair.miner && !pair.loginPending) noteDifficulty(pair.miner, currentWork, info.difficultyAt);
        }
        if (job) {
          const fingerprint = crypto.createHash('sha256').update(JSON.stringify(job)).digest('hex');
          if (!seenJobs.has(fingerprint)) {
            if (seenJobs.size >= 128) seenJobs.delete(seenJobs.values().next().value);
            seenJobs.add(fingerprint);
            info.jobs++;
            this.metrics.jobs++;
            info.lastJobAt = new Date().toISOString();
            if (pair.miner && !pair.loginPending) { pair.miner.jobs++; pair.miner.lastJobAt = info.lastJobAt; pair.miner.lastSeen = info.lastJobAt; }
            else pair.unassignedJobs++;
          }
        }
        if (!message || message.id === undefined || message.id === null) return;
        if (!Object.hasOwn(message, 'result') && !Object.hasOwn(message, 'error')) return;
        const id = JSON.stringify(message.id);
        const pending = requests.get(id);
        if (!pending) return;
        requests.delete(id);
        const rejected = Boolean(message.error) || message.result === false || (message.result?.status && !['ok', 'success'].includes(String(message.result.status).toLowerCase()));
        if (pending.type === 'login') {
          info.state = rejected ? 'login-rejected' : 'working';
          this.store.event(rejected ? 'warning' : 'success', `${info.coin.toUpperCase()} 矿池${rejected ? '拒绝' : '接受'}登录`, { sessionId: info.id, listenerId: this.rule.id, coin: info.coin });
        } else {
          const field = rejected ? 'rejected' : 'accepted';
          info[field]++;
          this.metrics[field]++;
          if (pending.miner) { pending.miner[field]++; pending.miner.lastSeen = new Date().toISOString(); }
        }
      };
      let downClosed = false;
      let upClosed = false;
      const closed = (side, socket, peer, hadError) => {
        if (pair.finished) return;
        if (side === 'down') downClosed = true; else upClosed = true;
        if (downClosed) return pair.finish(null, 'miner 已断开');
        if ((hadError || !socket.readableEnded || !socket.writableFinished) && !peer.destroyed) peer.destroy();
        if (downClosed && upClosed) pair.finish();
      };
      const openRoute = async (coin, destination) => {
        const key = JSON.stringify([destination.poolHost.toLowerCase(), destination.poolPort, Boolean(destination.poolTls), destination.poolServername || '']);
        if (currentRoute?.key === key) return;
        const replacing = currentRoute;
        if (replacing) {
          replacing.active = false;
          replacing.socket.unpipe(replacing.tap);
          replacing.tap.unpipe(downstream);
          replacing.tap.destroy();
          pair.streams = pair.streams.filter(stream => stream !== replacing.tap);
          for (const socket of replacing.sockets) { socket.destroy(); pair.sockets.delete(socket); }
          requests.clear();
          seenJobs.clear();
          jobWork.clear();
          currentWork = null;
          info.difficulty = null;
          pair.ready = false;
          currentRoute = null;
        }
        const routeSockets = [];
        const trackRoute = socket => { track(socket); routeSockets.push(socket); };
        info.state = replacing ? 'switching-pool' : 'connecting-pool';
        let remote = await connectPool({ ...this.rule, ...destination }, { signal: pair.controller.signal, onSocket: trackRoute });
        if (destination.poolTls) remote = await connectPoolTls(remote, destination, trackRoute);
        if (pair.finished || downstream.destroyed) { remote.destroy(); throw new Error('miner 已断开'); }
        const route = { key, socket: remote, sockets: routeSockets, active: true, replay: null, tap: null, phase: 'live', jobIds: new Set(), sessionId: null };
        const observe = message => {
          if (!route.active) return false;
          const replay = route.replay;
          const id = message?.id !== undefined && message.id !== null ? JSON.stringify(message.id) : null;
          if (id && replay?.ids.has(id)) {
            const method = replay.ids.get(id);
            replay.ids.delete(id);
            if (method === 'mining.subscribe') {
              if (message.error || message.result === false) replay.finish(new Error('新矿池拒绝订阅，无法切换'));
              else {
                const result = message.result;
                if (!Array.isArray(result) || typeof result[1] !== 'string' || !Number.isInteger(result[2])) replay.finish(new Error('新矿池订阅结果缺少 extranonce，无法切换'));
                else {
                  const nextExtranonce = result.slice(1, 3);
                  if (JSON.stringify(nextExtranonce) !== JSON.stringify(subscribedExtranonce)) {
                    if (!supportsExtranonce) {
                      replay.finish(new Error('先订阅后授权的 miner 需要支持 mining.extranonce.subscribe 或 subscribe-extranonce 才能切换矿池'));
                      return false;
                    }
                    downstream.write(JSON.stringify({ id: null, method: 'mining.set_extranonce', params: nextExtranonce }) + '\n');
                  }
                  subscribedExtranonce = nextExtranonce;
                  replay.finish();
                }
              }
            }
            return false;
          }
          const job = jobFromMessage(message);
          if (job) { const jid = jobId(job); if (jid !== null) route.jobIds.add(jid); }
          captureSession(route, message);
          observeReply(message);
        };
        const tap = new ResponseTap(observe);
        route.tap = tap;
        pair.streams.push(tap);
        const routeFailed = error => { if (route.active) { route.replay?.finish(error); failed(error); } };
        tap.on('error', routeFailed);
        remote.on('error', routeFailed);
        remote.on('close', hadError => {
          if (!route.active) return;
          route.replay?.finish(new Error('矿池在订阅阶段断开'));
          closed('up', remote, downstream, hadError);
        });
        remote.on('data', chunk => { if (route.active) { info.bytesDown += chunk.length; this.metrics.bytesDown += chunk.length; info.lastActivity = new Date().toISOString(); } });
        remote.pipe(tap).pipe(downstream);
        pair.ready = true;
        upClosed = false;
        remote.resume();
        if (replacing && preLoginFrames.some(frame => frame.method === 'mining.subscribe')) {
          await new Promise((resolve, reject) => {
            const token = crypto.randomUUID();
            const frames = preLoginFrames.map((frame, index) => {
              const copy = structuredClone(frame);
              copy.id = `gateway-replay-${token}-${index}`;
              // A session ID from the original pool must not be resumed at the new pool.
              if (copy.method === 'mining.subscribe' && Array.isArray(copy.params)) copy.params = copy.params.slice(0, 1);
              return copy;
            });
            const ids = new Map(frames.map(frame => [JSON.stringify(frame.id), frame.method]));
            let done = false;
            const timer = setTimeout(() => replay.finish(new Error('重放矿池订阅超时')), 10000);
            const replay = { ids, finish: error => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              if (error) reject(error); else resolve();
            } };
            route.replay = replay;
            for (const frame of frames) remote.write(JSON.stringify(frame) + '\n');
          });
        }
        if (pair.finished) throw new Error('连接已关闭');
        currentRoute = route;
        flushDownstream();
        info.state = 'connected';
        this.store.event('info', `${coin.toUpperCase()} ${info.redirected ? '重定向' : '连接'}到 ${destination.poolHost}:${destination.poolPort}`, {
          sessionId: info.id, listenerId: this.rule.id, coin, originalHost: request.host, originalPort: request.port,
          poolHost: destination.poolHost, poolPort: destination.poolPort, redirected: info.redirected, clientTransport: info.clientTransport, poolTransport: info.poolTransport
        });
      };
      // 统一构建目标矿池与钱包决策；resolveProfile 与热切换共用，始终读取最新配置
      const buildProfile = (coin, original) => {
        const settings = this.getSettings();
        const profile = settings.coins[coin];
        if (!profile?.enabled) return { disabled: true };
        const mainDecision = walletPolicy(settings, coin, original, stratum);
        // 双挖只与最终目标矿池端口有关：只有 3360/3361/3362 接受 PRL+NOCK.矿机名，其他矿池只发 地址.矿机名
        const targetPort = mainDecision.usePreset ? profile.poolPort : request.port;
        const decision = loginPolicy(settings, coin, original, targetPort, stratum);
        const finalPort = decision.usePreset ? profile.poolPort : request.port;
        if (decision.dualMining && !DUAL_MINING_PORTS.includes(Number(finalPort))) Object.assign(decision, { dualMining: false, nockWallet: '', nockReplaced: false, nockKnown: false, nockWhitelisted: false });
        const destination = decision.usePreset ? profile : {
          ...profile, poolHost: request.host, poolPort: request.port, poolTls: info.clientTransport === 'tls', originalRoute: true,
          poolServername: downstream.servername || (net.isIP(request.host) ? '' : request.host)
        };
        const appliedProfile = {
          ...profile, wallet: decision.replacePrl ? profile.wallets?.[0] || profile.wallet : original || profile.wallet,
          dualMining: decision.dualMining, nockWalletOverride: decision.dualMining ? decision.nockWallet : undefined,
          workerOverride: decision.known ? 'devfee' : '', poolPassword: decision.usePreset ? profile.poolPassword : ''
        };
        return { decision, destination, appliedProfile, settings };
      };
      const ensureMiner = (login, coin) => {
        const minerId = minerKey(coin, client.remoteAddress, login.workerName, login.appliedAddress, login.appliedNockWallet);
        if (!this.miners.has(minerId)) {
          this.miners.set(minerId, { id: minerId, coin, workerName: login.workerName, clientHost: client.remoteAddress, walletAddress: login.appliedAddress, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), logins: 0, jobs: 0, lastJobAt: null, lastSubmitAt: null, walletReplaced: false, walletChanges: 0, originalWalletAddress: '', lastConnection: null, submitted: 0, accepted: 0, rejected: 0, knownDevWallet: false, lastError: null, intervalShares: 0, intervalFirstShare: null, intervalLastShare: null, intervalSince: new Date().toISOString(), offlineSince: null });
          if (this.miners.size > MINER_ROWS_LIMIT) this.evictMiners();
        }
        const miner = this.miners.get(minerId);
        if (miner.offlineSince) {
          // 离线超过阈值才重连：清空旧的间隔采样，重新开始统计
          if (Date.now() - miner.offlineSince > MINER_IDLE_RESET_MS) {
            miner.intervalShares = 0;
            miner.intervalFirstShare = null;
            miner.intervalLastShare = null;
            miner.intervalSince = new Date().toISOString();
          }
          miner.offlineSince = null;
        }
        return { minerId, miner };
      };
      const routeKey = destination => JSON.stringify([destination.poolHost.toLowerCase(), destination.poolPort, Boolean(destination.poolTls), destination.poolServername || '']);
      const rewriter = new MiningRewriter({
        resolveProfile: async (coin, message) => {
          if (pair.finished) throw new Error('miner 已断开');
          const original = loginWallet(message, coin);
          if (original) { pair.loginPending = true; currentOriginalWallet = original; }
          const built = buildProfile(coin, original || currentOriginalWallet);
          if (built.disabled) throw new Error(`${coin.toUpperCase()} 未启用，请先设置该币种的矿池和钱包`);
          const { decision, destination, appliedProfile, settings } = built;
          clearTimeout(loginTimer);
          info.coin = coin;
          info.poolHost = destination.poolHost;
          info.poolPort = destination.poolPort;
          info.poolTransport = destination.poolTls ? 'tls' : 'tcp';
          const redirected = !stratum && !sameTarget(request, destination);
          if (redirected && !info.redirected) this.metrics.redirected++;
          info.redirected = redirected;
          info.walletPolicyMode = settings.routing?.mode || 'unified';
          info.passthrough = !decision.usePreset;
          info.whitelisted = decision.whitelisted;
          info.knownDevWallet = decision.known;
          info.forcedWallet = Boolean(decision.forced) || stratum;
          await openRoute(coin, destination);
          return appliedProfile;
        },
        onLogin: login => {
          info.originalWallet = login.originalWallet;
          info.appliedWallet = login.appliedWallet;
          info.walletAddress = login.appliedAddress;
          info.workerName = login.workerName;
          info.dualMining = login.dualMining;
          info.originalNockWallet = login.originalNockWallet;
          info.nockWallet = login.appliedNockWallet;
          info.nockWalletReplaced = login.nockReplaced;
          const { minerId, miner } = ensureMiner(login, login.coin);
          pair.miner = miner;
          pair.miner.jobs += pair.unassignedJobs;
          pair.unassignedJobs = 0;
          pair.loginPending = false;
          hasLogin = true;
          if (info.lastJobAt) pair.miner.lastJobAt = info.lastJobAt;
          pair.miner.logins++;
          pair.miner.walletAddress = login.appliedAddress;
          pair.miner.passthrough = info.passthrough;
          pair.miner.whitelisted = info.whitelisted;
          pair.miner.knownDevWallet = info.knownDevWallet;
          pair.miner.dualMining = login.dualMining;
          pair.miner.nockWallet = login.appliedNockWallet;
          pair.miner.originalNockWallet = login.originalNockWallet;
          pair.miner.nockWalletReplaced = login.nockReplaced;
          pair.miner.sampleSince ||= new Date().toISOString();
          if (currentWork) noteDifficulty(pair.miner, currentWork, info.difficultyAt);
          pair.miner.lastSeen = new Date().toISOString();
          info.minerId = minerId;
          info.walletReplaced = login.replaced;
          info.logins++;
          this.metrics.logins++;
          info.state = 'login-sent';
          pair.miner.lastConnection = connectionSummary(info);
          if (login.replaced) {
            pair.miner.walletReplaced = true;
            pair.miner.walletChanges++;
            pair.miner.originalWalletAddress = login.originalAddress;
          }
          if (login.replaced) { info.walletChanges++; this.metrics.walletChanges++; }
          rememberRequest(login.id, 'login');
          this.store.event(login.replaced ? 'success' : 'info', `${login.coin.toUpperCase()} ${login.replaced ? '钱包已替换' : '钱包一致，已沿用'}`, {
            sessionId: info.id, listenerId: this.rule.id, coin: login.coin, originalWallet: login.originalWallet, appliedWallet: login.appliedWallet, walletAddress: login.appliedAddress, workerName: login.workerName, replaced: login.replaced, knownDevWallet: info.knownDevWallet
          });
        },
        onMessage: message => {
          if (message.method === 'mining.extranonce.subscribe' || (message.method === 'mining.configure' && message.params?.[0]?.includes('subscribe-extranonce'))) supportsExtranonce = true;
          if (!hasLogin && ['mining.subscribe', 'mining.configure', 'mining.extranonce.subscribe'].includes(message.method)) {
            const index = preLoginFrames.findIndex(frame => frame.method === message.method);
            const frame = structuredClone(message);
            if (index < 0) preLoginFrames.push(frame); else preLoginFrames[index] = frame;
          }
          if (message.method === 'mining.submit' || message.method === 'submit') {
            info.submitted++;
            this.metrics.submitted++;
            info.lastSubmitAt = new Date().toISOString();
            const submittedJob = submitJobId(message, info.coin);
            const work = submittedJob === null ? currentWork : jobWork.get(submittedJob) || null;
            info.lastShareDifficulty = work?.difficulty ?? null;
            if (pair.miner) {
              pair.miner.submitted++; pair.miner.lastSubmitAt = info.lastSubmitAt; pair.miner.lastSeen = info.lastSubmitAt;
              noteShare(pair.miner, work, info.lastSubmitAt);
            }
            rememberRequest(message.id, 'share', { miner: pair.miner });
          }
        }
      });
      // —— 下游数据按 Job 归属路由：宽限期内的旧 Job 提交转发回旧连接 ——
      let forwardBuffer = [];
      let forwardPending = Buffer.alloc(0);
      const parseDownstream = line => {
        // 有宽限连接时才需要解析（按 Job 归属转发）；否则仅 QTC 需要解析 submit（会话 id 改写）
        if (!graceRoutes.size && (info.coin !== 'qtc' || !line.includes('submit'))) return null;
        try { const message = JSON.parse(line.toString()); return message && typeof message === 'object' ? message : null; } catch { return null; }
      };
      const graceTarget = message => {
        if (!graceRoutes.size || message.method !== 'mining.submit' && message.method !== 'submit') return null;
        const id = submitJobId(message, info.coin);
        if (id === null || currentRoute?.jobIds?.has(id)) return null;
        for (const grace of [...graceRoutes].reverse()) if (grace.jobIds.has(id) && !grace.socket.destroyed) return grace;
        return null;
      };
      const lineEnding = line => line.length >= 2 && line[line.length - 2] === 13 ? '\r\n' : '\n';
      // QTC 的 submit 必须携带登录响应下发的会话 id（params.id）：按目标连接替换，
      // 否则热切换或换矿池后矿机仍用旧会话 id，会被新连接拒绝。
      const rewriteSubmitSession = (message, route) => {
        if (info.coin !== 'qtc' || !route.sessionId) return false;
        if (message.method !== 'submit' && message.method !== 'mining.submit') return false;
        if (!message.params || typeof message.params !== 'object' || Array.isArray(message.params)) return false;
        if (String(message.params.id) === route.sessionId) return false;
        message.params.id = route.sessionId;
        return true;
      };
      const routeDownstream = line => {
        const message = parseDownstream(line);
        let target = null;
        if (message) {
          const grace = graceTarget(message);
          if (grace) {
            if (message.id !== undefined && message.id !== null) grace.submitIds.add(JSON.stringify(message.id));
            target = grace;
          }
        }
        const route = target || currentRoute;
        if (!route) { forwardBuffer.push(line); return; }
        if (message && rewriteSubmitSession(message, route)) {
          route.socket.write(Buffer.from(JSON.stringify(message) + lineEnding(line)));
          return;
        }
        route.socket.write(line);
      };
      const flushDownstream = () => {
        if (!forwardBuffer.length) return;
        const pending = forwardBuffer;
        forwardBuffer = [];
        for (const line of pending) routeDownstream(line);
      };
      const forwardDownstream = chunk => {
        forwardPending = Buffer.concat([forwardPending, chunk]);
        let index;
        while ((index = forwardPending.indexOf(10)) >= 0) {
          const line = forwardPending.subarray(0, index + 1);
          forwardPending = forwardPending.subarray(index + 1);
          routeDownstream(line);
        }
      };
      const closeGrace = grace => {
        if (grace.closed) return;
        grace.closed = true;
        clearTimeout(grace.timer);
        graceRoutes.delete(grace);
        grace.tap.destroy();
        pair.streams = pair.streams.filter(stream => stream !== grace.tap);
        for (const socket of grace.sockets) { socket.destroy(); pair.sockets.delete(socket); }
      };
      // —— 配置热切换：不断开 miner，用新钱包（同一矿机名）新建矿池连接登录一次，成功后接管 Job 下发 ——
      const performRelogin = async ({ coin, destination, key, frame, appliedProfile, login, decision }) => {
        const routeSockets = [];
        const trackRoute = socket => { track(socket); routeSockets.push(socket); };
        let remote = await connectPool({ ...this.rule, ...destination }, { signal: pair.controller.signal, onSocket: trackRoute });
        if (destination.poolTls) remote = await connectPoolTls(remote, destination, trackRoute);
        if (pair.finished || downstream.destroyed) { remote.destroy(); throw new Error('miner 已断开'); }
        const candidate = { key, socket: remote, sockets: routeSockets, active: false, phase: 'handshake', replay: null, tap: null, jobIds: new Set(), sessionId: null };
        const token = crypto.randomUUID();
        const frames = preLoginFrames.map((item, index) => {
          const copy = structuredClone(item);
          copy.id = `gateway-relogin-${token}-f${index}`;
          // A session ID from the original pool must not be resumed at the new pool.
          if (copy.method === 'mining.subscribe' && Array.isArray(copy.params)) copy.params = copy.params.slice(0, 1);
          return copy;
        });
        const subscribeFrame = frames.find(item => item.method === 'mining.subscribe') || null;
        const loginFrame = structuredClone(frame);
        loginFrame.id = `gateway-relogin-${token}-login`;
        let settle = null;
        let handshakeTimer = null;
        const handshake = new Promise((resolve, reject) => { settle = { resolve, reject, done: false }; });
        const finishHandshake = error => {
          if (!settle || settle.done) return;
          settle.done = true;
          clearTimeout(handshakeTimer);
          if (error) settle.reject(error); else settle.resolve();
        };
        handshakeTimer = setTimeout(() => finishHandshake(new Error('新矿池重新登录超时')), 20000);
        let stage = subscribeFrame ? 'subscribe' : 'login';
        let nextExtranonce = null;
        const observe = message => {
          if (candidate.phase !== 'handshake') {
            if (!candidate.active) return false;
            const job = jobFromMessage(message);
            if (job) { const jid = jobId(job); if (jid !== null) candidate.jobIds.add(jid); }
            captureSession(candidate, message);
            observeReply(message);
            return true;
          }
          const id = message?.id !== undefined && message.id !== null ? JSON.stringify(message.id) : null;
          if (stage === 'subscribe' && id === JSON.stringify(subscribeFrame.id)) {
            if (message.error || message.result === false) { finishHandshake(new Error('新矿池拒绝订阅')); return false; }
            const result = message.result;
            if (!Array.isArray(result) || typeof result[1] !== 'string' || !Number.isInteger(result[2])) { finishHandshake(new Error('新矿池订阅结果缺少 extranonce')); return false; }
            nextExtranonce = result.slice(1, 3);
            if (JSON.stringify(nextExtranonce) !== JSON.stringify(subscribedExtranonce) && !supportsExtranonce) { finishHandshake(new Error('先订阅后授权的 miner 需要支持 extranonce 订阅才能热切换，保持原连接')); return false; }
            stage = 'login';
            remote.write(JSON.stringify(loginFrame) + '\n');
            return false;
          }
          if (stage === 'login' && id === JSON.stringify(loginFrame.id)) {
            const rejected = Boolean(message.error) || message.result === false || (message.result?.status && !['ok', 'success'].includes(String(message.result.status).toLowerCase()));
            captureSession(candidate, message);
            finishHandshake(rejected ? new Error('新矿池拒绝新钱包登录') : null);
            return false;
          }
          if (candidate.tap && candidate.tap.readableLength > 4194304) { finishHandshake(new Error('新连接积压数据过多')); return false; }
          // 难度与 Job 等消息先积压在新连接的读缓冲里，切换后按顺序原样下发
          return true;
        };
        const tap = new ResponseTap(observe);
        candidate.tap = tap;
        pair.streams.push(tap);
        const abort = error => { if (candidate.phase === 'handshake') finishHandshake(error); };
        tap.on('error', error => { if (candidate.phase === 'handshake') abort(error); else if (candidate.active) failed(error); });
        remote.on('error', error => { if (candidate.phase === 'handshake') abort(error); else if (candidate.active) failed(error); });
        remote.on('close', hadError => {
          if (candidate.phase === 'handshake') abort(new Error('矿池在新钱包登录阶段断开'));
          else if (candidate.active) closed('up', remote, downstream, hadError);
        });
        remote.on('data', chunk => { info.bytesDown += chunk.length; this.metrics.bytesDown += chunk.length; info.lastActivity = new Date().toISOString(); });
        remote.pipe(tap);
        remote.resume();
        for (const item of frames) remote.write(JSON.stringify(item) + '\n');
        if (!subscribeFrame) remote.write(JSON.stringify(loginFrame) + '\n');
        try {
          await handshake;
        } catch (error) {
          candidate.phase = 'dead';
          remote.destroy();
          tap.destroy();
          pair.streams = pair.streams.filter(stream => stream !== tap);
          for (const socket of routeSockets) { socket.destroy(); pair.sockets.delete(socket); }
          throw error;
        }
        // 登录成功：新连接接管 Job 下发；旧连接转入宽限期，继续处理旧 Job 的提交
        candidate.phase = 'live';
        candidate.active = true;
        const stale = currentRoute;
        stale.active = false;
        const grace = { socket: stale.socket, sockets: stale.sockets, tap: stale.tap, jobIds: stale.jobIds || new Set(), sessionId: stale.sessionId || null, submitIds: new Set(), closed: false, timer: null };
        for (const [id, pending] of requests) if (pending.type === 'share') grace.submitIds.add(id);
        stale.tap.onMessage = message => {
          const id = message?.id !== undefined && message.id !== null ? JSON.stringify(message.id) : null;
          if (id && grace.submitIds.has(id)) {
            grace.submitIds.delete(id);
            observeReply(message);
            return true;
          }
          // 旧连接的 Job、难度等一律不再下发，避免与接管后的 Job 混淆
          return false;
        };
        grace.timer = setTimeout(() => closeGrace(grace), RELOGIN_GRACE_MS);
        graceRoutes.add(grace);
        requests.clear();
        seenJobs.clear();
        jobWork.clear();
        currentWork = null;
        info.difficulty = null;
        pair.ready = false;
        currentRoute = candidate;
        if (nextExtranonce && JSON.stringify(nextExtranonce) !== JSON.stringify(subscribedExtranonce)) {
          downstream.write(JSON.stringify({ id: null, method: 'mining.set_extranonce', params: nextExtranonce }) + '\n');
        }
        if (nextExtranonce) subscribedExtranonce = nextExtranonce;
        tap.pipe(downstream);
        pair.ready = true;
        upClosed = false;
        rewriter.profile = appliedProfile;
        rewriter.login = login;
        rewriter.loginMessage = loginFrame;
        const addressChanged = info.walletAddress !== login.appliedAddress;
        info.appliedWallet = login.appliedWallet;
        info.walletAddress = login.appliedAddress;
        info.dualMining = login.dualMining;
        info.originalNockWallet = login.originalNockWallet;
        info.nockWallet = login.appliedNockWallet;
        info.nockWalletReplaced = login.nockReplaced;
        info.walletReplaced = login.replaced;
        info.workerName = login.workerName;
        info.knownDevWallet = Boolean(decision.known);
        info.whitelisted = decision.whitelisted;
        info.passthrough = !decision.usePreset;
        info.forcedWallet = Boolean(decision.forced) || stratum;
        info.poolHost = destination.poolHost;
        info.poolPort = destination.poolPort;
        info.poolTransport = destination.poolTls ? 'tls' : 'tcp';
        const redirected = !stratum && !sameTarget(request, destination);
        if (redirected && !info.redirected) this.metrics.redirected++;
        info.redirected = redirected;
        const { minerId, miner } = ensureMiner(login, coin);
        pair.miner = miner;
        miner.walletAddress = login.appliedAddress;
        miner.workerName = login.workerName;
        miner.passthrough = info.passthrough;
        miner.whitelisted = info.whitelisted;
        miner.knownDevWallet = info.knownDevWallet;
        miner.dualMining = login.dualMining;
        miner.nockWallet = login.appliedNockWallet;
        miner.originalNockWallet = login.originalNockWallet;
        miner.nockWalletReplaced = login.nockReplaced;
        miner.lastSeen = new Date().toISOString();
        if (login.replaced) { miner.walletReplaced = true; miner.originalWalletAddress = login.originalAddress; }
        if (addressChanged) { info.walletChanges++; this.metrics.walletChanges++; miner.walletChanges++; }
        info.minerId = minerId;
        info.state = 'working';
        miner.lastConnection = connectionSummary(info);
      };
      pair.relogin = async (reason, options = {}) => {
        if (pair.finished || pair.reloginBusy || !hasLogin || !info.coin || !currentRoute || currentRoute.phase !== 'live' || !currentOriginalWallet || !rewriter.login || !rewriter.loginMessage) return { status: 'skipped' };
        const coin = info.coin;
        const built = buildProfile(coin, currentOriginalWallet);
        if (built.disabled) { pair.finish(null, `${coin.toUpperCase()} 已停用，连接已断开`); return { status: 'disabled' }; }
        const { decision, destination, appliedProfile } = built;
        const key = routeKey(destination);
        const frame = structuredClone(rewriter.loginMessage);
        const login = rewriteLogin(frame, coin, appliedProfile);
        const passwordChanged = (appliedProfile.poolPassword || '') !== (rewriter.profile?.poolPassword || '');
        if (key === currentRoute.key && login.appliedWallet === rewriter.login.appliedWallet && !passwordChanged) {
          pair.reloginPending = false;
          return { status: 'unchanged' };
        }
        pair.reloginBusy = true;
        info.state = 'switching-pool';
        try {
          await performRelogin({ coin, destination, key, frame, appliedProfile, login, decision });
          pair.reloginPending = false;
          pair.lastReloginError = null;
          this.store.event('success', `${coin.toUpperCase()} 配置更新，已用新钱包重新登录矿池`, {
            sessionId: info.id, listenerId: this.rule.id, coin, originalWallet: info.originalWallet, appliedWallet: login.appliedWallet,
            walletAddress: login.appliedAddress, workerName: info.workerName, replaced: login.replaced, dualMining: login.dualMining, nockWallet: login.appliedNockWallet, reason
          });
          return { status: 'switched' };
        } catch (error) {
          pair.reloginPending = true;
          const firstFailure = !options.quiet || error.message !== pair.lastReloginError;
          pair.lastReloginError = error.message;
          if (!pair.finished) {
            info.state = 'working';
            // 同一原因的重复失败（自动重试）只记录一次，避免事件刷屏
            if (firstFailure) this.store.event('warning', `${coin.toUpperCase()} 保持原连接：${error.message}`, { sessionId: info.id, listenerId: this.rule.id, coin, appliedWallet: rewriter.login?.appliedWallet || '', reason });
          }
          return { status: 'kept', error: error.message };
        } finally { pair.reloginBusy = false; }
      };
      pair.streams.push(bridge, rewriter);
      bridge.on('error', failed);
      rewriter.on('error', failed);
      downstream.on('error', failed);
      downstream.on('close', hadError => closed('down', downstream, currentRoute?.socket, hadError));
      downstream.on('end', () => { info.clientEnded = true; if (pair.miner) pair.miner.lastConnection = connectionSummary(info); });
      downstream.on('data', chunk => { info.bytesUp += chunk.length; this.metrics.bytesUp += chunk.length; info.lastActivity = new Date().toISOString(); });
      downstream.pipe(rewriter).pipe(bridge);
      bridge.on('data', forwardDownstream);
      // miner 半关闭时同步结束当前矿池连接的写入端，等待矿池最后一条响应
      bridge.on('end', () => { currentRoute?.socket.end(); });
      downstream.resume();
    } catch (error) {
      if (!pair.finished && !responded && !client.destroyed) {
        client.setTimeout(1000, () => failed(error));
        if (stratum) client.end(() => failed(error));
        else client.end(reply(error.replyCode || 1), () => failed(error));
      } else failed(error);
    } finally { reader?.release(); }
  }
}

// Web server and startup
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const webToken = process.env.WEB_TOKEN || '';
const envWebHost = (process.env.WEB_HOST || '').trim();
const envWebPort = process.env.WEB_PORT ? Number(process.env.WEB_PORT) : null;
let webHost = '127.0.0.1';
let webPort = 3320;

// 管理页面监听地址与端口：WEB_HOST / WEB_PORT 环境变量优先，其次 data/config.json 的 settings.web，最后默认 127.0.0.1:3320
function effectiveWeb(settings) {
  const configured = settings?.web || {};
  const host = envWebHost || configured.host || '127.0.0.1';
  const port = envWebPort !== null ? envWebPort : configured.port || 3320;
  if (!Number.isInteger(port) || port < 1 || port > 65535) { const error = new Error('管理页面端口无效，请检查 WEB_PORT 环境变量或配置中的 settings.web.port'); error.status = 400; throw error; }
  if (!['127.0.0.1', '::1', 'localhost'].includes(host) && !webToken) { const error = new Error('管理页面对外监听需要设置 WEB_TOKEN 环境变量，或把监听地址改为 127.0.0.1'); error.status = 400; throw error; }
  return { host, port };
}

const store = new Store(dataDir);
const certificates = new CertificateManager(dataDir, path.join(root, 'certs'));
const gateways = new Map();
const viewers = new Set();
let startedAt = new Date().toISOString();
let mutation = Promise.resolve();
let shuttingDown = false;

function enqueue(action) { const result = mutation.then(action); mutation = result.catch(() => {}); return result; }
function json(response, status, data) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(data)); }
function summarizeReload(results) {
  const summary = { total: results.length, switched: 0, kept: 0, unchanged: 0, skipped: 0, disabled: 0, errors: [] };
  for (const result of results) {
    if (result?.status === 'switched') summary.switched += 1;
    else if (result?.status === 'kept') { summary.kept += 1; if (result.error && !summary.errors.includes(result.error)) summary.errors.push(result.error); }
    else if (result?.status === 'unchanged') summary.unchanged += 1;
    else if (result?.status === 'disabled') summary.disabled += 1;
    else summary.skipped += 1;
  }
  summary.errors = summary.errors.slice(0, 3);
  return summary;
}
function snapshot() {
  const listeners = [...gateways.values()].map(gateway => gateway.snapshot());
  const totals = blankMetrics();
  for (const listener of listeners) for (const field of Object.keys(totals)) totals[field] += listener[field];
  const sessions = [...gateways.values()].flatMap(gateway => [...gateway.sessions.values()]);
  const grouped = new Map();
  for (const gateway of gateways.values()) for (const miner of gateway.miners.values()) {
    let aggregate = grouped.get(miner.id);
    if (!aggregate) { aggregate = { ...miner, shareBuckets: undefined, bucketLists: [], logins: 0, jobs: 0, walletChanges: 0, submitted: 0, accepted: 0, rejected: 0, active: 0, speedUp: 0, speedDown: 0 }; grouped.set(miner.id, aggregate); }
    if (miner.shareBuckets?.length) aggregate.bucketLists.push(miner.shareBuckets);
    if (miner.sampleSince && (!aggregate.sampleSince || miner.sampleSince < aggregate.sampleSince)) aggregate.sampleSince = miner.sampleSince;
    if (miner.difficultyAt && (!aggregate.difficultyAt || miner.difficultyAt >= aggregate.difficultyAt)) {
      aggregate.difficulty = miner.difficulty; aggregate.difficultyAt = miner.difficultyAt; aggregate.difficultySource = miner.difficultySource;
    }
    for (const field of ['logins', 'jobs', 'walletChanges', 'submitted', 'accepted', 'rejected']) aggregate[field] += miner[field] || 0;
    if (miner.walletReplaced) aggregate.walletReplaced = true;
    if (miner.lastSubmitAt && (!aggregate.lastSubmitAt || miner.lastSubmitAt >= aggregate.lastSubmitAt)) { aggregate.lastSubmitAt = miner.lastSubmitAt; aggregate.lastShareDifficulty = miner.lastShareDifficulty; }
    if (miner.lastJobAt && (!aggregate.lastJobAt || miner.lastJobAt > aggregate.lastJobAt)) aggregate.lastJobAt = miner.lastJobAt;
    if (miner.lastSeen > aggregate.lastSeen) { aggregate.lastSeen = miner.lastSeen; aggregate.lastError = miner.lastError; aggregate.lastConnection = miner.lastConnection; aggregate.walletAddress = miner.walletAddress; aggregate.passthrough = miner.passthrough; aggregate.whitelisted = miner.whitelisted; }
    if (miner.originalWalletAddress) aggregate.originalWalletAddress = miner.originalWalletAddress;
  }
  for (const session of sessions) {
    const miner = grouped.get(session.minerId);
    if (miner) { if (!session.clientEnded) miner.active++; miner.speedUp += session.speedUp; miner.speedDown += session.speedDown; }
  }
  const now = Date.now();
  const miners = [...grouped.values()].map(miner => {
    const hashrate1h = hashrateFromLists(miner.bucketLists, miner.sampleSince, Boolean(miner.difficulty), 3600, now);
    const hashrate6h = hashrateFromLists(miner.bucketLists, miner.sampleSince, Boolean(miner.difficulty), SIX_HOURS, now);
    // 平均份额间隔：按相邻两次提交（接受和被拒都计入）的平均间隔；离线超过 5 分钟重连后重新统计
    const intervalShares = Number(miner.intervalShares) || 0;
    const firstShareAt = miner.intervalFirstShare ? Date.parse(miner.intervalFirstShare) : 0;
    const lastShareAt = miner.intervalLastShare ? Date.parse(miner.intervalLastShare) : 0;
    const shareInterval = intervalShares >= 2 && lastShareAt >= firstShareAt ? Math.max(1, Math.round((lastShareAt - firstShareAt) / 1000 / (intervalShares - 1))) : null;
    const difficulties = [...new Set(sessions.filter(session => session.minerId === miner.id && !session.clientEnded && session.difficulty).map(session => session.difficulty))].sort((a, b) => a - b);
    const { shareBuckets, bucketLists, ...publicMiner } = miner;
    return { ...publicMiner, difficulties, hashrate1h, hashrate6h, shareInterval, intervalShares };
  });
  const usage = process.memoryUsage();
  return { listeners, sessions, miners, totals, settings: publicSettings(store.config.settings), certificate: certificates.publicInfo(store.config.settings.tls), events: store.events.slice(-80).reverse(), memory: { rss: usage.rss, heapUsed: usage.heapUsed }, startedAt, time: new Date(now).toISOString() };
}
function runtimeSnapshot() {
  const gatewaysSnapshot = {};
  for (const gateway of gateways.values()) {
    for (const miner of gateway.miners.values()) pruneBuckets(miner);
    gatewaysSnapshot[gateway.rule.id] = { metrics: { ...gateway.metrics }, miners: [...gateway.miners.values()] };
  }
  return { startedAt, savedAt: new Date().toISOString(), gateways: gatewaysSnapshot };
}

function sharedAddress(a, b) {
  const local = value => value === 'localhost' ? '127.0.0.1' : value;
  return local(a) === local(b) || ['0.0.0.0', '::'].includes(a) || ['0.0.0.0', '::'].includes(b);
}
function checkListeners(listeners, settings, web = { host: webHost, port: webPort }) {
  for (const rule of listeners) {
    if (!rule.enabled) continue;
    if (rule.listenPort === web.port && sharedAddress(rule.listenHost, web.host)) invalid('SOCKS5 入口端口与管理页面冲突');
    const conflict = listeners.find(other => other.id !== rule.id && other.enabled && other.listenPort === rule.listenPort && sharedAddress(other.listenHost, rule.listenHost));
    if (conflict) invalid(`端口与入口“${conflict.name}”冲突`);
    const local = host => ['127.0.0.1', 'localhost', '::1'].includes(host);
    if (rule.mode === 'socks5' && local(rule.socksHost) && listeners.some(other => other.enabled && other.listenPort === rule.socksPort && (local(other.listenHost) || ['0.0.0.0', '::'].includes(other.listenHost)))) invalid('上游 SOCKS5 不能指向本项目的入口，以免循环连接');
    for (const [coin, profile] of Object.entries(settings.coins)) {
      if (profile.enabled && local(profile.poolHost) && rule.listenPort === profile.poolPort && (local(rule.listenHost) || ['0.0.0.0', '::'].includes(rule.listenHost))) invalid(`${coin.toUpperCase()} 矿池不能指向本项目的 SOCKS5 入口`);
    }
  }
}
async function apply(rule, savedRuntime) {
  const previous = gateways.get(rule.id);
  if (previous) await previous.stop('入口配置更新，请 miner 重连');
  const gateway = new Gateway(rule, () => store.config.settings, certificates, store);
  if (previous) {
    gateway.metrics = { ...previous.metrics };
    gateway.miners = previous.miners;
    gateway.sampleBase = { time: performance.now(), up: previous.metrics.bytesUp, down: previous.metrics.bytesDown };
  } else if (savedRuntime) gateway.restoreRuntime(savedRuntime);
  gateways.set(rule.id, gateway);
  await gateway.start();
  return gateway.snapshot();
}

async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) { const error = new Error('请发送 application/json'); error.status = 415; throw error; }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1048576) { const error = new Error('请求内容过大'); error.status = 413; throw error; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { invalid('JSON 格式无效'); }
}
function authorized(request, response) {
  if (!webToken) return true;
  const supplied = Buffer.from(request.headers.authorization || '');
  const expected = Buffer.from(`Basic ${Buffer.from(`admin:${webToken}`).toString('base64')}`);
  if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) return true;
  response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Miner Gateway", charset="UTF-8"', 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: '需要管理页面密码，用户名为 admin' }));
  return false;
}
const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/icon.svg': ['icon.svg', 'image/svg+xml'] };
async function handler(request, response) {
  try {
    if (!authorized(request, response)) return;
    if (['POST', 'PUT', 'DELETE'].includes(request.method) && request.headers.origin) {
      let origin;
      try { origin = new URL(request.headers.origin); } catch { invalid('请求来源无效'); }
      if (origin.host !== request.headers.host || !['http:', 'https:'].includes(origin.protocol)) { const error = new Error('请求来源不允许'); error.status = 403; throw error; }
    }
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'GET' && assets[url.pathname]) {
      const [file, mime] = assets[url.pathname];
      const content = await fs.readFile(path.join(root, 'public', file));
      response.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" });
      response.end(content);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/status') return json(response, 200, snapshot());
    if (request.method === 'GET' && url.pathname === '/api/runtime') return json(response, 200, runtimeSnapshot());
    if (request.method === 'GET' && url.pathname === '/api/certificate') {
      response.writeHead(200, { 'Content-Type': 'application/x-pem-file', 'Content-Disposition': 'attachment; filename="miner-gateway-ca.pem"', 'Cache-Control': 'no-store' });
      response.end(certificates.publicCertificate(store.config.settings.tls));
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      response.write(`data: ${JSON.stringify(snapshot())}\n\n`);
      viewers.add(response);
      response.on('close', () => viewers.delete(response));
      return;
    }
    if (request.method === 'PUT' && url.pathname === '/api/settings') {
      const input = await body(request);
      const reload = await enqueue(async () => {
        const settings = validateSettings(input, store.config.settings);
        checkListeners(store.config.listeners, settings, effectiveWeb(settings));
        await store.save({ ...store.config, settings });
        // 不断开 miner：已登录的连接用新钱包重新登录矿池后接管 Job 下发
        const results = [];
        for (const gateway of gateways.values()) results.push(...await gateway.reload('共享配置更新'));
        store.event('info', '共享矿池与证书配置已保存');
        return summarizeReload(results);
      });
      return json(response, 200, { settings: publicSettings(store.config.settings), certificate: certificates.publicInfo(store.config.settings.tls), reload });
    }
    if (request.method === 'POST' && url.pathname === '/api/listeners') {
      const input = await body(request);
      const result = await enqueue(async () => {
        const rule = validateListener(input);
        const listeners = [...store.config.listeners, rule];
        checkListeners(listeners, store.config.settings);
        await store.save({ ...store.config, listeners });
        return apply(rule);
      });
      return json(response, 201, { listener: result });
    }
    const match = url.pathname.match(/^\/api\/listeners\/([a-f0-9-]{36})$/);
    if (match && ['PUT', 'DELETE'].includes(request.method)) {
      const input = request.method === 'PUT' ? await body(request) : null;
      const result = await enqueue(async () => {
        const previous = store.config.listeners.find(rule => rule.id === match[1]);
        if (!previous) { const error = new Error('入口不存在'); error.status = 404; throw error; }
        const listeners = store.config.listeners.filter(rule => rule.id !== previous.id);
        if (request.method === 'DELETE') {
          await store.save({ ...store.config, listeners });
          await gateways.get(previous.id)?.stop('入口已删除');
          gateways.delete(previous.id);
          return { deleted: true };
        }
        const rule = validateListener(input, previous);
        listeners.push(rule);
        checkListeners(listeners, store.config.settings);
        await store.save({ ...store.config, listeners });
        return { listener: await apply(rule) };
      });
      return json(response, 200, result);
    }
    json(response, 404, { error: '接口不存在' });
  } catch (error) {
    if (response.headersSent) { response.destroy(); return; }
    if (!error.status) console.error(error);
    json(response, error.status || 500, { error: error.status ? error.message : '服务器内部错误，请查看运行日志' });
  }
}

async function main() {
  await store.load();
  ({ host: webHost, port: webPort } = effectiveWeb(store.config.settings));
  await certificates.init();
  checkListeners(store.config.listeners, store.config.settings);
  let runtime = null;
  if (process.env.RUNTIME_SNAPSHOT) {
    runtime = JSON.parse(await fs.readFile(path.resolve(process.env.RUNTIME_SNAPSHOT), 'utf8'));
    if (runtime.startedAt && Number.isFinite(Date.parse(runtime.startedAt))) startedAt = runtime.startedAt;
  }
  for (const rule of store.config.listeners) await apply(rule, runtime?.gateways?.[rule.id]);
  const server = http.createServer(handler);
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(webPort, webHost, resolve); }); }
  catch (error) { await Promise.all([...gateways.values()].map(gateway => gateway.stop('管理页面启动失败'))); await store.queue; throw error; }
  console.log(`管理页面: http://${webHost}:${webPort}`);
  let ticks = 0;
  let lastMemoryWarn = 0;
  const retryEvery = Math.max(1, Number(process.env.RELOGIN_RETRY_SECONDS) || 60);
  const timer = setInterval(() => {
    for (const gateway of gateways.values()) gateway.sample();
    ticks += 1;
    if (ticks % 60 === 0) {
      // 定期释放离线矿机超过 6 小时的份额桶，并观察内存水位
      for (const gateway of gateways.values()) for (const miner of gateway.miners.values()) pruneBuckets(miner);
      const usage = process.memoryUsage();
      if (usage.rss > 180 * 1048576 && Date.now() - lastMemoryWarn > 3600000) {
        lastMemoryWarn = Date.now();
        store.event('warning', `内存占用较高：RSS ${Math.round(usage.rss / 1048576)} MB，长时间运行请检查堆上限是否超过设备可用内存`, { rss: usage.rss, heapUsed: usage.heapUsed });
      }
    }
    // 切换失败的连接重试热切换（新矿池恢复可达后自愈）
    if (ticks % retryEvery === 0) for (const gateway of gateways.values()) gateway.retryRelogins().catch(() => {});
    if (!viewers.size) return;
    const message = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const viewer of viewers) if (!viewer.destroyed && !viewer.writableNeedDrain) viewer.write(message);
  }, 1000);
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(timer);
    for (const viewer of viewers) viewer.end();
    const closed = new Promise(resolve => server.close(resolve));
    await Promise.all([...gateways.values()].map(gateway => gateway.stop('程序停止')));
    await store.queue;
    await closed;
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return { server, shutdown };
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { SocketReader, addressBytes, readAddress, receiveRequest, reply, connectPool, connectPoolTls, detectTransport, waitHandshake, CertificateManager, validateCertificate, defaultConfig, validateSettings, validateListener, publicListener, publicSettings, invalid, DEFAULT_NOCK_WALLET, DEFAULT_WEB, detectCoin, splitLogin, loginWallet, walletPolicy, loginPolicy, minerKey, jobFromMessage, rewriteLogin, MiningRewriter, ResponseTap, DUAL_MINING_PORTS, workForJob, workUpdate, jobId, submitJobId, noteDifficulty, noteShare, pruneBuckets, hashrateFromLists, estimateHashrate, SIX_HOURS, SHARE_BUCKET_SECONDS, Store, Gateway, blankMetrics, main };
