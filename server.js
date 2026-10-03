const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'crm.json');
const DATABASE_URL = process.env.DATABASE_URL || '';
const DEEPSEEK_API_URL = (process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const COOKIE_NAME = 'crm_auth';
let pool = null;

if (DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
    });
  } catch (e) {
    throw new Error('DATABASE_URL 已配置，但数据库驱动加载失败，已停止启动以避免数据写入临时文件。', {cause:e});
  }
}

function emptyState() {
  return { version: 2, clients: [], updatedAt: new Date().toISOString() };
}

async function initStorage() {
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const r = await pool.query('SELECT id FROM crm_state WHERE id=$1', ['main']);
    if (!r.rowCount) {
      await pool.query('INSERT INTO crm_state(id,data) VALUES($1,$2::jsonb)', ['main', JSON.stringify(emptyState())]);
    }
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(emptyState(), null, 2));
}

async function readState() {
  if (pool) {
    const r = await pool.query('SELECT data FROM crm_state WHERE id=$1', ['main']);
    return r.rows[0]?.data || emptyState();
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

async function writeState(state) {
  state.version = 2;
  state.updatedAt = new Date().toISOString();
  if (pool) {
    await pool.query(
      `INSERT INTO crm_state(id,data,updated_at) VALUES($1,$2::jsonb,NOW())
       ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`,
      ['main', JSON.stringify(state)]
    );
    return;
  }
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function send(res, status, data, type='application/json; charset=utf-8', extraHeaders={}) {
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', ...extraHeaders };
  res.writeHead(status, headers);
  res.end(type.includes('json') ? JSON.stringify(data) : data);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return [decodeURIComponent(x.slice(0,i)), decodeURIComponent(x.slice(i+1))];
  }));
}

function authToken() {
  if (!APP_PASSWORD) return '';
  return crypto.createHmac('sha256', APP_PASSWORD).update('customer-ai-crm-v2').digest('hex');
}
function safeEqual(a,b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa,bb);
}
function isAuthed(req) {
  if (!APP_PASSWORD) return true;
  return safeEqual(parseCookies(req)[COOKIE_NAME] || '', authToken());
}

function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let raw='';
    req.on('data', c => {
      raw += c;
      if (raw.length > 5_000_000) req.destroy(new Error('请求数据过大'));
    });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch(e){ reject(e); } });
    req.on('error', reject);
  });
}

function compactClientContext(client) {
  if (!client) return '当前没有选择客户。';
  const answered = Object.entries(client.interviewAnswers || {})
    .filter(([,v]) => v && (v.answer || v.important || v.contentIdea || v.followUp))
    .sort((a,b) => String(b[1].updatedAt||'').localeCompare(String(a[1].updatedAt||'')));

  const important = answered.filter(([,v]) => v.important || v.contentIdea || v.followUp).slice(0,45);
  const recentInterview = answered.slice(0,35);
  const pendingTasks = (client.tasks || []).filter(t => !t.done).slice(0,15);
  const recentContent = (client.content || []).slice(0,15);
  const recentTraining = (client.training || []).slice(0,5);
  const recentMetrics = (client.metrics || []).slice(0,10);
  const recentTimeline = (client.timeline || []).slice(0,20);

  return JSON.stringify({
    client: {
      id: client.id, name: client.name, area: client.area, industry: client.industry,
      status: client.status, serviceType: client.serviceType, stage: client.stage,
      nextAction: client.nextAction, nextFollowUpDate: client.nextFollowUpDate,
      nextTrainingDate: client.nextTrainingDate, lastFollowUpAt: client.lastFollowUpAt
    },
    basic: client.basic || {},
    strategy: client.strategy || {},
    interviewImportant: important,
    interviewRecent: recentInterview,
    recentContent,
    recentTraining,
    pendingTasks,
    recentMetrics,
    recentTimeline,
    aiNotes: client.aiNotes || ''
  }, null, 2);
}

const SYSTEM_PROMPT = `你是“客户营销总控台”的AI运营助手，服务中国本地实体店、工厂、电商和个人IP客户。你必须基于当前客户真实档案给出可直接落地的运营、文案、拍摄、培训和复盘建议。

工作原则：
1. 一客一档、一客一策。流程可以标准化，但人设、同城、内容和转化必须按客户事实定。
2. 先整体规划，再按真实执行结果逐阶段调整。不要把未来30天一次写死。
3. 第一次深访要充分挖经营、产品利润、客群、竞品、老板经历、失败亏损、被坑被骗、家庭孩子、性格原则、老顾客、行业误区、账号历史、设备和执行力。资料不足就明确“需要补充”，不能编。
4. 3—5条样板视频直接融合在三次上门培训：定选题→写/改文案→现场拍→边拍边教→现场剪→客户实操→纠错→留作业。第一次团队带得多，第二次客户做得更多，第三次尽量独立。
5. 内容优先从：人设故事、同城话题、专业/产品、真实顾客/经营、热点/老板观点中选择。热点必须相关，不硬蹭。
6. 生成文案时尽量给：拍摄目的、3秒开头、完整口播、镜头/补素材、封面标题。口语化，适合真实老板说，不要营销老师腔。
7. 账号包装要考虑昵称、头像、简介、背景图、封面风格、置顶3条、主页前9条。
8. 数据复盘每5条为一个小周期，不只看播放，还看评论、收藏、分享、主页访问、私信、问价、问地址、咨询、到店、成交。
9. 当用户问“下一次怎么做”，优先参考最近培训、未完成作业、最近视频数据和时间线。
10. 用户更新事实时，以最新事实为准，并指出哪些旧规划/文案需要同步调整。
11. 不承诺爆款，不虚构成绩或经历。
12. 输出尽量结构清楚、能直接执行。
13. 产出视频内容时，可优先套用内置模板库的「同城泛流量」（城市争议话题、同城藏宝、街头采访）和「店内日常拍摄」（接客讲产品、顾客第一视角、消费账单、制作交付、售后、开收店）形式，把客户真实信息填进【县名】【行业】【产品】【经历】等占位，资料不足就明确要补充，不编造。`;

