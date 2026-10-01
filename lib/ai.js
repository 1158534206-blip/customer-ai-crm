'use strict';

const { normalizeClient } = require('./store');

function getClientContext(client) {
  if (!client) return '当前未选择客户。';
  const c = normalizeClient(client);
  const slim = {
    id: c.id,
    name: c.name,
    area: c.area,
    industry: c.industry,
    status: c.status,
    serviceType: c.serviceType,
    basic: c.basic,
    strategy: c.strategy,
    interview: Object.entries(c.interviewAnswers || {})
      .filter(([, v]) => v && (v.answer || v.important || v.followUp))
      .map(([k, v]) => ({ key: k, answer: v.answer, important: v.important, followUp: v.followUp })),
    content: (c.content || []).slice(-40),
    training: (c.training || []).slice(-8),
    tasks: (c.tasks || []).slice(-30),
    metrics: (c.metrics || []).slice(-40),
    timeline: (c.timeline || []).slice(-40),
    aiNotes: c.aiNotes || ''
  };
  return JSON.stringify(slim, null, 2);
}

const SYSTEM_PROMPT = `你是“客户营销总控台”的AI运营助手，服务中国本地实体店、工厂、电商和个人IP客户。你的工作不是泛泛讲短视频，而是根据客户档案、真实经历、经营数据、历史拍摄和培训记录，给出可直接落地的下一步。

核心工作方式：
1. 一客一档、一客一策。流程标准化，但内容、人设、同城话题、拍法和转化按客户真实情况定制。
2. 先整体规划，再分阶段执行。不能一次性把未来30天写死。每次执行后根据新信息复盘再调整。
3. 第一次深访要挖：经营、产品利润、目标客群、竞品、老板以前行业、入行动机、创业失败、亏损、被坑被骗、最难的事、过不去的事、家庭/孩子/夫妻角色、性格、原则、口头禅、老顾客、真实订单、行业误区、账号历史、设备、出镜意愿和执行时间。不要虚构敏感或不存在的经历。
4. 3—5条样板视频直接融合在3次上门培训中。每次必须“定选题→拍摄→边拍边教→现场剪辑→客户实操→留作业”。第一次团队带着做，第二次客户做得更多，第三次尽量独立完成。
5. 首批内容优先在人设故事、同城话题、专业/产品、真实顾客/经营、热点/老板观点中挑3—5类。热点必须真实相关，不硬蹭。
6. 输出文案时必须基于档案事实；资料不足就明确写“需要补充/现场追问”，绝不编造。每条文案尽量给：开头钩子、完整口播、镜头/补素材、封面标题、拍摄目的。
7. 账号包装要考虑昵称、头像、简介、封面、置顶3条、主页前9条。
8. 数据复盘每5条为一个小周期，不只看播放，还看留存、评论、收藏、主页访问、私信、问价、问地址、到店、成交。
9. 语言：中文、直接、接地气、适合本地实体老板语境时可口语化。不要营销老师腔，不要假大空，不要为了互动机械写“评论区扣1”。
10. 用户可能让你“生成整体规划”“下一次执行单”“3—5条文案”“复盘数据”“调整人设”。优先引用客户档案和最近执行结果。
11. 如果用户更新了事实，要以最新事实为准，并指出哪些规划/文案需要跟着改。
12. 不要替用户做不可验证的夸张承诺，不保证爆款。`;

async function callAI({ message, history = [], client = null, env = {} }) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-5.6-sol';
  const baseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  if (!apiKey) throw new Error('OPENAI_API_KEY 未配置');

  const recent = (Array.isArray(history) ? history : []).slice(-12)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));

  const input = [
    { role: 'developer', content: SYSTEM_PROMPT },
    { role: 'user', content: `【当前客户完整上下文】\n${getClientContext(client)}\n\n请持续把这份档案当作本次对话依据。` },
    ...recent,
    { role: 'user', content: String(message || '') }
  ];

  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || 'AI调用失败');
  return data.output_text
    || (Array.isArray(data.output) ? data.output.flatMap((x) => x.content || []).map((x) => x.text || '').join('\n') : '')
    || '';
}

module.exports = { callAI, getClientContext, SYSTEM_PROMPT };
