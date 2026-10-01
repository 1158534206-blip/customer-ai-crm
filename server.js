'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { createStore } = require('./lib/store');
const { callAI } = require('./lib/ai');
const { toClientsCsv } = require('./lib/csv');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const COOKIE_NAME = 'crm_auth';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// ---- helpers ---------------------------------------------------------------
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.includes('json') ? JSON.stringify(data) : data);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const x = part.trim();
    if (!x) continue;
    const i = x.indexOf('=');
    if (i < 0) continue;
    out[decodeURIComponent(x.slice(0, i))] = decodeURIComponent(x.slice(i + 1));
  }
  return out;
}

function authToken() {
  if (!APP_PASSWORD) return '';
  return crypto.createHmac('sha256', APP_PASSWORD).update('customer-ai-crm-v1').digest('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function isAuthed(req) {
  if (!APP_PASSWORD) return true;
  const token = parseCookies(req)[COOKIE_NAME];
  return !!token && safeEqual(token, authToken());
}

function isSecure(req) {
  return req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;
}

function setAuthCookie(res, value, secure) {
  const parts = [`${COOKIE_NAME}=${value}`, 'HttpOnly', 'SameSite=Lax', 'Path=/'];
  if (secure) parts.push('Secure');
  parts.push(`Max-Age=${COOKIE_MAX_AGE}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res, secure) {
  const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 10_000_000) { req.destroy(); reject(new Error('请求体过大')); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('请求体不是合法 JSON')); }
    });
    req.on('error', reject);
  });
}

// In-memory login rate limiter (per IP).
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 20;
function loginBlocked(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now - rec.resetAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 0, resetAt: now });
    return false;
  }
  return rec.count >= LOGIN_MAX_ATTEMPTS;
}
function loginRecord(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now - rec.resetAt > LOGIN_WINDOW_MS) loginAttempts.set(ip, { count: 1, resetAt: now });
  else rec.count += 1;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e, b) => {
        if (e) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
        return send(res, 200, b, 'text/html; charset=utf-8');
      });
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon'
    };
    fs.readFile(file, (e, b) => (e ? send(res, 500, 'Read error', 'text/plain; charset=utf-8') : send(res, 200, b, types[ext] || 'application/octet-stream')));
  });
}

// ---- bootstrap -------------------------------------------------------------
let store;
let writeQueue = Promise.resolve();

function saveState(state) {
  writeQueue = writeQueue.then(() => store.save(state));
  return writeQueue;
}

async function start() {
  store = await createStore(process.env);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
      if (url.pathname === '/api/health') return send(res, 200, { ok: true });

      if (url.pathname === '/api/config' && req.method === 'GET') {
        return send(res, 200, {
          authRequired: !!APP_PASSWORD,
          authed: isAuthed(req),
          aiEnabled: !!process.env.OPENAI_API_KEY,
          model: OPENAI_MODEL,
          storage: process.env.DATABASE_URL ? 'postgres' : 'file'
        });
      }

      if (url.pathname === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        if (loginBlocked(ip)) return send(res, 429, { error: '尝试次数过多，请稍后再试' });
        const body = await bodyJson(req);
        if (!APP_PASSWORD || safeEqual(body.password || '', APP_PASSWORD)) {
          loginAttempts.delete(ip);
          setAuthCookie(res, authToken(), isSecure(req));
          return send(res, 200, { ok: true });
        }
        loginRecord(ip);
        return send(res, 401, { error: '密码不正确' });
      }

      if (url.pathname === '/api/logout' && req.method === 'POST') {
        clearAuthCookie(res, isSecure(req));
        return send(res, 200, { ok: true });
      }

      if (url.pathname.startsWith('/api/') && !isAuthed(req)) {
        return send(res, 401, { error: '未登录' });
      }

      if (url.pathname === '/api/state' && req.method === 'GET') {
        return send(res, 200, await store.load());
      }

      if (url.pathname === '/api/state' && req.method === 'PUT') {
        const state = await bodyJson(req);
        if (!state || !Array.isArray(state.clients)) return send(res, 400, { error: '数据格式错误' });
        const result = await saveState(state);
        return send(res, 200, result);
      }

      if (url.pathname === '/api/ai' && req.method === 'POST') {
        const body = await bodyJson(req);
        const state = await store.load();
        const client = state.clients.find((c) => c.id === body.clientId) || null;
        const text = await callAI({ message: body.message, history: body.history, client, env: process.env });
        return send(res, 200, { text });
      }

      if (url.pathname === '/api/export' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="customer-crm-backup.json"'
        });
        return res.end(JSON.stringify(await store.load(), null, 2));
      }

      if (url.pathname === '/api/export/csv' && req.method === 'GET') {
        const csv = toClientsCsv(await store.load());
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="customer-crm-clients.csv"'
        });
        return res.end(csv);
      }

      if (url.pathname === '/api/import' && req.method === 'POST') {
        const state = await bodyJson(req);
        if (!state || !Array.isArray(state.clients)) return send(res, 400, { error: '备份文件格式错误' });
        const result = await saveState(state);
        return send(res, 200, result);
      }

      if (url.pathname.startsWith('/api/')) return send(res, 404, { error: '接口不存在' });
      return serveStatic(req, res);
    } catch (e) {
      console.error(e);
      return send(res, 500, { error: e.message || '服务器错误' });
    }
  });

  server.listen(PORT, HOST, () => {
    const storage = process.env.DATABASE_URL ? 'PostgreSQL' : '本地JSON文件';
    console.log(`Customer AI CRM running on http://${HOST}:${PORT} (storage: ${storage})`);
  });

  const shutdown = async () => {
    if (store && store.close) await store.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((e) => {
  console.error('启动失败：', e.message || e);
  process.exit(1);
});