async function callAI(client, message, history=[]) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY 未配置');
  const recent = history.slice(-16).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0,12000)
  }));
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `【当前客户工作档案（已压缩）】\n${compactClientContext(client)}\n\n请把这份档案作为本次回答依据。` },
    ...recent,
    { role: 'user', content: String(message || '') }
  ];
  const r = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(90000),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'AI调用失败');
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI没有返回内容，请稍后重试');
  return content;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res,403,'Forbidden','text/plain; charset=utf-8');
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      const index = path.join(PUBLIC_DIR, 'index.html');
      return fs.readFile(index, (e,b) => e ? send(res,404,'Not found','text/plain; charset=utf-8') : send(res,200,b,'text/html; charset=utf-8'));
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
      '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
      '.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'
    };
    fs.readFile(file, (e,b) => e ? send(res,500,'Read error','text/plain; charset=utf-8') : send(res,200,b,types[ext]||'application/octet-stream'));
  });
}

const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/health') {
      try { await readState(); }
      catch { return send(res,503,{ok:false,error:'存储暂不可用'}); }
      return send(res,200,{ok:true,version:'2.1.0',storage:pool?'postgres':'json'});
    }
    if (url.pathname === '/api/config' && req.method === 'GET') {
      return send(res,200,{
        authRequired:!!APP_PASSWORD, authed:isAuthed(req), aiEnabled:!!process.env.DEEPSEEK_API_KEY,
        model:DEEPSEEK_MODEL, storage:pool?'PostgreSQL':'JSON文件'
      });
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await bodyJson(req);
      if (!APP_PASSWORD || safeEqual(body.password || '', APP_PASSWORD)) {
        const forwarded = String(req.headers['x-forwarded-proto'] || '');
        const secure = forwarded.includes('https') ? '; Secure' : '';
        res.setHeader('Set-Cookie', `${COOKIE_NAME}=${authToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}`);
        return send(res,200,{ok:true});
      }
      return send(res,401,{error:'密码不正确'});
    }
    if (url.pathname === '/api/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
      return send(res,200,{ok:true});
    }
    if (url.pathname.startsWith('/api/') && !isAuthed(req)) return send(res,401,{error:'未登录'});

    if (url.pathname === '/api/state' && req.method === 'GET') return send(res,200,await readState());
    if (url.pathname === '/api/state' && req.method === 'PUT') {
      const state = await bodyJson(req);
      if (!state || !Array.isArray(state.clients)) return send(res,400,{error:'数据格式错误'});
      await writeState(state);
      return send(res,200,{ok:true,updatedAt:state.updatedAt});
    }
    if (url.pathname === '/api/ai' && req.method === 'POST') {
      const body = await bodyJson(req);
      const state = await readState();
      const client = state.clients.find(c => c.id === body.clientId) || null;
      if (!client) return send(res,404,{error:'客户不存在，请先保存客户资料'});
      if (typeof body.message !== 'string' || !body.message.trim()) return send(res,400,{error:'请输入问题'});
      const text = await callAI(client, body.message, Array.isArray(body.history) ? body.history : []);
      return send(res,200,{text});
    }
    if (url.pathname === '/api/export' && req.method === 'GET') {
      const state = await readState();
      const stamp = new Date().toISOString().slice(0,10);
      res.writeHead(200,{
        'Content-Type':'application/json; charset=utf-8',
        'Content-Disposition':`attachment; filename="customer-crm-backup-${stamp}.json"`,
        'Cache-Control':'no-store'
      });
      return res.end(JSON.stringify(state,null,2));
    }
    if (url.pathname === '/api/import' && req.method === 'POST') {
      const state = await bodyJson(req);
      if (!state || !Array.isArray(state.clients)) return send(res,400,{error:'备份文件格式错误'});
      await writeState(state);
      return send(res,200,{ok:true});
    }
    if (url.pathname.startsWith('/api/')) return send(res,404,{error:'接口不存在'});
    return serveStatic(req,res);
  } catch(e) {
    console.error(e);
    return send(res,e instanceof SyntaxError || e instanceof URIError ? 400 : 500,{error:e.message || '服务器错误'});
  }
});

initStorage().then(() => {
  server.listen(PORT,'0.0.0.0',()=>console.log(`Customer AI CRM v2.1 running on http://0.0.0.0:${server.address().port} · ${pool?'PostgreSQL':'JSON'}`));
}).catch(err => {
  console.error('存储初始化失败', err);
  process.exit(1);
});
