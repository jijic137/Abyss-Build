/* 演示后端：账号注册/登录 + 云端存档（上传/下载/同步）
   - 零三方依赖（node:http + node:crypto）
   - JSON 文件存储（server/data/）
   - 登录/注册签发 HMAC token；按 user+slot 覆盖保存（upsert）
   - 仅作演示/自托管，生产请换成 Supabase 等托管方案（见 docs/deployment.md）
   用法：node server/server.js  [端口=8788] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.argv[2] || process.env.PORT || 8788);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET = process.env.AH_SECRET || 'dev-secret-change-me';
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch (e) { return {}; }
}
let users = loadUsers();
function persistUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return salt + ':' + h;
}
function verifyPw(pw, stored) {
  if (!stored || stored.indexOf(':') < 0) return false;
  const salt = stored.split(':')[0];
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return stored === salt + ':' + h;
}

function signToken(userId) {
  const body = userId + '.' + Date.now();
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  return body + '.' + mac;
}
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const body = parts[0] + '.' + parts[1];
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  if (mac !== parts[2]) return null;
  const id = parts[0];
  return users[id] ? id : null;
}

function userSaveFile(userId, slot) {
  return path.join(DATA_DIR, 'save_' + userId + '_' + (slot || 1) + '.json');
}
function readSave(userId, slot) {
  try { return JSON.parse(fs.readFileSync(userSaveFile(userId, slot), 'utf8')); }
  catch (e) { return null; }
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 4e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const pathname = url.pathname;
  try {
    if (req.method === 'POST' && pathname === '/api/register') {
      const b = await readBody(req);
      const email = String(b.email || '').trim().toLowerCase();
      const pw = String(b.password || '');
      if (!email || pw.length < 4) return send(res, 400, { ok: false, msg: '邮箱或密码不合法' });
      if (Object.values(users).some(u => u.email === email)) return send(res, 409, { ok: false, msg: '该账号已注册' });
      const id = 'u_' + crypto.randomBytes(8).toString('hex');
      users[id] = { id, email, pwHash: hashPw(pw), createdAt: Date.now() };
      persistUsers();
      return send(res, 200, { ok: true, token: signToken(id), userId: id });
    }
    if (req.method === 'POST' && pathname === '/api/signin') {
      const b = await readBody(req);
      const email = String(b.email || '').trim().toLowerCase();
      const pw = String(b.password || '');
      const u = Object.values(users).find(x => x.email === email);
      if (!u || !verifyPw(pw, u.pwHash)) return send(res, 401, { ok: false, msg: '账号或密码错误' });
      return send(res, 200, { ok: true, token: signToken(u.id), userId: u.id });
    }

    const auth = req.headers['authorization'] || '';
    const userId = verifyToken(auth.replace(/^Bearer\s+/i, ''));
    if (!userId) return send(res, 401, { ok: false, msg: '未登录' });

    if (req.method === 'POST' && pathname === '/api/save') {
      const b = await readBody(req);
      const slot = Math.max(1, Math.min(3, Number(b.slot) || 1));
      const profile = b.profile;
      if (!profile || typeof profile !== 'object') return send(res, 400, { ok: false, msg: '缺少档案' });
      fs.writeFileSync(userSaveFile(userId, slot), JSON.stringify({ slot, profile, savedAt: Date.now() }));
      return send(res, 200, { ok: true, slot });
    }
    if (req.method === 'GET' && pathname === '/api/load') {
      const slot = Math.max(1, Math.min(3, Number(url.searchParams.get('slot')) || 1));
      const data = readSave(userId, slot);
      if (!data) return send(res, 200, { ok: true, profile: null });
      return send(res, 200, { ok: true, profile: data.profile });
    }
    if (req.method === 'GET' && pathname === '/api/me') {
      const u = users[userId];
      return send(res, 200, { ok: true, email: u ? u.email : '', userId });
    }
    return send(res, 404, { ok: false, msg: 'not found' });
  } catch (e) {
    send(res, 500, { ok: false, msg: String((e && e.message) || e) });
  }
});

server.listen(PORT, () => {
  console.log('Abyss-Hunter demo server on http://localhost:' + PORT);
});
