'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = 1;

const BASIC_FIELDS = [
  'person', 'products', 'goal', 'problem', 'advantages', 'targetAudience',
  'competitors', 'accountStatus', 'equipment', 'execution', 'family', 'history'
];

const STRATEGY_FIELDS = [
  'diagnosis', 'positioning', 'persona', 'targetAudience', 'packaging',
  'contentPillars', 'firstBatch', 'stageGoal', 'notes'
];

const METRIC_FIELDS = [
  'views', 'likes', 'comments', 'favorites', 'profileVisits', 'inquiries',
  'storeVisits', 'sales', 'shares', 'directMessages', 'priceInquiries', 'addressInquiries'
];

function emptyState() {
  return { version: VERSION, clients: [], updatedAt: null };
}

function normalizeClient(c) {
  if (!c || typeof c !== 'object') return null;
  c.name ||= '';
  c.area ||= '';
  c.industry ||= '';
  c.status ||= '意向';
  c.serviceType ||= '3000培训陪跑';
  c.createdAt ||= null;
  c.basic ||= {};
  c.strategy ||= {};
  c.interviewAnswers ||= {};
  c.content ||= [];
  c.training ||= [];
  c.tasks ||= [];
  c.metrics ||= [];
  c.timeline ||= [];
  c.chat ||= [];
  c.aiNotes ||= '';
  return c;
}

function normalizeState(state) {
  const s = state && typeof state === 'object' ? state : emptyState();
  s.clients = Array.isArray(s.clients)
    ? s.clients.map(normalizeClient).filter(Boolean)
    : [];
  s.version = VERSION;
  return s;
}

class FileStore {
  constructor(file) {
    this.file = file;
  }

  async load() {
    try {
      const raw = await fs.promises.readFile(this.file, 'utf8');
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      if (e.code === 'ENOENT') return emptyState();
      throw e;
    }
  }

  async save(state) {
    const normalized = normalizeState(state);
    normalized.updatedAt = new Date().toISOString();
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(normalized, null, 2), 'utf8');
    await fs.promises.rename(tmp, this.file);
    return { ok: true, updatedAt: normalized.updatedAt };
  }

  async close() {}
}

class PostgresStore {
  constructor(env = {}) {
    this.connectionString = env.DATABASE_URL;
    if (!this.connectionString) throw new Error('DATABASE_URL 未配置');
    this._pg = null;
    this._pool = null;
    const sslMode = (env.PGSSLMODE || '').toLowerCase();
    this._ssl = sslMode === 'require' || sslMode === 'no-verify'
      ? { rejectUnauthorized: false }
      : undefined;
  }

  _getPg() {
    if (!this._pg) {
      try {
        this._pg = require('pg');
      } catch (e) {
        throw new Error('PostgreSQL 驱动未安装：请运行 npm install');
      }
    }
    return this._pg;
  }

  _poolOrCreate() {
    if (!this._pool) {
      const { Pool } = this._getPg();
      this._pool = new Pool({
        connectionString: this.connectionString,
        ssl: this._ssl,
        max: 5
      });
    }
    return this._pool;
  }

  async _ensureSchema() {
    const pool = this._poolOrCreate();
    const statements = [
      `CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        area TEXT NOT NULL DEFAULT '',
        industry TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '意向',
        service_type TEXT NOT NULL DEFAULT '3000培训陪跑',
        basic JSONB NOT NULL DEFAULT '{}'::jsonb,
        ai_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT,
        updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS interviews (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        qkey TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        done BOOLEAN NOT NULL DEFAULT false,
        important BOOLEAN NOT NULL DEFAULT false,
        content_idea BOOLEAN NOT NULL DEFAULT false,
        follow_up BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(client_id, qkey)
      )`,
      `CREATE TABLE IF NOT EXISTS operation_plans (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        field_key TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        UNIQUE(client_id, field_key)
      )`,
      `CREATE TABLE IF NOT EXISTS contents (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        status TEXT, category TEXT, title TEXT, purpose TEXT, hook TEXT, script TEXT,
        shots TEXT, cover TEXT, notes TEXT, publish_date TEXT, views TEXT, updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS trainings (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        no INTEGER, goal TEXT, date TEXT, completed BOOLEAN, shot TEXT, taught TEXT,
        issues TEXT, homework TEXT, result TEXT, updated_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS homework (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT, type TEXT, due TEXT, note TEXT, done BOOLEAN,
        created_at TEXT, completed_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS video_metrics (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date TEXT, title TEXT, category TEXT, note TEXT,
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        comments INTEGER NOT NULL DEFAULT 0,
        favorites INTEGER NOT NULL DEFAULT 0,
        profile_visits INTEGER NOT NULL DEFAULT 0,
        inquiries INTEGER NOT NULL DEFAULT 0,
        store_visits INTEGER NOT NULL DEFAULT 0,
        sales INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        direct_messages INTEGER NOT NULL DEFAULT 0,
        price_inquiries INTEGER NOT NULL DEFAULT 0,
        address_inquiries INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS timeline_events (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date TEXT, title TEXT, detail TEXT, type TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ai_conversations (
        id UUID PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        role TEXT, content TEXT, date TEXT
      )`
    ];
    for (const sql of statements) await pool.query(sql);
  }

