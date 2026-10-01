'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 39211;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer(dataFile) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_FILE: dataFile,
      APP_PASSWORD: 'secret123',
      OPENAI_API_KEY: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return child;
}

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch (e) { /* not ready */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('服务器未在超时时间内启动');
}

function cookieFrom(res) {
  const sc = res.headers.get('set-cookie') || '';
  const m = sc.match(/crm_auth=([^;]+)/);
  return m ? m[1] : null;
}

test('登录保护 + 客户数据新增/读取/持久化（重启后仍在）', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-api-'));
  const dataFile = path.join(dir, 'crm.json');
  let server = startServer(dataFile);
  t.after(() => { try { server.kill('SIGTERM'); } catch (e) {} });
  await waitReady();

  // 未登录不能读数据。
  const cfg = await (await fetch(`${BASE}/api/config`)).json();
  assert.equal(cfg.authRequired, true);
  assert.equal(cfg.authed, false);
  let res = await fetch(`${BASE}/api/state`);
  assert.equal(res.status, 401);

  // 错误密码。
  res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong' })
  });
  assert.equal(res.status, 401);

  // 正确密码。
  res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secret123' })
  });
  assert.equal(res.status, 200);
  const cookie = cookieFrom(res);
  assert.ok(cookie, '登录后应返回会话 Cookie');
  const headers = { 'Content-Type': 'application/json', Cookie: `crm_auth=${cookie}` };

  // 新增客户。
  const client = {
    id: 'api-1', name: '李记农机', area: '保定', industry: '农机', status: '进行中',
    serviceType: '代运营', createdAt: new Date().toISOString(),
    basic: { person: '李老板', products: '拖拉机', goal: '', problem: '', advantages: '' },
    strategy: {}, interviewAnswers: {}, content: [], training: [], tasks: [],
    metrics: [], timeline: [{ id: 'tl', date: new Date().toISOString(), title: '建档', detail: '', type: '建档' }],
    chat: [], aiNotes: ''
  };
  res = await fetch(`${BASE}/api/state`, {
    method: 'PUT', headers, body: JSON.stringify({ version: 1, clients: [client], updatedAt: null })
  });
  assert.equal(res.status, 200);

  // 读回。
  const state = await (await fetch(`${BASE}/api/state`, { headers })).json();
  assert.equal(state.clients.length, 1);
  assert.equal(state.clients[0].name, '李记农机');
  assert.equal(state.clients[0].industry, '农机');

  // 导出 JSON / CSV。
  const exportRes = await fetch(`${BASE}/api/export`, { headers });
  assert.equal(exportRes.status, 200);
  const exportJson = await exportRes.json();
  assert.equal(exportJson.clients[0].id, 'api-1');

  const csvRes = await fetch(`${BASE}/api/export/csv`, { headers });
  assert.equal(csvRes.status, 200);
  assert.ok((csvRes.headers.get('content-type') || '').includes('text/csv'));

  // 模拟服务器重启：杀掉旧进程，用同一数据文件重启，重新登录，数据仍在。
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 400));
  server = startServer(dataFile);
  await waitReady();

  res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'secret123' })
  });
  const cookie2 = cookieFrom(res);
  const state2 = await (await fetch(`${BASE}/api/state`, {
    headers: { Cookie: `crm_auth=${cookie2}` }
  })).json();
  assert.equal(state2.clients.length, 1);
  assert.equal(state2.clients[0].name, '李记农机');

  // 清理进程。
  server.kill('SIGTERM');
});
