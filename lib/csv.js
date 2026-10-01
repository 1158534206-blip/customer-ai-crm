'use strict';

const { normalizeClient } = require('./store');

function csvCell(v) {
  const s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toClientsCsv(state) {
  const clients = (state.clients || []).map(normalizeClient);
  const header = [
    '客户名称', '地区', '行业', '合作类型', '状态', '老板/出镜人',
    '账号定位', '一句话人设', '内容条数', '未完成任务', '视频数据条数', '培训完成次数', '最近动态'
  ];
  const rows = clients.map((c) => {
    const last = c.timeline[0];
    const doneTraining = c.training.filter((t) => t.completed).length;
    const openTasks = c.tasks.filter((t) => !t.done).length;
    return [
      c.name, c.area, c.industry, c.serviceType, c.status, c.basic.person,
      c.strategy.positioning, c.strategy.persona, c.content.length, openTasks,
      c.metrics.length, doneTraining,
      last ? `${last.title}（${String(last.date || '').slice(0, 10)}）` : ''
    ].map(csvCell).join(',');
  });
  const BOM = '\uFEFF';
  return BOM + [header.map(csvCell).join(',')].concat(rows).join('\r\n');
}

module.exports = { toClientsCsv, csvCell };