  async load() {
    await this._ensureSchema();
    const pool = this._poolOrCreate();
    const clientsRes = await pool.query(
      'SELECT id, name, area, industry, status, service_type, basic, ai_notes, created_at, updated_at FROM clients ORDER BY created_at DESC NULLS LAST, id'
    );

    const [interviews, plans, contents, trainings, tasks, metrics, timeline, chats] = await Promise.all([
      pool.query('SELECT * FROM interviews'),
      pool.query('SELECT * FROM operation_plans'),
      pool.query('SELECT * FROM contents'),
      pool.query('SELECT * FROM trainings'),
      pool.query('SELECT * FROM homework'),
      pool.query('SELECT * FROM video_metrics'),
      pool.query('SELECT * FROM timeline_events'),
      pool.query('SELECT * FROM ai_conversations')
    ]);

    const group = (rows) => {
      const map = {};
      for (const r of rows) (map[r.client_id] ||= []).push(r);
      return map;
    };
    const iv = group(interviews.rows);
    const pl = group(plans.rows);
    const ct = group(contents.rows);
    const tr = group(trainings.rows);
    const tk = group(tasks.rows);
    const me = group(metrics.rows);
    const tl = group(timeline.rows);
    const ch = group(chats.rows);

    const clients = clientsRes.rows.map((row) => {
      const basic = row.basic && typeof row.basic === 'object' ? row.basic : {};
      const strategy = {};
      for (const p of pl[row.id] || []) strategy[p.field_key] = p.content;

      const interviewAnswers = {};
      for (const r of iv[row.id] || []) {
        interviewAnswers[r.qkey] = {
          answer: r.answer || '',
          done: !!r.done,
          important: !!r.important,
          contentIdea: !!r.content_idea,
          followUp: !!r.follow_up
        };
      }

      const content = (ct[row.id] || []).map((r) => ({
        id: r.id, status: r.status, category: r.category, title: r.title,
        purpose: r.purpose, hook: r.hook, script: r.script, shots: r.shots,
        cover: r.cover, notes: r.notes, publishDate: r.publish_date,
        views: r.views, updatedAt: r.updated_at
      }));

      const training = (tr[row.id] || []).map((r) => ({
        id: r.id, no: r.no, goal: r.goal, date: r.date, completed: !!r.completed,
        shot: r.shot, taught: r.taught, issues: r.issues, homework: r.homework,
        result: r.result, updatedAt: r.updated_at
      }));

      const tasks = (tk[row.id] || []).map((r) => ({
        id: r.id, title: r.title, type: r.type, due: r.due, note: r.note,
        done: !!r.done, createdAt: r.created_at, completedAt: r.completed_at
      }));

      const metrics = (me[row.id] || []).map((r) => {
        const m = {
          id: r.id, date: r.date, title: r.title, category: r.category, note: r.note
        };
        for (const f of METRIC_FIELDS) m[f] = r[f] == null ? 0 : Number(r[f]);
        return m;
      });

      const timeline = (tl[row.id] || []).map((r) => ({
        id: r.id, date: r.date, title: r.title, detail: r.detail, type: r.type
      }));

      const chat = (ch[row.id] || []).map((r) => ({
        id: r.id, role: r.role, content: r.content, date: r.date
      }));

      return normalizeClient({
        id: row.id,
        name: row.name,
        area: row.area,
        industry: row.industry,
        status: row.status,
        serviceType: row.service_type,
        createdAt: row.created_at,
        basic,
        strategy,
        interviewAnswers,
        content,
        training,
        tasks,
        metrics,
        timeline,
        chat,
        aiNotes: row.ai_notes
      });
    });

    const updatedAt = clientsRes.rows.reduce((max, r) => {
      if (!r.updated_at) return max;
      return max && max > r.updated_at ? max : r.updated_at;
    }, null);

    return { version: VERSION, clients, updatedAt };
  }

