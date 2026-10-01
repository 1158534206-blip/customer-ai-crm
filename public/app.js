const App = (() => {
  let state = { version: 1, clients: [], updatedAt: null };
  let config = { authRequired:false, authed:true, aiEnabled:false, model:'' };
  let currentView = 'dashboard';
  let currentClientId = null;
  let currentTab = 'overview';
  let saveTimer = null;

  const interviewGroups = [
    ['基础身份与经营背景', [
      '客户/门店全称是什么？目前经营地址在哪里？','老板今年多大？谁是主要出镜人？','这家店/这个项目做多久了？','老板进入这个行业之前做什么？','为什么从以前的行业转到现在？','现在是自己干、夫妻干、合伙还是员工团队？','目前有几家店/几个经营点？','一天/一周/一个月大概什么营业状态？','现在主要靠什么方式来客：老客、熟人、自然进店、团购、抖音、微信、转介绍？'
    ]],
    ['产品、价格与利润', [
      '主营产品/服务全部有哪些？','哪个产品销量最好？为什么？','哪个产品利润最高？','哪个产品最想重点推？','哪个产品虽然卖得多但不挣钱？','客单价大概多少？','顾客第一次最容易买什么？','复购最高的产品是什么？','哪些产品适合做引流？','哪些产品适合做利润？','有什么套餐、组合、附加服务？','顾客最容易嫌贵的是哪个产品？','老板自己最有信心推荐的是哪个产品？为什么？'
    ]],
    ['目标客户与真实需求', [
      '最主要客户年龄多大？男女比例？','他们来自本地哪些区域？','是年轻人、家庭、学生、老板、工人还是农村客户？','顾客一般因为什么需求来？','顾客决定购买前最担心什么？','顾客最常问的5个问题是什么？','顾客最容易误解什么？','顾客不成交最常见原因是什么？','老顾客为什么会回来？','顾客为什么不去同行家？'
    ]],
    ['竞争与差异化', [
      '周边/同城最直接的3—5个同行是谁？','同行价格比你高还是低？','同行做得最好的是哪里？','你最怕哪个同行？为什么？','同行有什么你没有的？','你有什么同行很难复制？','除了“质量好、服务好”，还有什么具体优势？','这个优势能不能现场拍出来？','有没有顾客能证明这个优势？','有没有数据、案例、实物、工艺可以证明？','你愿意为了什么坚持不降价？'
    ]],
    ['老板个人经历——人设核心', [
      '你年轻时是干什么的？','第一份工作是什么？','做过哪些行业？','第一次创业是什么时候？','为什么选择现在这行？','刚入行的时候最难的是什么？','有没有一段时间特别缺钱？','最大一次亏损是什么？','有没有被坑过？具体怎么回事？','有没有被骗过？具体怎么回事？','有没有遇到过合作伙伴的问题？','有没有一次差点不干了？','最后为什么坚持下来了？','有没有哪件事到现在还过不去？','有没有特别后悔的一件事？','有没有一个人生转折点？','你觉得自己最失败的一次是什么？','最成功/最骄傲的一次是什么？','如果重新来一次，还会干这行吗？为什么？'
    ]],
    ['家庭与人物动机', [
      '是否结婚？夫妻是否一起经营？','有几个孩子？大概多大？','家里谁最支持你？','有没有家人反对过？','做这份生意和家庭有没有直接关系？','你现在这么拼最主要为了什么？','家庭里有没有一个特别影响你的人？','有没有因为生意错过过家庭里的重要事情？','有没有夫妻一起扛过来的阶段？'
    ]],
    ['性格、原则与记忆点', [
      '别人一般怎么评价你的性格？','你是话多还是话少？','脾气直不直？','最烦哪类顾客？','最烦同行什么做法？','做生意最不能接受什么？','宁可不赚哪种钱？','你最坚持的一条原则是什么？','有没有自己的口头禅？','有没有一句经常跟顾客说的话？','遇到顾客找麻烦你一般怎么处理？','有没有一个缺点反而很适合做人设？'
    ]],
    ['真实顾客与真实故事', [
      '最老的顾客跟了多少年？','有没有一家两代/三代都是客户？','有没有一位顾客让你特别感动？','有没有很难服务但最后成了朋友的顾客？','有没有因为专业判断帮顾客省过钱/避免过坑？','有没有顾客一进门就说“你给我拿”的信任场景？','有没有印象最深的一笔订单？','有没有退货、投诉、争议最后解决好的故事？','店里每天最容易发生什么有意思的事？'
    ]],
    ['行业专业与观点素材', [
      '这个行业新人最容易踩什么坑？','消费者最容易买错什么？','行业里有哪些大家都在说、但你不同意的话？','同行最不愿意告诉顾客的事情是什么？','什么东西贵不一定好？','什么东西便宜反而不能买？','顾客最应该看哪个指标？','老板做了这么多年最大的行业变化是什么？','现在的顾客和10年前最大的区别是什么？','如果只给顾客一个建议，你会说什么？'
    ]],
    ['抖音账号与执行能力', [
      '以前有没有做过抖音？','账号发过多少条？','最高播放是哪条？','哪条视频真正带来过客户？','以前内容为什么停了？','老板愿不愿意出镜？','老板害怕镜头还是不爱说话？','手机是什么？','有没有麦克风、支架、灯？','会不会剪映基础操作？','一周能拿出几天拍？','一天能拿出多少分钟？','谁负责拍？谁负责剪？','是否愿意自己完成作业？','如果连续10条流量一般，还愿不愿意继续？'
    ]],
    ['目标与服务边界', [
      '做抖音最想要的是流量、到店、成交、咨询、直播还是个人IP？','3个月后希望看到什么具体变化？','如果只能先解决一个问题，最急的是哪个？','愿不愿意把真实经营过程拍出来？','哪些内容老板绝对不愿意公开？','哪些家庭/经历可以说，哪些不能说？','培训结束后希望自己能做到什么程度？','是否接受“先测试3—5条再调整”，而不是保证条条爆？'
    ]]
  ];

  const trainingTemplates = [
    {
      no:1,title:'第一次上门｜团队带着做，让客户看到标准',duration:'2—3小时',
      objective:'把方向讲清楚，完成1—2条样板，让客户完整看到一次“选题—文案—拍摄—剪辑—发布”的正确流程。',
      agenda:[
        '复述账号定位：用客户自己的行业解释为什么不能只发产品广告。',
        '从人设/同城/专业/真实经营里现场定1—2条题，讲清为什么选。',
        '讲最基础文案结构：3秒开头—核心问题—老板观点/答案—结尾，并现场改成老板自己的话。',
        '团队示范第一条：机位、构图、人物站位、背景、光线、收音、分句拍。',
        '补素材训练：门头、产品、手部动作、工作过程、顾客环境、特写、全景。',
        '拍完马上现场剪：删停顿、字幕、补画面、音乐音量、封面。',
        '客户自己重新拍一段/第二条，团队只纠正最明显的3个问题。',
        '客户亲手完成基础剪辑，不能只看。',
        '发布前检查标题、封面、定位、门店信息、广告味。',
        '留作业并说清验收标准。'
      ],
      teach:['手机基础拍摄与画面稳定','口播按句拍，不整段背','麦克风和收音','基础补素材','剪映导入/删减/字幕/音乐/补素材/封面','把AI文案改成老板自己会说的话'],
      homework:'客户独立完成1条：自己选当天学过的类型 → 文案先审核 → 自己拍 → 自己剪 → 交成片。',
      acceptance:['能把手机架对','口播基本完整','声音清楚','至少补3种素材','能独立删减和加字幕','知道发布前检查什么']
    },
    {
      no:2,title:'第二次上门｜先解决作业问题，再让客户多做',duration:'2—3小时',
      objective:'针对第一次真实问题纠偏，再拍1—2条不同类型内容，客户承担60%以上操作。',
      agenda:[
        '先看第一次作业，不急着讲新知识；把问题分为选题、文案、口播、画面、素材、剪辑、执行。',
        '只抓最影响成片的2—3个问题解决。',
        '同一个错误现场做“错误版 vs 正确版”。',
        '选择第一次没有测试过的内容类型，例如专业+真实经营。',
        '客户自己定机位、接麦、试光、分句口播。',
        '团队关键位置示范一次，剩下让客户自己拍。',
        '补素材由客户自己列清单并完成。',
        '剪辑让客户自己操作，团队尽量只口头指导。',
        '讲基础数据：播放不是唯一指标，还看停留、评论、主页、问地址/价格、咨询。',
        '根据执行能力决定后续更新频率。'
      ],
      teach:['自己改文案','自己列补素材清单','拍错怎么局部重拍','剪辑节奏和废话删除','封面标题抓一个核心点','从评论和顾客问题里找选题'],
      homework:'独立完成1—2条，其中至少1条从选题、AI辅助文案、拍摄、补素材到剪辑都由客户完成。',
      acceptance:['能独立完成主要拍摄流程','能自己完成主要剪辑','知道自己目前最大短板','作业执行度明显提高']
    },
    {
      no:3,title:'第三次上门｜客户独立完成，团队只纠偏',duration:'2—3小时',
      objective:'验证客户能不能自己持续做，并把三次上门形成的3—5条做第一次正式复盘。',
      agenda:[
        '复盘第二次作业，只解决还没解决的核心问题。',
        '客户自己从内容库里选题并说明为什么选。',
        '客户自己使用AI出初稿，再口语化修改。',
        '客户自己架机、收音、拍口播、拍补素材。',
        '客户自己剪、做字幕、选封面、准备发布。',
        '团队最后统一点评，不边做边接管。',
        '把三次上门3—5条放一起，看哪类数据、评论和咨询最好。',
        '选后续2—3个固定栏目，每个栏目再测试至少3条。',
        '制定线上陪跑：文案审核、成片反馈、每5条复盘。',
        '明确服务边界，避免重新变成长期代拍。'
      ],
      teach:['完整自主流程','数据复盘','固定栏目建立','线上作业方式','如何具体提问题'],
      homework:'进入线上任务制：按固定栏目持续发布，每5条统一做一次数据复盘。',
      acceptance:['客户能自己完成1条完整视频','知道账号主要拍什么','知道下一周拍什么','知道基础数据怎么看','遇到问题会先自己处理再提具体问题']
    }
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = () => new Date().toISOString();
  const fmt = d => { try { return new Date(d).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return d||''; } };
  const day = d => { try { return new Date(d).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'}); } catch { return ''; } };
  const client = () => state.clients.find(c => c.id === currentClientId);
  const text = v => v && String(v).trim() ? String(v).trim() : '—';

  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),1800); }
  async function api(url,opts={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||'请求失败'); return data;
  }
  async function load(){
    config=await api('/api/config');
    if(config.authRequired && !config.authed){ $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); return; }
    state=await api('/api/state');
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    $('#aiStatus').textContent=config.aiEnabled?`AI已连接 · ${config.model}`:'AI未配置';
    $('#aiStatus').classList.toggle('on',config.aiEnabled);
    $('#logoutBtn').classList.toggle('hidden',!config.authRequired);
    render();
  }
  function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(save,350); }
  async function save(){ await api('/api/state',{method:'PUT',body:JSON.stringify(state)}); }
  function addTimeline(c,title,detail='',type='记录'){
    c.timeline ||= [];
    c.timeline.unshift({id:uid(),date:now(),title,detail,type});
  }
  function ensureClient(c){
    c.basic ||= {}; c.strategy ||= {}; c.interviewAnswers ||= {}; c.content ||= []; c.training ||= []; c.tasks ||= []; c.metrics ||= []; c.timeline ||= []; c.chat ||= []; c.aiNotes ||= '';
    return c;
  }
  function createClient(data){
    const c=ensureClient({
      id:uid(),name:data.name||'未命名客户',area:data.area||'',industry:data.industry||'',status:data.status||'意向',serviceType:data.serviceType||'3000培训陪跑',createdAt:now(),
      basic:{person:data.person||'',products:data.products||'',goal:data.goal||'',problem:data.problem||'',advantages:data.advantages||'',targetAudience:'',competitors:'',accountStatus:'',equipment:'',execution:'',family:'',history:''},
      strategy:{diagnosis:'',positioning:'',persona:'',targetAudience:'',packaging:'',contentPillars:'',firstBatch:'',stageGoal:'',notes:''}
    });
    addTimeline(c,'建立客户档案',`${c.area}｜${c.industry}`,'建档');
    state.clients.unshift(c); currentClientId=c.id; scheduleSave(); return c;
  }

  function setPage(title,sub=''){ $('#pageTitle').innerHTML=`<h1>${esc(title)}</h1><p>${esc(sub)}</p>`; }
  function render(){
    $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    if(currentView==='dashboard') renderDashboard();
    if(currentView==='customers') currentClientId ? renderClient() : renderCustomers();
    if(currentView==='tasks') renderAllTasks();
    if(currentView==='settings') renderSettings();
  }

  function renderDashboard(){
    setPage('总控台','今天该干什么，一眼看清');
    const clients=state.clients.map(ensureClient);
    const active=clients.filter(c=>!['已结束','暂停'].includes(c.status)).length;
    const all=clients.flatMap(c=>c.tasks.map(t=>({...t,clientName:c.name,clientId:c.id})));
    const open=all.filter(t=>!t.done).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
    const overdue=open.filter(t=>t.due && t.due<new Date().toISOString().slice(0,10)).length;
    const homework=open.filter(t=>t.type==='客户作业');
    const totalContent=clients.reduce((n,c)=>n+c.content.length,0);
    const completedTraining=clients.reduce((n,c)=>n+c.training.filter(t=>t.completed).length,0);
    const visits=clients.filter(c=>c.training.some(t=>!t.completed) || c.tasks.some(t=>t.type==='培训'&&!t.done));
    const recentMetrics=clients.filter(c=>{const m=c.metrics[0];if(!m)return false;const d=String(m.date||'').slice(0,10);return d>=new Date(Date.now()-7*864e5).toISOString().slice(0,10);});
    $('#content').innerHTML=`
      <div class="grid cols4">
        <div class="card stat"><strong>${clients.length}</strong><span>全部客户</span></div>
        <div class="card stat"><strong>${active}</strong><span>进行中客户</span></div>
        <div class="card stat"><strong>${open.length}</strong><span>未完成任务 ${overdue?`· ${overdue}逾期`:''}</span></div>
        <div class="card stat"><strong>${totalContent}</strong><span>内容库条目 · ${completedTraining}次培训已记录</span></div>
      </div>
      <div class="section-head"><h2>下一步任务</h2></div>
      ${open.length?`<div class="card">${open.slice(0,8).map(t=>`<div class="task-item" data-client="${t.clientId}"><b>${esc(t.title)}</b><div class="small">${esc(t.clientName)} ${t.due?`· ${esc(t.due)}`:''} · ${esc(t.type||'任务')}</div></div>`).join('')}</div>`:`<div class="empty">当前没有未完成任务。</div>`}
      <div class="section-head"><h2>待完成作业</h2></div>
      ${homework.length?`<div class="card">${homework.slice(0,6).map(t=>`<div class="task-item" data-client="${t.clientId}"><b>${esc(t.title)}</b><div class="small">${esc(t.clientName)} ${t.due?`· 截止 ${esc(t.due)}`:''}</div></div>`).join('')}</div>`:`<div class="empty">没有待完成的客户作业。</div>`}
      <div class="grid cols2" style="margin-top:4px">
        <div class="card"><h3>最近要上门</h3>${visits.length?visits.slice(0,6).map(c=>`<div class="task-item" data-client="${c.id}"><b>${esc(c.name)}</b><div class="small">${esc(c.industry||'')} · 还有 ${3-c.training.filter(t=>t.completed).length} 次上门</div></div>`).join(''):'<div class="small">暂无待上门客户。</div>'}</div>
        <div class="card"><h3>最近有新视频数据</h3>${recentMetrics.length?recentMetrics.slice(0,6).map(c=>`<div class="task-item" data-client="${c.id}"><b>${esc(c.name)}</b><div class="small">${String(c.metrics[0].date||'').slice(0,10)} · 播放 ${esc(c.metrics[0].views||0)}</div></div>`).join(''):'<div class="small">近 7 天没有新数据录入。</div>'}</div>
      </div>
      <div class="section-head"><h2>最近客户</h2><span class="spacer"></span><button class="btn small" data-action="allClients">查看全部</button></div>
      ${clients.length?`<div class="client-grid">${clients.slice(0,8).map(clientCard).join('')}</div>`:`<div class="empty">还没有客户。先点击右上角“新增客户”，建立第一份长期档案。</div>`}
    `;
    bindCommon();
  }
  function clientCard(c){
    const last=(c.timeline||[])[0];
    return `<div class="client-card" data-client="${c.id}"><h3>${esc(c.name)}</h3><div class="meta">${esc(c.area||'未填地区')} · ${esc(c.industry||'未填行业')}</div><div class="tags"><span class="tag blue">${esc(c.serviceType)}</span><span class="tag ${c.status==='进行中'?'green':'amber'}">${esc(c.status)}</span></div><p class="small">${last?`最近：${esc(last.title)} · ${day(last.date)}`:'暂无进度记录'}</p></div>`;
  }
  function renderCustomers(){
    setPage('客户档案','每个客户都是长期工作空间，不是一次性表单');
    const cs=state.clients.map(ensureClient);
    $('#content').innerHTML=`<div class="toolbar"><input id="clientSearch" placeholder="搜索客户 / 行业 / 地区" style="max-width:360px"><span class="spacer"></span><button class="btn primary" data-action="newClient">＋ 新增客户</button></div><div class="section-head"><h2>全部客户</h2></div><div id="clientList" class="client-grid">${cs.map(clientCard).join('')}</div>`;
    $('#clientSearch')?.addEventListener('input',e=>{ const q=e.target.value.trim().toLowerCase(); $('#clientList').innerHTML=cs.filter(c=>[c.name,c.area,c.industry,c.serviceType].join(' ').toLowerCase().includes(q)).map(clientCard).join(''); bindCommon(); });
    bindCommon();
  }

  function renderClient(){
    const c=client(); if(!c){currentClientId=null;return renderCustomers()} ensureClient(c);
    setPage(c.name,`${c.area||'未填地区'} · ${c.industry||'未填行业'} · ${c.serviceType}`);
    const tabs=[['overview','客户总览'],['interview','深度访谈'],['strategy','运营规划'],['content','内容库'],['training','培训记录'],['tasks','作业/任务'],['metrics','视频数据'],['timeline','时间线'],['ai','AI运营助手']];
    $('#content').innerHTML=`
      <div class="card hero"><div class="avatar">${esc(c.name.slice(0,1))}</div><div><h2>${esc(c.name)}</h2><p>${esc(c.area||'未填地区')} · ${esc(c.industry||'未填行业')}</p><div class="tags" style="margin-top:8px"><span class="tag blue">${esc(c.serviceType)}</span><span class="tag ${c.status==='进行中'?'green':'amber'}">${esc(c.status)}</span></div></div><div class="actions"><button class="btn small" data-action="editClient">编辑档案</button><button class="btn small" data-action="backClients">返回客户列表</button></div></div>
      <div class="tabs">${tabs.map(([id,l])=>`<button class="${currentTab===id?'active':''}" data-tab="${id}">${l}</button>`).join('')}</div>
      <div id="clientTab"></div>`;
    $$('.tabs button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderClient()});
    if(currentTab==='overview') renderOverview(c);
    if(currentTab==='interview') renderInterview(c);
    if(currentTab==='strategy') renderStrategy(c);
    if(currentTab==='content') renderContent(c);
    if(currentTab==='training') renderTraining(c);
    if(currentTab==='tasks') renderClientTasks(c);
    if(currentTab==='metrics') renderMetrics(c);
    if(currentTab==='timeline') renderTimeline(c);
    if(currentTab==='ai') renderAI(c);
    bindCommon();
  }

  function renderOverview(c){
    const answered=Object.values(c.interviewAnswers).filter(v=>v.answer?.trim()).length;
    const total=interviewGroups.reduce((n,[,q])=>n+q.length,0);
    $('#clientTab').innerHTML=`
      <div class="grid cols3"><div class="card stat"><strong>${answered}/${total}</strong><span>访谈问题已记录</span></div><div class="card stat"><strong>${c.content.length}</strong><span>内容库</span></div><div class="card stat"><strong>${c.training.filter(x=>x.completed).length}/3</strong><span>核心上门培训</span></div></div>
      <div class="grid cols2" style="margin-top:16px">
        <div class="card"><h3>客户基础情况</h3><div class="kvs"><b>老板/出镜人</b><span>${esc(text(c.basic.person))}</span><b>主营</b><span>${esc(text(c.basic.products))}</span><b>客户目标</b><span>${esc(text(c.basic.goal))}</span><b>当前问题</b><span>${esc(text(c.basic.problem))}</span><b>已知优势</b><span>${esc(text(c.basic.advantages))}</span><b>目标人群</b><span>${esc(text(c.basic.targetAudience))}</span><b>竞品</b><span>${esc(text(c.basic.competitors))}</span></div></div>
        <div class="card"><h3>当前运营方向</h3><div class="kvs"><b>定位</b><span>${esc(text(c.strategy.positioning))}</span><b>人设</b><span>${esc(text(c.strategy.persona))}</span><b>内容主线</b><span>${esc(text(c.strategy.contentPillars))}</span><b>阶段目标</b><span>${esc(text(c.strategy.stageGoal))}</span></div><div class="actions" style="margin-top:14px"><button class="btn small primary" data-action="aiStrategy">让AI梳理整个规划</button><button class="btn small" data-tabjump="strategy">手动调整</button></div></div>
      </div>
      <div class="grid cols2" style="margin-top:16px">
        <div class="card"><h3>下一步待办</h3>${c.tasks.filter(t=>!t.done).slice(0,6).map(t=>`<div class="task-item"><b>${esc(t.title)}</b><div class="small">${t.due?esc(t.due):'未设日期'} · ${esc(t.type||'任务')}</div></div>`).join('')||'<div class="small">暂无任务</div>'}</div>
        <div class="card"><h3>最近时间线</h3>${c.timeline.slice(0,6).map(t=>`<div class="timeline-item"><b>${esc(t.title)}</b><div class="small">${fmt(t.date)}</div></div>`).join('')||'<div class="small">暂无记录</div>'}</div>
      </div>`;
    $$('[data-tabjump]').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tabjump;renderClient()});
    $('[data-action="aiStrategy"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据当前客户档案，先给我梳理整个运营规划：客户诊断、账号定位、人设、目标客户、账号包装、3—4条内容主线、前期3—5条样板方向、三次培训总体安排和当前最应该先补的信息。不要虚构。'),50)});
  }

  function renderInterview(c){
    const total=interviewGroups.reduce((n,[,qs])=>n+qs.length,0); const answered=Object.values(c.interviewAnswers).filter(x=>x.answer?.trim()).length;
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">第一次深度沟通问题库</h3><div class="small">已记录 ${answered}/${total}。可以现场边问边记；重要故事可标记，后续AI会优先使用。</div></div><span class="spacer"></span><button class="btn small" data-action="printInterview">打印沟通单</button></div></div>
      ${interviewGroups.map(([group,qs],gi)=>`<div class="card interview-group"><h3>${gi+1}. ${esc(group)}</h3>${qs.map((q,qi)=>{const key=`${gi}-${qi}`;const a=c.interviewAnswers[key]||{};return `<div class="question"><div class="question-head"><input type="checkbox" data-interview-done="${key}" ${a.done?'checked':''}><div class="question-title">${esc(q)}</div></div><textarea data-interview-answer="${key}" placeholder="现场记录客户回答……">${esc(a.answer||'')}</textarea><div class="question-tools"><label><input type="checkbox" data-interview-important="${key}" ${a.important?'checked':''}>重要人设/故事素材</label><label><input type="checkbox" data-interview-content="${key}" ${a.contentIdea?'checked':''}>可拍视频</label><label><input type="checkbox" data-interview-followup="${key}" ${a.followUp?'checked':''}>下次继续追问</label></div></div>`}).join('')}</div>`).join('')}
      <div class="card"><h3>沟通结束前必须拿到</h3>${['账号主要出镜人','初步人设一句话','最值得拍的3个真实故事','最值得讲的3个专业问题','2个真正的同城话题','最容易现场拍的真实场景','第一次培训准备拍哪1—2条','手机/麦克风/剪映情况','下一次上门时间和客户作业'].map(x=>`<div class="question"><label class="check">□ ${esc(x)}</label></div>`).join('')}</div>`;
    $$('[data-interview-answer]').forEach(el=>el.oninput=()=>{const k=el.dataset.interviewAnswer;c.interviewAnswers[k]||={};c.interviewAnswers[k].answer=el.value;scheduleSave()});
    $$('[data-interview-done]').forEach(el=>el.onchange=()=>{const k=el.dataset.interviewDone;c.interviewAnswers[k]||={};c.interviewAnswers[k].done=el.checked;scheduleSave()});
    $$('[data-interview-important]').forEach(el=>el.onchange=()=>{const k=el.dataset.interviewImportant;c.interviewAnswers[k]||={};c.interviewAnswers[k].important=el.checked;scheduleSave()});
    $$('[data-interview-content]').forEach(el=>el.onchange=()=>{const k=el.dataset.interviewContent;c.interviewAnswers[k]||={};c.interviewAnswers[k].contentIdea=el.checked;scheduleSave()});
    $$('[data-interview-followup]').forEach(el=>el.onchange=()=>{const k=el.dataset.interviewFollowup;c.interviewAnswers[k]||={};c.interviewAnswers[k].followUp=el.checked;scheduleSave()});
    $('[data-action="printInterview"]')?.addEventListener('click',()=>window.print());
  }

  function renderStrategy(c){
    const fields=[['diagnosis','客户诊断','当前优势、问题、机会、暂时不要做什么'],['positioning','账号定位','谁 + 在哪里 + 干什么 + 为什么值得关注'],['persona','老板人设','身份、性格、经历、专业、地区、记忆点'],['targetAudience','目标客户','不要写所有人，写真正主要人群'],['packaging','账号包装','昵称、头像、简介、封面、置顶3条、主页前9条'],['contentPillars','内容主线','建议3—4条：人设/同城/专业/真实经营等'],['firstBatch','前期3—5条','具体准备先测试什么'],['stageGoal','当前阶段目标','当前这一个阶段只解决什么'],['notes','调整记录','为什么改方向、哪些事实发生变化']];
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">整个运营规划</h3><div class="small">先定大方向，但每次执行后可以随时改，不把后面写死。</div></div><span class="spacer"></span><button class="btn small primary" data-action="genStrategy">AI重新梳理</button></div></div><div class="grid cols2">${fields.map(([k,l,p])=>`<div class="card field"><label>${l}</label><textarea data-strategy="${k}" placeholder="${esc(p)}">${esc(c.strategy[k]||'')}</textarea></div>`).join('')}</div>`;
    $$('[data-strategy]').forEach(el=>el.oninput=()=>{c.strategy[el.dataset.strategy]=el.value;scheduleSave()});
    $('[data-action="genStrategy"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据当前客户全部资料，重新梳理“整个运营规划”。请按：1客户诊断 2账号定位 3老板人设 4目标客户 5账号包装 6内容主线 7前期3—5条样板 8三次培训总体路线 9当前阶段目标 10还缺哪些关键信息。必须基于真实档案，不够的地方明确说要补。'),50)});
  }

  function renderContent(c){
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">内容策划库</h3><div class="small">每条内容从“灵感→待写→待拍→已拍→待发布→已发布→已复盘”持续记录。</div></div><span class="spacer"></span><button class="btn small primary" data-action="aiScripts">AI出3—5条</button><button class="btn small" data-action="addContent">＋ 新建内容</button></div></div>${c.content.length?c.content.map(item=>contentCard(item)).join(''):'<div class="empty">内容库还是空的。可以先让AI根据当前客户资料出3—5条，也可以手动新增。</div>'}`;
    $$('[data-content-edit]').forEach(b=>b.onclick=()=>openContentModal(c,b.dataset.contentEdit));
    $$('[data-content-delete]').forEach(b=>b.onclick=()=>{if(confirm('删除这条内容？')){c.content=c.content.filter(x=>x.id!==b.dataset.contentDelete);addTimeline(c,'删除内容条目','', '内容');scheduleSave();renderClient()}});
    $('[data-action="addContent"]')?.addEventListener('click',()=>openContentModal(c));
    $('[data-action="aiScripts"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据这个客户当前已经确认的真实资料，给我出3—5条“现在就能拍”的视频文案。优先覆盖人设、同城、专业/产品、真实经营/顾客、合适的热点/观点。每条必须包含：拍摄目的、3秒开头、完整口播、镜头和补素材、封面标题。资料不足不要编造，明确标出来。'),50)});
  }
  function contentCard(i){return `<div class="content-item"><div class="toolbar"><div><h4>${esc(i.title||'未命名内容')}</h4><div class="tags"><span class="tag">${esc(i.category||'未分类')}</span><span class="status-pill ${(i.status==='已发布'||i.status==='已复盘')?'done':'todo'}">${esc(i.status||'灵感')}</span></div></div><span class="spacer"></span><button class="btn small" data-content-edit="${i.id}">编辑</button><button class="btn small danger" data-content-delete="${i.id}">删除</button></div>${i.hook?`<p><b>开头：</b>${esc(i.hook)}</p>`:''}${i.script?`<p>${esc(i.script.slice(0,220))}${i.script.length>220?'…':''}</p>`:''}${i.publishDate?`<div class="small">发布：${esc(i.publishDate)} ${i.views?`· 播放 ${esc(i.views)}`:''}</div>`:''}</div>`}

  function renderTraining(c){
    $('#clientTab').innerHTML=`<div class="card"><h3>三次核心上门培训</h3><p class="small">3—5条样板视频直接融入三次培训。每次都是“选题→拍→边拍边教→现场剪→客户实操→留作业”。</p></div>${trainingTemplates.map(t=>trainingCard(c,t)).join('')}`;
    $$('[data-training-save]').forEach(b=>b.onclick=()=>saveTrainingFromDOM(c,Number(b.dataset.trainingSave)));
    $$('[data-training-ai]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.trainingAi);currentTab='ai';renderClient();setTimeout(()=>quickAI(`我要准备第${n}次上门。根据这个客户目前的档案、前面培训记录、作业和视频数据，给我出一份可以直接打印执行的“第${n}次上门详细教案”。必须包含：本次目标、预计时长、先沟通什么、必须问什么、当天拍哪1—2条、每条为什么拍、拍摄具体怎么教、补素材怎么教、剪辑怎么教、AI文案怎么教、客户必须自己实操什么、现场纠错点、作业、验收标准、回来后要记录什么。不要套模板，要根据这个客户当前实际情况调整。`),50)});
  }
  function trainingCard(c,t){
    const rec=c.training.find(x=>x.no===t.no)||{};
    return `<div class="card training-box"><div class="toolbar"><div><h3 style="margin:0">${esc(t.title)}</h3><div class="small">建议时长：${esc(t.duration)}</div></div><span class="spacer"></span><span class="tag ${rec.completed?'green':'amber'}">${rec.completed?'已完成':'未完成'}</span><button class="btn small" data-training-ai="${t.no}">AI生成本客户教案</button></div><p><b>标准目标：</b>${esc(t.objective)}</p><details><summary>查看标准教案</summary>${`<ol>${t.agenda.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p><b>重点教：</b>${esc(t.teach.join('、'))}</p><p><b>标准作业：</b>${esc(t.homework)}</p><p><b>验收：</b>${esc(t.acceptance.join('；'))}</p>`}</details><div class="form-grid" style="margin-top:14px"><div class="field full-row"><label>这次实际目标 / 根据客户调整</label><textarea id="tr-${t.no}-goal">${esc(rec.goal||'')}</textarea></div><div class="field"><label>上门日期</label><input id="tr-${t.no}-date" type="date" value="${esc(rec.date||'')}"></div><div class="field"><label>完成状态</label><select id="tr-${t.no}-completed"><option value="0" ${!rec.completed?'selected':''}>未完成</option><option value="1" ${rec.completed?'selected':''}>已完成</option></select></div><div class="field full-row"><label>这次实际拍了什么</label><textarea id="tr-${t.no}-shot">${esc(rec.shot||'')}</textarea></div><div class="field full-row"><label>现场实际教了什么</label><textarea id="tr-${t.no}-taught">${esc(rec.taught||'')}</textarea></div><div class="field full-row"><label>客户卡在哪里 / 现场纠错</label><textarea id="tr-${t.no}-issues">${esc(rec.issues||'')}</textarea></div><div class="field full-row"><label>留下的作业</label><textarea id="tr-${t.no}-homework">${esc(rec.homework||t.homework)}</textarea></div><div class="field full-row"><label>本次结果 / 下次重点</label><textarea id="tr-${t.no}-result">${esc(rec.result||'')}</textarea></div></div><div class="actions" style="margin-top:12px"><button class="btn primary small" data-training-save="${t.no}">保存本次培训记录</button></div></div>`;
  }
  function saveTrainingFromDOM(c,no){
    let rec=c.training.find(x=>x.no===no); if(!rec){rec={id:uid(),no};c.training.push(rec)}
    rec.goal=$(`#tr-${no}-goal`).value; rec.date=$(`#tr-${no}-date`).value; rec.completed=$(`#tr-${no}-completed`).value==='1'; rec.shot=$(`#tr-${no}-shot`).value; rec.taught=$(`#tr-${no}-taught`).value; rec.issues=$(`#tr-${no}-issues`).value; rec.homework=$(`#tr-${no}-homework`).value; rec.result=$(`#tr-${no}-result`).value; rec.updatedAt=now();
    addTimeline(c,`记录第${no}次上门培训`,[rec.shot,rec.result].filter(Boolean).join('｜'),'培训'); scheduleSave(); toast('培训记录已保存'); renderClient();
  }

  function renderClientTasks(c){
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">客户作业 / 任务</h3><div class="small">每次培训和线上陪跑都可以留任务，能看出客户执行力。</div></div><span class="spacer"></span><button class="btn small" data-action="addTask">＋ 新建任务</button></div></div>${c.tasks.length?c.tasks.map(t=>`<div class="task-item"><div class="toolbar"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-task-check="${t.id}" style="width:auto" ${t.done?'checked':''}><b style="${t.done?'text-decoration:line-through;color:#71717a':''}">${esc(t.title)}</b></label><span class="spacer"></span><button class="btn small danger" data-task-delete="${t.id}">删除</button></div><div class="small">${esc(t.type||'任务')} ${t.due?`· 截止 ${esc(t.due)}`:''}</div>${t.note?`<p class="small">${esc(t.note)}</p>`:''}</div>`).join(''):'<div class="empty">暂无任务。</div>'}`;
    $$('[data-task-check]').forEach(x=>x.onchange=()=>{const t=c.tasks.find(i=>i.id===x.dataset.taskCheck);t.done=x.checked;t.completedAt=x.checked?now():null;addTimeline(c,x.checked?'完成任务':'重新打开任务',t.title,'任务');scheduleSave();renderClient()});
    $$('[data-task-delete]').forEach(x=>x.onclick=()=>{c.tasks=c.tasks.filter(i=>i.id!==x.dataset.taskDelete);scheduleSave();renderClient()});
    $('[data-action="addTask"]')?.addEventListener('click',()=>openTaskModal(c));
  }
  function renderAllTasks(){
    setPage('待办任务','所有客户的作业、拍摄、复盘和跟进');
    const all=state.clients.flatMap(c=>ensureClient(c).tasks.map(t=>({...t,clientId:c.id,clientName:c.name}))).sort((a,b)=>(a.done-b.done)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
    $('#content').innerHTML=all.length?`<div class="card">${all.map(t=>`<div class="task-item"><div class="toolbar"><b>${esc(t.title)}</b><span class="spacer"></span><span class="tag">${esc(t.clientName)}</span></div><div class="small">${t.done?'已完成':'未完成'} ${t.due?`· ${esc(t.due)}`:''}</div></div>`).join('')}</div>`:'<div class="empty">暂无任务。</div>';
  }

  function renderMetrics(c){
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">视频数据复盘</h3><div class="small">已录入 ${c.metrics.length} 条 · 每 5 条复盘一次${c.metrics.length>0 && c.metrics.length%5===0 ? " · 已到复盘点" : ""}，不只看播放量。</div></div><span class="spacer"></span><button class="btn small primary" data-action="aiReview">AI复盘</button><button class="btn small" data-action="addMetric">＋ 录入数据</button></div></div>${c.metrics.length?`<div class="card" style="overflow:auto"><table class="metric-table"><thead><tr><th>日期</th><th>视频</th><th>类型</th><th>播放</th><th>点赞</th><th>评论</th><th>收藏</th><th>分享</th><th>私信</th><th>问价</th><th>问址</th><th>主页</th><th>咨询</th><th>到店</th><th>成交</th><th></th></tr></thead><tbody>${c.metrics.map(m=>`<tr><td>${esc(m.date||'')}</td><td>${esc(m.title||'')}</td><td>${esc(m.category||'')}</td><td>${esc(m.views||0)}</td><td>${esc(m.likes||0)}</td><td>${esc(m.comments||0)}</td><td>${esc(m.favorites||0)}</td><td>${esc(m.shares||0)}</td><td>${esc(m.directMessages||0)}</td><td>${esc(m.priceInquiries||0)}</td><td>${esc(m.addressInquiries||0)}</td><td>${esc(m.profileVisits||0)}</td><td>${esc(m.inquiries||0)}</td><td>${esc(m.storeVisits||0)}</td><td>${esc(m.sales||0)}</td><td><button class="btn small danger" data-metric-delete="${m.id}">删</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">还没有录入视频数据。</div>'}`;
    $('[data-action="addMetric"]')?.addEventListener('click',()=>openMetricModal(c));
    $$('[data-metric-delete]').forEach(b=>b.onclick=()=>{c.metrics=c.metrics.filter(x=>x.id!==b.dataset.metricDelete);scheduleSave();renderClient()});
    $('[data-action="aiReview"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据这个客户目前已经录入的视频数据、内容类型、培训记录和咨询/到店/成交情况做一次复盘。不要只看播放量。请判断：哪些内容模型有信号、哪些暂时无效、是否样本量不足、下一轮5条应该怎么测试、客户下一次培训最该补什么。'),50)});
  }

  function renderTimeline(c){
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">客户时间线</h3><div class="small">每次沟通、培训、拍摄、作业、方向调整，都按日期留下记录。</div></div><span class="spacer"></span><button class="btn small" data-action="addTimeline">＋ 新增记录</button></div></div>${c.timeline.length?`<div class="card timeline">${c.timeline.map(t=>`<div class="timeline-item"><b>${esc(t.title)}</b><div class="small">${fmt(t.date)} · ${esc(t.type||'记录')}</div>${t.detail?`<p class="small">${esc(t.detail)}</p>`:''}</div>`).join('')}</div>`:'<div class="empty">暂无时间线。</div>'}`;
    $('[data-action="addTimeline"]')?.addEventListener('click',()=>openTimelineModal(c));
  }

  function renderAI(c){
    const chat=c.chat||[];
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">AI运营助手</h3><div class="small">AI每次都会读取这个客户的档案、访谈、规划、内容、培训、任务、数据和时间线。</div></div><span class="spacer"></span><button class="btn small" data-action="clearChat">清空对话</button></div>${config.aiEnabled?`<div class="ai-banner">已连接 ${esc(config.model)}。这是独立软件里的AI助手，会自动带上当前客户记录作为上下文。</div>`:`<div class="warn-banner">AI接口还没配置。CRM记录功能可以正常用；部署时配置 OPENAI_API_KEY 后，这里就能直接在线对话。</div>`}</div>
      <div class="card chat"><div id="chatLog" class="chat-log">${chat.length?chat.map(m=>`<div class="bubble ${m.role}">${esc(m.content)}</div>`).join(''):'<div class="small">可以直接问：“下一次去这个客户那里我具体怎么执行？”、“根据今天新了解到的经历重做3条文案”、“这个客户现在方向要不要改？”</div>'}</div><div class="chat-compose"><div class="quick-actions"><button class="btn small" data-q="strategy">整个运营规划</button><button class="btn small" data-q="visit">下一次执行单</button><button class="btn small" data-q="scripts">3—5条文案</button><button class="btn small" data-q="review">数据复盘</button><button class="btn small" data-q="questions">还缺哪些信息</button></div><textarea id="chatInput" placeholder="直接和我聊这个客户现在应该怎么做……"></textarea><div class="actions" style="margin-top:8px;flex-wrap:wrap"><button id="sendAI" class="btn primary">发送</button><button class="btn" data-action="saveToProfile">保存到客户档案</button><button class="btn" data-action="saveAsContent">保存为内容选题</button><button class="btn" data-action="saveAsTraining">保存为培训计划</button></div></div></div>`;
    const log=$('#chatLog'); if(log) log.scrollTop=log.scrollHeight;
    $('#sendAI')?.addEventListener('click',()=>sendAI());
    $('#chatInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')sendAI()});
    $$('[data-q]').forEach(b=>b.onclick=()=>{
      const prompts={
        strategy:'根据这个客户当前全部真实资料，重新梳理整个运营规划：客户诊断、账号定位、人设、目标客户、账号包装、3—4条内容主线、前期3—5条、三次培训总体路线、当前阶段目标。资料不足不要编。',
        visit:'根据这个客户目前的最新进度，给我生成“下一次去客户现场”的详细打印执行单。要像教案一样：本次目标、先问什么、必须确认什么、拍哪1—2条、文案方向、镜头、拍摄培训、剪辑培训、客户实操、作业、验收和回来要记录什么。不要机械按第几次，先判断当前真实阶段。',
        scripts:'根据这个客户当前资料出3—5条现在就能拍的文案。覆盖最适合的人设、同城、专业/产品、真实经营/顾客、热点/观点；每条给完整口播、镜头、补素材、封面和目的，不编事实。',
        review:'根据现有视频、数据、咨询、培训和作业做一次运营复盘，告诉我下一轮真正应该保留、放大、停止测试什么，以及为什么。',
        questions:'看完这个客户现有档案，列出现在还缺的关键信息，按“最值得优先追问”的顺序给我。不要重复已经问清楚的。'
      }; $('#chatInput').value=prompts[b.dataset.q];
    });
    $('[data-action="clearChat"]')?.addEventListener('click',()=>{if(confirm('清空这个客户的AI对话？不会删除客户档案。')){c.chat=[];scheduleSave();renderClient()}});
    const lastAssistant=()=>{const msgs=(c.chat||[]).filter(m=>m.role==='assistant');return msgs.length?msgs[msgs.length-1].content:''};
    $('[data-action="saveToProfile"]')?.addEventListener('click',()=>{const v=lastAssistant();if(!v){toast('还没有AI回复可保存');return}c.aiNotes=(c.aiNotes?c.aiNotes+' | ':'')+'['+fmt(now())+'] AI结论: '+v;addTimeline(c,'保存AI结论到档案',v.slice(0,80),'AI');scheduleSave();toast('已保存到客户档案')});
    $('[data-action="saveAsContent"]')?.addEventListener('click',()=>{const v=lastAssistant();if(!v){toast('还没有AI回复可保存');return}c.content.unshift({id:uid(),status:'灵感',category:'',title:(v||'').trim().slice(0,40)||'未命名',script:v,updatedAt:now()});addTimeline(c,'AI生成内容选题',v.slice(0,80),'内容');scheduleSave();toast('已保存为内容选题');currentTab='content';renderClient()});
    $('[data-action="saveAsTraining"]')?.addEventListener('click',()=>{const v=lastAssistant();if(!v){toast('还没有AI回复可保存');return}c.tasks.unshift({id:uid(),title:'AI建议',type:'培训',due:'',note:v,done:false,createdAt:now(),completedAt:null});addTimeline(c,'AI生成培训计划',v.slice(0,80),'任务');scheduleSave();toast('已保存为培训计划');currentTab='tasks';renderClient()});
  }
  async function sendAI(message){
    const c=client(); if(!c)return; const input=(message||$('#chatInput')?.value||'').trim(); if(!input)return;
    if(!config.aiEnabled){toast('AI接口还没配置');return}
    c.chat.push({id:uid(),role:'user',content:input,date:now()}); scheduleSave(); renderClient();
    const history=c.chat.slice(0,-1).map(m=>({role:m.role,content:m.content}));
    try{
      const res=await api('/api/ai',{method:'POST',body:JSON.stringify({clientId:c.id,message:input,history})});
      c.chat.push({id:uid(),role:'assistant',content:res.text,date:now()}); addTimeline(c,'AI协作',input.slice(0,80),'AI'); scheduleSave(); renderClient();
    }catch(e){ c.chat.push({id:uid(),role:'assistant',content:`AI调用失败：${e.message}`,date:now()}); scheduleSave(); renderClient(); }
  }
  function quickAI(prompt){ const ta=$('#chatInput'); if(ta){ta.value=prompt;sendAI(prompt)} }

  function renderSettings(){
    setPage('设置与备份','保护客户资料，随时导出完整备份');
    $('#content').innerHTML=`<div class="grid cols2"><div class="card"><h3>系统状态</h3><div class="kvs"><b>AI</b><span>${config.aiEnabled?`已连接 ${esc(config.model)}`:'未配置 OPENAI_API_KEY'}</span><b>客户数</b><span>${state.clients.length}</span><b>最近保存</b><span>${fmt(state.updatedAt)}</span></div></div><div class="card"><h3>数据备份</h3><p class="small">建议定期导出。备份包含客户档案、访谈、文案、培训、数据、时间线和AI对话。</p><div class="actions"><button class="btn" data-action="export">导出JSON备份</button><button class="btn" data-action="exportCsv">导出CSV</button><button class="btn" data-action="import">导入备份</button><input id="importFile" type="file" accept="application/json" class="hidden"></div></div></div><div class="card"><h3>在线AI连接</h3><p>部署版本通过服务器环境变量连接 OpenAI，不把API密钥放在浏览器里。AI会把当前客户完整记录作为上下文，所以你不需要每次重新解释客户是谁。</p><div class="note-box">OPENAI_API_KEY=你的API密钥\nOPENAI_MODEL=gpt-5.6-sol\nAPP_PASSWORD=给这个软件设置的访问密码\nDATABASE_URL=PostgreSQL连接串（生产建议，重启不丢数据）</div></div>`;
    $('[data-action="export"]')?.addEventListener('click',()=>location.href='/api/export');
    $('[data-action="exportCsv"]')?.addEventListener('click',()=>location.href='/api/export/csv');
    $('[data-action="import"]')?.addEventListener('click',()=>$('#importFile').click());
    $('#importFile')?.addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());await api('/api/import',{method:'POST',body:JSON.stringify(j)});toast('导入成功');await load()}catch(err){alert('导入失败：'+err.message)}});
  }

  function bindCommon(){
    $$('[data-client]').forEach(el=>el.onclick=()=>{currentClientId=el.dataset.client;currentView='customers';currentTab='overview';render()});
    $('[data-action="allClients"]')?.addEventListener('click',()=>{currentView='customers';currentClientId=null;render()});
    $('[data-action="newClient"]')?.addEventListener('click',openClientModal);
    $('[data-action="backClients"]')?.addEventListener('click',()=>{currentClientId=null;currentTab='overview';render()});
    $('[data-action="editClient"]')?.addEventListener('click',()=>openClientModal(client()));
  }

  function openModal(title,body,onReady){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=`<div class="modal-body-inner">${body}</div>`;$('#modal').classList.remove('hidden');onReady?.()}
  function closeModal(){$('#modal').classList.add('hidden')}
  function openClientModal(existing=null){
    const c=existing?ensureClient(existing):null; const b=c?.basic||{};
    openModal(c?'编辑客户档案':'新增客户',`<div class="form-grid">
      <div class="field"><label>客户 / 门店名称</label><input id="m-name" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>所在地区</label><input id="m-area" value="${esc(c?.area||'')}"></div>
      <div class="field"><label>具体行业（自己填）</label><input id="m-industry" value="${esc(c?.industry||'')}" placeholder="冷鲜猪肉、川菜馆、轻钢别墅……"></div>
      <div class="field"><label>合作类型</label><select id="m-service">${['3000培训陪跑','代运营','咨询诊断','内容拍摄','其他'].map(x=>`<option ${c?.serviceType===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>客户状态</label><select id="m-status">${['意向','已签约','进行中','暂停','已结束'].map(x=>`<option ${c?.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>老板 / 出镜人</label><input id="m-person" value="${esc(b.person||'')}"></div>
      <div class="field full-row"><label>主营产品 / 服务 / 价格 / 利润</label><textarea id="m-products">${esc(b.products||'')}</textarea></div>
      <div class="field full-row"><label>客户想达到的结果</label><textarea id="m-goal">${esc(b.goal||'')}</textarea></div>
      <div class="field full-row"><label>当前最大问题</label><textarea id="m-problem">${esc(b.problem||'')}</textarea></div>
      <div class="field full-row"><label>已知优势 / 竞争情况</label><textarea id="m-advantages">${esc(b.advantages||'')}</textarea></div>
      <div class="field full-row"><label>目前知道的老板经历</label><textarea id="m-history">${esc(b.history||'')}</textarea></div>
      <div class="field full-row"><label>家庭 / 夫妻 / 孩子等（客户愿意说再记）</label><textarea id="m-family">${esc(b.family||'')}</textarea></div>
    </div><div class="actions" style="margin-top:16px"><button id="saveClient" class="btn primary">保存客户</button>${c?'<button id="deleteClient" class="btn danger">删除客户</button>':''}</div>`,()=>{
      $('#saveClient').onclick=()=>{
        if(c){ c.name=$('#m-name').value.trim()||c.name;c.area=$('#m-area').value.trim();c.industry=$('#m-industry').value.trim();c.serviceType=$('#m-service').value;c.status=$('#m-status').value;c.basic.person=$('#m-person').value;c.basic.products=$('#m-products').value;c.basic.goal=$('#m-goal').value;c.basic.problem=$('#m-problem').value;c.basic.advantages=$('#m-advantages').value;c.basic.history=$('#m-history').value;c.basic.family=$('#m-family').value;addTimeline(c,'更新客户档案','基础资料已调整','档案');scheduleSave(); }
        else { createClient({name:$('#m-name').value.trim(),area:$('#m-area').value.trim(),industry:$('#m-industry').value.trim(),serviceType:$('#m-service').value,status:$('#m-status').value,person:$('#m-person').value,products:$('#m-products').value,goal:$('#m-goal').value,problem:$('#m-problem').value,advantages:$('#m-advantages').value}); const nc=client();nc.basic.history=$('#m-history').value;nc.basic.family=$('#m-family').value;scheduleSave();currentView='customers';currentTab='overview'; }
        closeModal();render();
      };
      $('#deleteClient')?.addEventListener('click',()=>{if(confirm(`确定删除“${c.name}”及全部记录？`)){state.clients=state.clients.filter(x=>x.id!==c.id);currentClientId=null;scheduleSave();closeModal();render()}})
    });
  }

  function openContentModal(c,id){const i=c.content.find(x=>x.id===id)||{id:uid(),status:'灵感',category:'',title:'',purpose:'',hook:'',script:'',shots:'',cover:'',notes:'',publishDate:'',views:''};const isNew=!id;openModal(isNew?'新建内容':'编辑内容',`<div class="form-grid"><div class="field"><label>标题/选题</label><input id="co-title" value="${esc(i.title)}"></div><div class="field"><label>类型</label><input id="co-category" value="${esc(i.category)}" placeholder="人设 / 同城 / 专业 / 真实经营"></div><div class="field"><label>状态</label><select id="co-status">${['灵感','待写','待拍','已拍','待发布','已发布','已复盘'].map(x=>`<option ${i.status===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>发布日期</label><input id="co-date" type="date" value="${esc(i.publishDate||'')}"></div><div class="field full-row"><label>拍摄目的</label><textarea id="co-purpose">${esc(i.purpose)}</textarea></div><div class="field full-row"><label>3秒开头</label><textarea id="co-hook">${esc(i.hook)}</textarea></div><div class="field full-row"><label>完整口播文案</label><textarea id="co-script" style="min-height:180px">${esc(i.script)}</textarea></div><div class="field full-row"><label>镜头 / 补素材</label><textarea id="co-shots">${esc(i.shots)}</textarea></div><div class="field full-row"><label>封面标题</label><input id="co-cover" value="${esc(i.cover)}"></div><div class="field"><label>播放量</label><input id="co-views" type="number" value="${esc(i.views||'')}"></div><div class="field"><label>备注</label><input id="co-notes" value="${esc(i.notes||'')}"></div></div><div class="actions" style="margin-top:14px"><button id="co-save" class="btn primary">保存</button></div>`,()=>{$('#co-save').onclick=()=>{Object.assign(i,{title:$('#co-title').value,category:$('#co-category').value,status:$('#co-status').value,publishDate:$('#co-date').value,purpose:$('#co-purpose').value,hook:$('#co-hook').value,script:$('#co-script').value,shots:$('#co-shots').value,cover:$('#co-cover').value,views:$('#co-views').value,notes:$('#co-notes').value,updatedAt:now()});if(isNew){c.content.unshift(i);addTimeline(c,'新增内容策划',i.title,'内容')}scheduleSave();closeModal();renderClient()}})}
  function openTaskModal(c){openModal('新建任务',`<div class="form-grid"><div class="field full-row"><label>任务</label><input id="ta-title"></div><div class="field"><label>类型</label><select id="ta-type"><option>客户作业</option><option>拍摄</option><option>培训</option><option>复盘</option><option>跟进</option></select></div><div class="field"><label>截止日期</label><input id="ta-due" type="date"></div><div class="field full-row"><label>说明</label><textarea id="ta-note"></textarea></div></div><div class="actions" style="margin-top:14px"><button id="ta-save" class="btn primary">保存</button></div>`,()=>{$('#ta-save').onclick=()=>{const t={id:uid(),title:$('#ta-title').value.trim()||'未命名任务',type:$('#ta-type').value,due:$('#ta-due').value,note:$('#ta-note').value,done:false,createdAt:now()};c.tasks.unshift(t);addTimeline(c,'新增任务',t.title,'任务');scheduleSave();closeModal();renderClient()}})}
  function openMetricModal(c){openModal('录入视频数据',`<div class="form-grid"><div class="field"><label>日期</label><input id="me-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>视频/选题</label><input id="me-title"></div><div class="field"><label>内容类型</label><input id="me-cat" placeholder="人设 / 同城 / 专业 / 真实顾客"></div>${[['views','播放'],['likes','点赞'],['comments','评论'],['favorites','收藏'],['profileVisits','主页访问'],['inquiries','咨询'],['storeVisits','到店'],['sales','成交'],['shares','分享'],['directMessages','私信'],['priceInquiries','问价格'],['addressInquiries','问地址']].map(([k,l])=>`<div class="field"><label>${l}</label><input id="me-${k}" type="number" value="0"></div>`).join('')}<div class="field full-row"><label>复盘备注</label><textarea id="me-note"></textarea></div></div><div class="actions" style="margin-top:14px"><button id="me-save" class="btn primary">保存</button></div>`,()=>{$('#me-save').onclick=()=>{const m={id:uid(),date:$('#me-date').value,title:$('#me-title').value,category:$('#me-cat').value,note:$('#me-note').value};['views','likes','comments','favorites','profileVisits','inquiries','storeVisits','sales','shares','directMessages','priceInquiries','addressInquiries'].forEach(k=>m[k]=Number($(`#me-${k}`).value||0));c.metrics.unshift(m);addTimeline(c,'录入视频数据',`${m.title}｜播放${m.views}｜咨询${m.inquiries}｜到店${m.storeVisits}`,'数据');scheduleSave();closeModal();renderClient()}})}
  function openTimelineModal(c){openModal('新增时间线记录',`<div class="form-grid"><div class="field"><label>类型</label><select id="tl-type"><option>沟通</option><option>拍摄</option><option>培训</option><option>内容</option><option>数据</option><option>方向调整</option><option>其他</option></select></div><div class="field"><label>标题</label><input id="tl-title"></div><div class="field full-row"><label>详细记录</label><textarea id="tl-detail"></textarea></div></div><div class="actions" style="margin-top:14px"><button id="tl-save" class="btn primary">保存</button></div>`,()=>{$('#tl-save').onclick=()=>{addTimeline(c,$('#tl-title').value.trim()||'新增记录',$('#tl-detail').value,$('#tl-type').value);scheduleSave();closeModal();renderClient()}})}

  function initEvents(){
    $$('#nav button').forEach(b=>b.onclick=()=>{currentView=b.dataset.view; if(currentView!=='customers')currentClientId=null; render()});
    $('#quickAdd').onclick=openClientModal;
    $('#modalClose').onclick=closeModal; $('.modal-backdrop').onclick=closeModal;
    $('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
    $('#loginBtn').onclick=async()=>{try{await api('/api/login',{method:'POST',body:JSON.stringify({password:$('#loginPassword').value})});await load()}catch(e){$('#loginError').textContent=e.message}};
    $('#logoutBtn').onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});location.reload()};
    if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  return { async init(){initEvents();try{await load()}catch(e){document.body.innerHTML=`<div style="padding:30px;font-family:sans-serif"><h2>系统启动失败</h2><pre>${esc(e.message)}</pre></div>`}} };
})();
App.init();
