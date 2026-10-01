'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { FileStore, normalizeState, normalizeClient, METRIC_FIELDS } = require('../lib/store');
const { toClientsCsv } = require('../lib/csv');

function fullClient(id) {
  return {
    id,
    name: '王记川菜馆',
    area: '河北石家庄',
    industry: '川菜馆',
    status: '进行中',
    serviceType: '3000培训陪跑',
    createdAt: '2026-10-01T08:00:00.000Z',
    basic: {
      person: '王老板', products: '水煮鱼 88 元', goal: '到店成交', problem: '没流量',
      advantages: '老师傅 20 年', targetAudience: '周边上班族', competitors: '隔壁火锅',
      accountStatus: '新号', equipment: 'iPhone', execution: '每周 2 天', family: '夫妻经营',
      history: '以前做厨师'
    },
    strategy: {
      diagnosis: '缺定位', positioning: '石家庄川菜老师傅', persona: '实在老板',
      targetAudience: '上班族', packaging: '昵称：王记川菜', contentPillars: '人设+同城',
      firstBatch: '3 条', stageGoal: '先测人设', notes: ''
    },
    interviewAnswers: {
      '0-0': { answer: '开店 12 年', done: true, important: true, contentIdea: false, followUp: true },
      '4-7': { answer: '最大亏损 30 万', done: false, important: false, contentIdea: true, followUp: false }
    },
    content: [
      {
        id: 'c1', status: '已发布', category: '人设', title: '我从厨师到开店',
        purpose: '立人设', hook: '开店 12 年', script: '完整口播……', shots: '门头+炒菜',
        cover: '封面标题', notes: '', publishDate: '2026-10-02', views: '12000',
        updatedAt: '2026-10-01T09:00:00.000Z'
      }
    ],
    training: [
      {
        id: 't1', no: 1, goal: '完成样板', date: '2026-10-03', completed: true,
        shot: '拍了人设', taught: '口播', issues: '忘词', homework: '拍 1 条', result: '还行',
        updatedAt: '2026-10-01T10:00:00.000Z'
      }
    ],
    tasks: [
      {
        id: 'k1', title: '交第一条作业', type: '客户作业', due: '2026-10-05', note: '',
        done: false, createdAt: '2026-10-01T08:00:00.000Z', completedAt: null
      }
    ],
    metrics: [
      {
        id: 'm1', date: '2026-10-02', title: '人设视频', category: '人设', note: '',
        views: 12000, likes: 300, comments: 40, favorites: 80, profileVisits: 200,
        inquiries: 15, storeVisits: 3, sales: 1, shares: 10, directMessages: 5,
        priceInquiries: 4, addressInquiries: 6
      }
    ],
    timeline: [
      { id: 'tl1', date: '2026-10-01T08:00:00.000Z', title: '建档', detail: '', type: '建档' }
    ],
    chat: [
      { id: 'ch1', role: 'user', content: '下一步做什么', date: '2026-10-01T08:30:00.000Z' },
      { id: 'ch2', role: 'assistant', content: '先补人设', date: '2026-10-01T08:31:00.000Z' }
    ],
    aiNotes: '客户想做抖音但怕出镜'
  };
}

test('normalizeState 补齐缺失字段', () => {
  const s = normalizeState({ clients: [{ id: 'x', name: 'A' }] });
  assert.equal(s.version, 1);
  assert.deepEqual(s.clients[0].content, []);
  assert.deepEqual(s.clients[0].basic, {});
});

test('FileStore 保存后再用新实例读取，数据完整（模拟重启）', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-'));
  const file = path.join(dir, 'crm.json');
  const c1 = fullClient('client-1');
  const state = { version: 1, clients: [c1], updatedAt: null };

  const store1 = new FileStore(file);
  await store1.save(state);

  // 用全新实例读取，模拟服务器重启。
  const store2 = new FileStore(file);
  const loaded = await store2.load();

  assert.equal(loaded.clients.length, 1);
  const got = loaded.clients[0];
  assert.equal(got.name, '王记川菜馆');
  assert.deepEqual(got.basic, c1.basic);
  assert.deepEqual(got.strategy, c1.strategy);
  assert.deepEqual(got.interviewAnswers, c1.interviewAnswers);
  assert.deepEqual(got.content, c1.content);
  assert.deepEqual(got.training, c1.training);
  assert.deepEqual(got.tasks, c1.tasks);
  assert.deepEqual(got.metrics, c1.metrics);
  assert.deepEqual(got.timeline, c1.timeline);
  assert.deepEqual(got.chat, c1.chat);
  assert.equal(got.aiNotes, c1.aiNotes);

  // 12 个数据指标字段都保留。
  for (const f of METRIC_FIELDS) assert.equal(got.metrics[0][f], c1.metrics[0][f], f);
});

test('FileStore 覆盖保存为幂等，不产生孤儿数据', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-'));
  const file = path.join(dir, 'crm.json');
  const store = new FileStore(file);
  await store.save({ version: 1, clients: [fullClient('a')], updatedAt: null });
  await store.save({ version: 1, clients: [fullClient('b')], updatedAt: null });
  const loaded = await store.load();
  assert.equal(loaded.clients.length, 1);
  assert.equal(loaded.clients[0].id, 'b');
});

test('CSV 导出包含表头、客户名称和 BOM', () => {
  const csv = toClientsCsv({ clients: [fullClient('c1')] });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('客户名称'));
  assert.ok(csv.includes('王记川菜馆'));
  assert.ok(csv.includes('3000培训陪跑'));
});

test('CSV 对包含逗号/引号的字段正确转义', () => {
  const c = fullClient('c1');
  c.name = '王记,川菜"总店"';
  const csv = toClientsCsv({ clients: [c] });
  assert.ok(csv.includes('"王记,川菜""总店"""'));
});