  async save(state) {
    await this._ensureSchema();
    const normalized = normalizeState(state);
    const pool = this._poolOrCreate();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const nowIso = new Date().toISOString();
      for (const c of normalized.clients) {
        const basic = c.basic && typeof c.basic === 'object' ? c.basic : {};
        await client.query(
          `INSERT INTO clients
            (id, name, area, industry, status, service_type, basic, ai_notes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
            name=EXCLUDED.name, area=EXCLUDED.area, industry=EXCLUDED.industry,
            status=EXCLUDED.status, service_type=EXCLUDED.service_type,
            basic=EXCLUDED.basic, ai_notes=EXCLUDED.ai_notes,
            updated_at=EXCLUDED.updated_at`,
          [c.id, c.name || '', c.area || '', c.industry || '', c.status || '意向',
           c.serviceType || '3000培训陪跑', JSON.stringify(basic), c.aiNotes || '',
           c.createdAt || nowIso, nowIso]
        );

        await client.query('DELETE FROM interviews WHERE client_id=$1', [c.id]);
        for (const [qkey, v] of Object.entries(c.interviewAnswers || {})) {
          await client.query(
            `INSERT INTO interviews (id, client_id, qkey, answer, done, important, content_idea, follow_up)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [uuid(), c.id, qkey, v.answer || '', !!v.done, !!v.important, !!v.contentIdea, !!v.followUp]
          );
        }

        await client.query('DELETE FROM operation_plans WHERE client_id=$1', [c.id]);
        for (const [k, val] of Object.entries(c.strategy || {})) {
          await client.query(
            'INSERT INTO operation_plans (id, client_id, field_key, content) VALUES ($1,$2,$3,$4)',
            [uuid(), c.id, k, val == null ? '' : String(val)]
          );
        }

        await client.query('DELETE FROM contents WHERE client_id=$1', [c.id]);
        for (const it of c.content || []) {
          await client.query(
            `INSERT INTO contents (id, client_id, status, category, title, purpose, hook, script, shots, cover, notes, publish_date, views, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [it.id, c.id, it.status, it.category, it.title, it.purpose, it.hook, it.script,
             it.shots, it.cover, it.notes, it.publishDate, it.views, it.updatedAt]
          );
        }

        await client.query('DELETE FROM trainings WHERE client_id=$1', [c.id]);
        for (const t of c.training || []) {
          await client.query(
            `INSERT INTO trainings (id, client_id, no, goal, date, completed, shot, taught, issues, homework, result, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [t.id, c.id, t.no, t.goal, t.date, !!t.completed, t.shot, t.taught, t.issues,
             t.homework, t.result, t.updatedAt]
          );
        }

        await client.query('DELETE FROM homework WHERE client_id=$1', [c.id]);
        for (const t of c.tasks || []) {
          await client.query(
            `INSERT INTO homework (id, client_id, title, type, due, note, done, created_at, completed_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [t.id, c.id, t.title, t.type, t.due, t.note, !!t.done, t.createdAt, t.completedAt]
          );
        }

        await client.query('DELETE FROM video_metrics WHERE client_id=$1', [c.id]);
        for (const m of c.metrics || []) {
          const vals = METRIC_FIELDS.map((f) => (m[f] == null ? 0 : Number(m[f])));
          await client.query(
            `INSERT INTO video_metrics
              (id, client_id, date, title, category, note,
               views, likes, comments, favorites, profile_visits, inquiries, store_visits, sales,
               shares, direct_messages, price_inquiries, address_inquiries)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
            [m.id, c.id, m.date, m.title, m.category, m.note, ...vals]
          );
        }

        await client.query('DELETE FROM timeline_events WHERE client_id=$1', [c.id]);
        for (const e of c.timeline || []) {
          await client.query(
            'INSERT INTO timeline_events (id, client_id, date, title, detail, type) VALUES ($1,$2,$3,$4,$5,$6)',
            [e.id, c.id, e.date, e.title, e.detail, e.type]
          );
        }

        await client.query('DELETE FROM ai_conversations WHERE client_id=$1', [c.id]);
        for (const m of c.chat || []) {
          await client.query(
            'INSERT INTO ai_conversations (id, client_id, role, content, date) VALUES ($1,$2,$3,$4,$5)',
            [m.id, c.id, m.role, m.content, m.date]
          );
        }
      }
      await client.query('COMMIT');
      return { ok: true, updatedAt: nowIso };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this._pool) await this._pool.end();
    this._pool = null;
  }
}

function uuid() {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

async function createStore(env = {}) {
  const store = env.DATABASE_URL
    ? new PostgresStore(env)
    : new FileStore(env.DATA_FILE || path.join(__dirname, '..', 'data', 'crm.json'));
  // Warm up (validates connection and creates schema for Postgres).
  await store.load();
  return store;
}

module.exports = {
  FileStore,
  PostgresStore,
  createStore,
  emptyState,
  normalizeClient,
  normalizeState,
  BASIC_FIELDS,
  STRATEGY_FIELDS,
  METRIC_FIELDS,
  VERSION
};
