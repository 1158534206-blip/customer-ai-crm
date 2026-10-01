
const App = (() => {
  let state = { version: 2, clients: [], updatedAt: null };
  let config = { authRequired:false, authed:true, aiEnabled:false, model:'', storage:'' };
  let currentView = 'dashboard';
  let currentClientId = null;
  let currentTab = 'overview';
  let saveTimer = null;

  const CONTENT_STATUSES = ['灵感','待写','待拍','已拍','待发布','已发布','已复盘'];

  const interviewGroups = [
    { id:'basic', title:'基础身份与经营背景', questions:[
      '客户/门店全称是什么？目前经营地址在哪里？','老板今年多大？谁是主要出镜人？','这家店/这个项目做多久了？',
      '老板进入这个行业之前做什么？','为什么从以前的行业转到现在？','现在是自己干、夫妻干、合伙还是员工团队？',
      '目前有几家店/几个经营点？','一天/一周/一个月大概什么营业状态？',
      '现在主要靠什么方式来客：老客、熟人、自然进店、团购、抖音、微信、转介绍？',
      '目前最缺的是什么：流量、客流、成交、复购、品牌还是执行能力？'
    ]},
    { id:'product', title:'产品、价格与利润', questions:[
      '主营产品/服务全部有哪些？','哪个产品销量最好？为什么？','哪个产品利润最高？','哪个产品最想重点推？',
      '哪个产品虽然卖得多但不挣钱？','客单价大概多少？','顾客第一次最容易买什么？','复购最高的产品是什么？',
      '哪些产品适合做引流？','哪些产品适合做利润？','有什么套餐、组合、附加服务？',
      '顾客最容易嫌贵的是哪个产品？','老板自己最有信心推荐的是哪个产品？为什么？',
      '产品/服务交付周期多长？','售后最麻烦的环节是什么？'
    ]},
    { id:'audience', title:'目标客户与真实需求', questions:[
      '最主要客户年龄多大？男女比例？','他们来自本地哪些区域？','是年轻人、家庭、学生、老板、工人还是农村客户？',
      '顾客一般因为什么需求来？','顾客决定购买前最担心什么？','顾客最常问的5个问题是什么？',
      '顾客最容易误解什么？','顾客不成交最常见原因是什么？','老顾客为什么会回来？','顾客为什么不去同行家？',
      '顾客什么时候最容易产生需求？','顾客最看重价格、品质、速度、服务、方便还是信任？'
    ]},
    { id:'competitor', title:'竞争对手与差异化', questions:[
      '周边/同城最直接的3—5个同行是谁？','同行价格比你高还是低？','同行做得最好的是哪里？','你最怕哪个同行？为什么？',
      '同行有什么你没有的？','你有什么同行很难复制？','除了“质量好、服务好”，还有什么具体优势？',
      '这个优势能不能现场拍出来？','有没有顾客能证明这个优势？','有没有数据、案例、实物、工艺可以证明？',
      '你愿意为了什么坚持不降价？','如果顾客只给你10秒解释为什么选你，你会说什么？'
    ]},
    { id:'history', title:'老板个人经历——人设核心', questions:[
      '你年轻时是干什么的？','第一份工作是什么？','做过哪些行业？','第一次创业是什么时候？','为什么选择现在这行？',
      '刚入行的时候最难的是什么？','有没有一段时间特别缺钱？','最大一次亏损是什么？','有没有被坑过？具体怎么回事？',
      '有没有被骗过？具体怎么回事？','有没有遇到过合作伙伴的问题？','有没有一次差点不干了？','最后为什么坚持下来了？',
      '有没有哪件事到现在还过不去？','有没有特别后悔的一件事？','有没有一个人生转折点？',
      '你觉得自己最失败的一次是什么？','最成功/最骄傲的一次是什么？','如果重新来一次，还会干这行吗？为什么？',
      '有没有一段经历特别适合让陌生人认识真实的你？'
    ]},
    { id:'family', title:'家庭、孩子与人物动机', questions:[
      '是否结婚？夫妻是否一起经营？','有几个孩子？大概多大？','家里谁最支持你？','有没有家人反对过？',
      '做这份生意和家庭有没有直接关系？','你现在这么拼最主要为了什么？','家庭里有没有一个特别影响你的人？',
      '有没有因为生意错过过家庭里的重要事情？','有没有夫妻一起扛过来的阶段？','家里人在生意里分别扮演什么角色？'
    ]},
    { id:'character', title:'性格、原则与记忆点', questions:[
      '别人一般怎么评价你的性格？','你是话多还是话少？','脾气直不直？','最烦哪类顾客？','最烦同行什么做法？',
      '做生意最不能接受什么？','宁可不赚哪种钱？','你最坚持的一条原则是什么？','有没有自己的口头禅？',
      '有没有一句经常跟顾客说的话？','遇到顾客找麻烦你一般怎么处理？','有没有一个缺点反而很适合做人设？',
      '你说话更像专业型、实在型、幽默型、直脾气型还是慢热型？'
    ]},
    { id:'customerStory', title:'真实顾客与真实故事', questions:[
      '最老的顾客跟了多少年？','有没有一家两代/三代都是客户？','有没有一位顾客让你特别感动？',
      '有没有很难服务但最后成了朋友的顾客？','有没有因为专业判断帮顾客省过钱/避免过坑？',
      '有没有顾客一进门就说“你给我拿”的信任场景？','有没有印象最深的一笔订单？',
      '有没有退货、投诉、争议最后解决好的故事？','店里每天最容易发生什么有意思的事？',
      '有没有一位顾客的故事可以拍成连续内容？'
    ]},
    { id:'expertise', title:'行业专业、误区与老板观点', questions:[
      '这个行业新人最容易踩什么坑？','消费者最容易买错什么？','行业里有哪些大家都在说、但你不同意的话？',
      '同行最不愿意告诉顾客的事情是什么？','什么东西贵不一定好？','什么东西便宜反而不能买？',
      '顾客最应该看哪个指标？','老板做了这么多年最大的行业变化是什么？','现在的顾客和10年前最大的区别是什么？',
      '如果只给顾客一个建议，你会说什么？','行业里最容易引起争议的3个话题是什么？',
      '哪些问题老板一开口就能体现专业？'
    ]},
    { id:'scene', title:'真实经营场景与可拍素材', questions:[
      '店里/工厂/工地每天固定会发生哪些事？','哪些工作过程最有画面感？','哪些产品细节一拍就能看懂差异？',
      '顾客进门后的完整流程是什么？','能不能拍制作、加工、施工、打包、发货、售后？',
      '有没有适合固定机位长期拍的区域？','哪些顾客场景可以征得同意后拍？','有没有老照片、旧工具、奖状、订单、聊天记录等故事素材？',
      '门头、环境、产品、手部动作、全景、特写分别能拍什么？'
    ]},
    { id:'douyin', title:'抖音账号、设备与执行能力', questions:[
      '以前有没有做过抖音？','账号发过多少条？','最高播放是哪条？','哪条视频真正带来过客户？','以前内容为什么停了？',
      '老板愿不愿意出镜？','老板害怕镜头还是不爱说话？','手机是什么？','有没有麦克风、支架、灯？',
      '会不会剪映基础操作？','一周能拿出几天拍？','一天能拿出多少分钟？','谁负责拍？谁负责剪？',
      '是否愿意自己完成作业？','如果连续10条流量一般，还愿不愿意继续？','客户更适合集中拍摄还是日常随手记录？'
    ]},
    { id:'goal', title:'最终目标与服务边界', questions:[
      '做抖音最想要的是流量、到店、成交、咨询、直播还是个人IP？','3个月后希望看到什么具体变化？',
      '如果只能先解决一个问题，最急的是哪个？','愿不愿意把真实经营过程拍出来？','哪些内容老板绝对不愿意公开？',
      '哪些家庭/经历可以说，哪些不能说？','培训结束后希望自己能做到什么程度？',
      '是否接受“先测试3—5条再调整”，而不是保证条条爆？','后续是希望自己做，还是希望团队继续深度参与？'
    ]}
  ];

  const strategyGroups = [
    { title:'诊断与定位', fields:[
      ['diagnosis','客户诊断','优势、问题、机会、当前最不该做什么'],
      ['positioning','账号定位','谁 + 在哪里 + 干什么 + 为什么值得关注'],
      ['personaOneLiner','一句话人设','一句话让人记住这个老板'],
      ['identityTags','身份标签','老板/老板娘/从业年限/身份'],
      ['personalityTags','性格标签','直、实在、幽默、慢热等'],
      ['experienceTags','经历标签','创业、失败、转折、家庭等'],
      ['expertiseTags','专业标签','最擅长解决什么问题'],
      ['geoTags','地域标签','大城、任丘、王屯等'],
      ['targetAudience','目标客户','不要写所有人，写真正主要人群'],
      ['coreAdvantages','核心优势','能证明、能拍出来的优势'],
      ['mainProblem','当前最大问题','当前账号/经营最需要解决的问题']
    ]},
    { title:'账号包装', fields:[
      ['nicknameSuggestion','昵称建议','昵称建议及理由'],
      ['avatarSuggestion','头像建议','真人/门头/形象方向'],
      ['bio','简介','身份 + 优势 + 服务/到店理由'],
      ['backgroundImage','背景图建议','背景图放什么'],
      ['coverStyle','封面风格','字体、位置、颜色、标题长度'],
      ['pinned1','置顶第1条','我是谁'],
      ['pinned2','置顶第2条','我凭什么'],
      ['pinned3','置顶第3条','为什么值得找我'],
      ['firstNine','主页前9条规划','前9条如何分配和排序']
    ]},
    { title:'内容方向', fields:[
      ['localDirection','同城内容方向','真正属于本地的消费/生活问题'],
      ['personaDirection','人设故事方向','经历、家庭、原则、转折'],
      ['expertiseDirection','专业内容方向','误区、选择、判断、避坑'],
      ['productDirection','产品内容方向','产品与真实场景/痛点结合'],
      ['customerDirection','真实顾客方向','顾客问题、案例、信任'],
      ['operationDirection','真实经营方向','制作、进货、施工、工作过程'],
      ['hotDirection','热点方向','节日、天气、行情、本地节点'],
      ['opinionDirection','老板观点方向','行业、价格、同行、顾客、经营观点']
    ]},
    { title:'阶段目标与调整', fields:[
      ['stageGoal','当前阶段目标','现在只解决一个或两个核心问题'],
      ['avoidNow','本阶段不要做什么','避免乱发、过度广告、过度投流等'],
      ['adjustmentNotes','后续调整备注','为什么改方向、哪些事实更新、AI建议等']
    ]}
  ];

  const trainingTemplates = [
    {
      no:1,title:'第一次上门｜团队带着做，让客户看到标准',
      objective:'把方向讲清楚，完成1—2条样板，让客户完整看到一次“选题—文案—拍摄—剪辑—发布”的正确流程。',
      plannedDuration:'2—3小时',
      plannedVideos:'1—2条：优先人设 + 同城，或根据现场最强素材调整。',
      teachWhy:'第一次不追求讲很多理论，先让客户通过真实成片理解完整流程。',
      topicTraining:'从人设/同城/专业/真实经营里现场定1—2条，并讲清为什么选。',
      copywriting:'讲3秒开头—核心问题—老板观点/答案—结尾，现场改成老板自己的话。',
      aiCopywriting:'演示如何让AI先出初稿，再删掉广告腔、套话和不真实内容。',
      phoneSettings:'竖屏、1080P、基础曝光/对焦、镜头擦干净、稳定。',
      composition:'人物不要顶头，背景干净，门店/工作环境能说明身份。',
      personPositioning:'人物站位根据背景和补素材空间调整。',
      lighting:'优先自然光/面向光源，避免背光和顶光太硬。',
      audio:'麦克风连接、试音、环境噪音检查。',
      delivery:'不要整段背稿，按句说；先自然再追求顺。',
      lineByLine:'一句一停、说错局部重拍，不整条推翻。',
      broll:'门头、产品、手部动作、工作过程、顾客环境、特写、全景至少3—6种。',
      shotDesign:'口播 + 对应真实画面，不长时间只拍一张脸。',
      demo:'团队示范第一条：从架机到拍口播、补素材、剪辑、封面和发布检查。',
      clientPractice:'客户自己重新拍一段/第二条，并亲手完成基础剪辑。',
      editingSteps:'导入→粗剪→删停顿→字幕→补画面→音乐→封面→检查导出。',
      cuttingPace:'先删废话和重复，不为了快而乱切。',
      subtitles:'自动字幕后检查错字，重点词可适当突出。',
      music:'音量低于人声，不抢口播。',
      overlay:'用当天补素材覆盖长口播，画面和话对应。',
      cover:'只突出一个核心话题，字要大、少、清楚。',
      titleTraining:'标题和封面不要完全重复，可补充地区/身份/冲突点。',
      publishSettings:'检查标题、封面、定位、门店信息、作品可见范围。',
      locationStoreInfo:'需要同城时检查定位/门店地址是否正确。',
      homework:'客户独立完成1条：自己选当天学过的类型 → 文案先审核 → 自己拍 → 自己剪 → 交成片。',
      acceptance:'能把手机架对；口播基本完整；声音清楚；至少补3种素材；能独立删减和加字幕；知道发布前检查什么。',
      nextFocus:'根据第一次作业实际问题决定，不提前写死。'
    },
    {
      no:2,title:'第二次上门｜先解决作业问题，再让客户多做',
      objective:'针对第一次真实问题纠偏，再拍1—2条不同类型内容，客户承担60%以上操作。',
      plannedDuration:'2—3小时',
      plannedVideos:'1—2条：优先测试第一次没拍过的类型，例如专业 + 真实经营/顾客。',
      teachWhy:'第二次不重新从头讲，所有教学都围绕第一次作业暴露的问题。',
      topicTraining:'先看第一次数据和作业，再选新的内容类型。',
      copywriting:'让客户自己先写/改，团队只改最影响表达的部分。',
      aiCopywriting:'客户自己输入真实资料，让AI辅助；要求客户能判断AI哪些话不能用。',
      phoneSettings:'由客户自己完成设置，团队检查。',
      composition:'让客户自己定机位，再指出问题。',
      personPositioning:'客户自己判断站位和背景。',
      lighting:'让客户自己找光，错误时现场对比。',
      audio:'客户自己接麦、试音、判断环境噪音。',
      delivery:'重点解决口播卡顿、语气假、背稿感。',
      lineByLine:'训练局部重拍和多个短句拼接。',
      broll:'客户自己列补素材清单并完成。',
      shotDesign:'训练“一句话对应一个画面”的意识。',
      demo:'只对客户最不会的2—3个环节示范。',
      clientPractice:'客户承担主要拍摄和剪辑，团队尽量只口头指导。',
      editingSteps:'客户自己操作完整流程，团队观察哪里最慢。',
      cuttingPace:'重点练删废话、删重复、保留观点。',
      subtitles:'客户自己校字幕。',
      music:'客户自己选合适音乐并控制音量。',
      overlay:'客户自己把补素材插到对应口播位置。',
      cover:'客户自己先做封面，再讨论是否一眼能看懂。',
      titleTraining:'训练从选题里提炼一个核心标题。',
      publishSettings:'客户自己完成发布前检查。',
      locationStoreInfo:'客户自己检查定位/门店。',
      homework:'独立完成1—2条，其中至少1条从选题、AI辅助文案、拍摄、补素材到剪辑都由客户完成。',
      acceptance:'能独立完成主要拍摄和剪辑；知道自己最大短板；能按要求交作业。',
      nextFocus:'第三次重点解决剩余核心问题，并验证客户能否独立完成。'
    },
    {
      no:3,title:'第三次上门｜客户独立完成，团队只纠偏',
      objective:'验证客户能不能自己持续做，并把三次上门形成的3—5条做第一次正式复盘。',
      plannedDuration:'2—3小时',
      plannedVideos:'1条完整独立实战 + 三次样板集中复盘。',
      teachWhy:'第三次重点不是继续灌知识，而是验证客户能不能自己跑通。',
      topicTraining:'客户自己从内容库选题，并说明为什么选。',
      copywriting:'客户自己完成口语化修改。',
      aiCopywriting:'客户独立使用AI，并核对事实、删套话。',
      phoneSettings:'客户独立完成。',
      composition:'客户独立完成。',
      personPositioning:'客户独立完成。',
      lighting:'客户独立判断。',
      audio:'客户独立接麦、试音。',
      delivery:'客户自己处理口播问题。',
      lineByLine:'客户自己判断何时重拍。',
      broll:'客户自己列并拍完整素材。',
      shotDesign:'客户自己设计口播和画面关系。',
      demo:'原则上不先示范，除非出现明显卡点。',
      clientPractice:'客户完整独立完成选题→文案→拍摄→补素材→剪辑→封面→发布。',
      editingSteps:'独立完成。',
      cuttingPace:'独立判断。',
      subtitles:'独立检查。',
      music:'独立处理。',
      overlay:'独立处理。',
      cover:'独立完成。',
      titleTraining:'独立完成。',
      publishSettings:'独立完成。',
      locationStoreInfo:'独立完成。',
      homework:'进入线上任务制：按固定栏目持续发布，每5条统一复盘一次。',
      acceptance:'客户能独立完成1条；知道账号主要拍什么；知道下一周拍什么；知道基础数据怎么看；遇到问题能提具体问题。',
      nextFocus:'转入线上陪跑：选题、文案审核、成片反馈、每5条复盘。'
    }
  ];

  const trainingFieldGroups = [
    { title:'培训目标', fields:[
      ['number','第几次培训','number'],['date','日期','date'],['location','地点','text'],
      ['objective','本次目标','textarea'],['plannedDuration','预计时长','text'],['actualDuration','实际时长','text'],
      ['plannedVideos','本次准备拍什么','textarea'],['actualVideos','本次实际拍了什么','textarea'],
      ['teachWhy','为什么讲这些','textarea']
    ]},
    { title:'文案与选题', fields:[
      ['topicTraining','选题训练','textarea'],['copywriting','文案讲解','textarea'],['aiCopywriting','AI文案使用','textarea']
    ]},
    { title:'拍摄教学', fields:[
      ['phoneSettings','手机设置','textarea'],['composition','构图','textarea'],['personPositioning','人物站位','textarea'],
      ['lighting','光线','textarea'],['audio','收音','textarea'],['delivery','口播','textarea'],
      ['lineByLine','分句拍摄','textarea'],['broll','补素材','textarea'],['shotDesign','镜头设计','textarea'],
      ['demo','现场示范内容','textarea'],['clientPractice','客户自己实操内容','textarea']
    ]},
    { title:'剪辑与发布', fields:[
      ['editingSteps','剪辑步骤','textarea'],['cuttingPace','删除废话/节奏','textarea'],['subtitles','字幕','textarea'],
      ['music','音乐','textarea'],['overlay','补画面','textarea'],['cover','封面','textarea'],['titleTraining','标题','textarea'],
      ['publishSettings','发布设置','textarea'],['locationStoreInfo','定位/门店信息','textarea']
    ]},
    { title:'现场问题与结果', fields:[
      ['learned','客户本次学会了什么','textarea'],['stillWeak','客户仍然不会什么','textarea'],
      ['issuesFound','现场发现的问题','textarea'],['issuesFixed','本次纠正的问题','textarea'],
      ['result','本次实际结果','textarea']
    ]},
    { title:'作业与下次计划', fields:[
      ['homework','本次作业','textarea'],['acceptance','作业验收标准','textarea'],['nextFocus','下次重点','textarea'],
      ['aiPlan','AI补充计划/建议','textarea']
    ]}
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0,10);
  const fmt = d => { if(!d)return '—'; try { return new Date(d).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return d; } };
  const dayFmt = d => { if(!d)return '—'; try { return new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}); } catch { return d; } };
  const text = v => v && String(v).trim() ? String(v).trim() : '—';
  const client = () => state.clients.find(c => c.id === currentClientId);

  async function api(url,opts={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    const ct=r.headers.get('content-type')||'';
    const data=ct.includes('json')?await r.json().catch(()=>({})):await r.text();
    if(!r.ok) throw new Error(data?.error||data||'请求失败');
    return data;
  }
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),1800)}
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,450)}
  async function save(){state.version=2;await api('/api/state',{method:'PUT',body:JSON.stringify(state)});}

  function defaultBasic(){return {
    person:'',products:'',goal:'',problem:'',advantages:'',targetAudience:'',competitors:'',
    accountStatus:'',equipment:'',execution:'',family:'',history:'',contact:'',notes:''
  }}
  function defaultStrategy(){
    const o={}; strategyGroups.forEach(g=>g.fields.forEach(([k])=>o[k]='')); return o;
  }
  function ensureClient(c){
    c.basic={...defaultBasic(),...(c.basic||{})};
    const legacyStrategy={...(c.strategy||{})};
    c.strategy={...defaultStrategy(),...legacyStrategy};
    c.migrations ||= {};
    if(!c.migrations.v2){
      if(!c.strategy.personaOneLiner && legacyStrategy.persona) c.strategy.personaOneLiner=legacyStrategy.persona;
      const legacyNotes=[];
      if(legacyStrategy.packaging) legacyNotes.push(`【V1账号包装】\n${legacyStrategy.packaging}`);
      if(legacyStrategy.contentPillars) legacyNotes.push(`【V1内容主线】\n${legacyStrategy.contentPillars}`);
      if(legacyStrategy.firstBatch) legacyNotes.push(`【V1前期3—5条】\n${legacyStrategy.firstBatch}`);
      if(legacyStrategy.notes) legacyNotes.push(`【V1调整记录】\n${legacyStrategy.notes}`);
      if(legacyNotes.length) c.strategy.adjustmentNotes=[c.strategy.adjustmentNotes,...legacyNotes].filter(Boolean).join('\n\n');
      c.migrations.v2=true;
    }
    c.interviewAnswers ||= {};
    c.customInterviewQuestions ||= [];
    c.content ||= [];
    c.training ||= [];
    c.tasks ||= [];
    c.metrics ||= [];
    c.timeline ||= [];
    c.chat ||= [];
    c.aiNotes ||= '';
    c.stage ||= '';
    c.nextAction ||= '';
    c.nextFollowUpDate ||= '';
    c.nextTrainingDate ||= '';
    c.lastFollowUpAt ||= '';
    c.reviewNotes ||= '';
    c.updatedAt ||= c.createdAt || now();
    c.content.forEach(i=>{
      i.status = CONTENT_STATUSES.includes(i.status) ? i.status : ({'待策划':'待写'}[i.status]||'灵感');
      i.purpose ||= '';i.hook||='';i.script||='';i.shots||='';i.broll||='';i.cover||='';i.publishCaption||='';i.topics||='';
      i.shootDate||='';i.publishDate||='';i.trainingId||='';i.review||='';i.nextCopy||='';i.notes||='';
    });
    c.training.forEach(t=>{
      t.id ||= uid(); t.completed=!!t.completed;
      if(!t.actualVideos && t.shot) t.actualVideos=t.shot;
      if(!t.learned && t.teach) t.learned=t.teach;
      if(!t.stillWeak && t.stuck) t.stillWeak=t.stuck;
      if(!t.title) t.title=`第${t.number||'?'}次培训`;
    });
    c.tasks.forEach(t=>{t.submitContent||='';t.submitAt||='';t.feedback||='';t.issues||='';t.nextCorrection||='';t.trainingId||='';t.assignedDate||=t.createdAt?.slice(0,10)||'';});
    return c;
  }
  function addTimeline(c,title,detail='',type='记录',date=now()){
    c.timeline ||= [];
    c.timeline.unshift({id:uid(),date,title,detail,type});
    c.lastFollowUpAt=date;
    c.updatedAt=now();
  }
  function createClient(data){
    const c=ensureClient({
      id:uid(),name:data.name||'未命名客户',area:data.area||'',industry:data.industry||'',
      status:data.status||'意向',serviceType:data.serviceType||'3000培训陪跑',createdAt:now(),
      stage:data.stage||'前期了解',nextAction:data.nextAction||'',nextFollowUpDate:'',nextTrainingDate:'',
      basic:{...defaultBasic(),person:data.person||'',products:data.products||'',goal:data.goal||'',problem:data.problem||'',advantages:data.advantages||'',history:data.history||'',family:data.family||''},
      strategy:defaultStrategy()
    });
    addTimeline(c,'建立客户档案',`${c.area||'未填地区'}｜${c.industry||'未填行业'}`,'建档');
    state.clients.unshift(c); currentClientId=c.id; scheduleSave(); return c;
  }

  async function load(){
    config=await api('/api/config');
    if(config.authRequired && !config.authed){$('#login').classList.remove('hidden');$('#app').classList.add('hidden');return}
    state=await api('/api/state');
    state.clients=(state.clients||[]).map(ensureClient);
    $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
    $('#aiStatus').textContent=config.aiEnabled?`AI已连接 · ${config.model}`:'AI未配置';
    $('#aiStatus').classList.toggle('on',config.aiEnabled);
    $('#storageStatus').textContent=`存储：${config.storage||'未知'}`;
    $('#logoutBtn').classList.toggle('hidden',!config.authRequired);
    render();
  }

  function setPage(title,sub=''){$('#pageTitle').innerHTML=`<h1>${esc(title)}</h1><p>${esc(sub)}</p>`}
  function render(){
    $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
    if(currentView==='dashboard')renderDashboard();
    if(currentView==='customers')currentClientId?renderClient():renderCustomers();
    if(currentView==='tasks')renderAllTasks();
    if(currentView==='settings')renderSettings();
  }

  function clientCard(c){
    const pending=c.tasks.filter(t=>!t.done).length;
    const next=c.nextAction||c.tasks.find(t=>!t.done)?.title||'待确定下一步';
    return `<div class="client-card" data-client="${c.id}">
      <div class="toolbar"><div><h3>${esc(c.name)}</h3><p>${esc(c.area||'未填地区')} · ${esc(c.industry||'未填行业')}</p></div><span class="spacer"></span><span class="tag ${c.status==='进行中'||c.status==='已签约'?'green':'amber'}">${esc(c.status)}</span></div>
      <div class="tags" style="margin-top:9px"><span class="tag blue">${esc(c.serviceType)}</span>${c.stage?`<span class="tag">${esc(c.stage)}</span>`:''}</div>
      <div class="client-meta"><div><b>下一步：</b>${esc(next)}</div><div><b>待办：</b>${pending} 项</div><div><b>最近跟进：</b>${esc(dayFmt(c.lastFollowUpAt||c.createdAt))}</div></div>
    </div>`;
  }
  function bindClientCards(){
    $$('[data-client]').forEach(el=>el.onclick=()=>{currentClientId=el.dataset.client;currentView='customers';currentTab='overview';render()});
  }

  function renderDashboard(){
    setPage('总控台','今天该干什么、哪些客户要跟进，一眼看清');
    const cs=state.clients.map(ensureClient);
    const active=cs.filter(c=>!['已结束','暂停'].includes(c.status)).length;
    const tasks=cs.flatMap(c=>c.tasks.map(t=>({...t,clientId:c.id,clientName:c.name}))).filter(t=>!t.done);
    const overdue=tasks.filter(t=>t.due&&new Date(t.due)<new Date(today())).length;
    const trainingSoon=cs.filter(c=>c.nextTrainingDate&&new Date(c.nextTrainingDate)>=new Date(today())).sort((a,b)=>a.nextTrainingDate.localeCompare(b.nextTrainingDate)).slice(0,6);
    const recentMetrics=cs.flatMap(c=>c.metrics.map(m=>({...m,clientName:c.name,clientId:c.id}))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);

    $('#content').innerHTML=`
      <div class="grid cols4">
        <div class="card stat"><strong>${cs.length}</strong><span>全部客户</span></div>
        <div class="card stat"><strong>${active}</strong><span>进行中客户</span></div>
        <div class="card stat"><strong>${tasks.length}</strong><span>未完成任务${overdue?` · ${overdue}逾期`:''}</span></div>
        <div class="card stat"><strong>${trainingSoon.length}</strong><span>已安排下一次培训</span></div>
      </div>
      <div class="section-head"><h2>最近客户</h2><span class="spacer"></span><button class="btn small" data-action="allClients">查看全部</button></div>
      ${cs.length?`<div class="client-grid">${cs.slice().sort((a,b)=>String(b.lastFollowUpAt||b.updatedAt||b.createdAt).localeCompare(String(a.lastFollowUpAt||a.updatedAt||a.createdAt))).slice(0,9).map(clientCard).join('')}</div>`:'<div class="empty">还没有客户。点击右上角“新增客户”，建立第一份长期档案。</div>'}
      <div class="grid cols2" style="margin-top:18px">
        <div class="card"><h3>最近要处理的任务</h3>${tasks.sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))).slice(0,8).map(t=>`<div class="task-item"><b>${esc(t.clientName)}｜${esc(t.title)}</b><div class="small">${esc(t.type||'任务')} · ${t.due?esc(t.due):'未设截止'}</div></div>`).join('')||'<div class="small">暂无未完成任务</div>'}</div>
        <div class="card"><h3>最近视频数据</h3>${recentMetrics.map(m=>`<div class="metric-item"><b>${esc(m.clientName)}｜${esc(m.title||'未命名视频')}</b><div class="small">${esc(m.date||'')} · 播放 ${m.views||0} · 咨询 ${m.inquiries||0} · 到店 ${m.storeVisits||0} · 成交 ${m.sales||0}</div></div>`).join('')||'<div class="small">还没有录入视频数据</div>'}</div>
      </div>`;
    bindClientCards();
    $('[data-action="allClients"]')?.addEventListener('click',()=>{currentView='customers';currentClientId=null;render()});
  }

  function renderCustomers(){
    setPage('客户档案','所有客户长期资料、进度和下一步');
    const cs=state.clients.map(ensureClient);
    $('#content').innerHTML=`
      <div class="card"><div class="toolbar"><input id="clientSearch" style="max-width:440px;width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px" placeholder="搜索客户、地区、行业、合作类型"><span class="spacer"></span><button class="btn primary" data-action="newClient">＋ 新增客户</button></div></div>
      <div id="clientList">${cs.length?`<div class="client-grid">${cs.map(clientCard).join('')}</div>`:'<div class="empty">暂无客户</div>'}</div>`;
    bindClientCards();
    $('#clientSearch')?.addEventListener('input',e=>{
      const q=e.target.value.trim().toLowerCase();
      const filtered=cs.filter(c=>[c.name,c.area,c.industry,c.serviceType,c.stage,c.status].join(' ').toLowerCase().includes(q));
      $('#clientList').innerHTML=filtered.length?`<div class="client-grid">${filtered.map(clientCard).join('')}</div>`:'<div class="empty">没有匹配客户</div>';
      bindClientCards();
    });
    $('[data-action="newClient"]')?.addEventListener('click',()=>openClientModal());
  }

  function renderClient(){
    const c=client();if(!c){currentClientId=null;return renderCustomers()}ensureClient(c);
    setPage(c.name,`${c.area||'未填地区'} · ${c.industry||'未填行业'} · ${c.serviceType}`);
    const tabs=[['overview','总览'],['profile','客户档案'],['interview','深度访谈'],['strategy','运营规划'],['content','内容库'],['training','培训'],['tasks','作业'],['metrics','视频数据'],['timeline','时间线'],['ai','AI助手']];
    $('#content').innerHTML=`
      <div class="card hero">
        <div class="avatar">${esc(c.name.slice(0,1))}</div>
        <div><h2>${esc(c.name)}</h2><p>${esc(c.area||'未填地区')} · ${esc(c.industry||'未填行业')}</p>
          <div class="tags" style="margin-top:8px"><span class="tag blue">${esc(c.serviceType)}</span><span class="tag ${c.status==='进行中'||c.status==='已签约'?'green':'amber'}">${esc(c.status)}</span>${c.stage?`<span class="tag">${esc(c.stage)}</span>`:''}</div>
        </div>
        <div class="actions"><button class="btn small" data-action="editClient">编辑基础资料</button><button class="btn small" data-action="backClients">返回列表</button></div>
      </div>
      <div class="tabs">${tabs.map(([id,l])=>`<button class="${currentTab===id?'active':''}" data-tab="${id}">${l}</button>`).join('')}</div>
      <div id="clientTab"></div>`;
    $$('.tabs button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderClient()});
    if(currentTab==='overview')renderOverview(c);
    if(currentTab==='profile')renderProfile(c);
    if(currentTab==='interview')renderInterview(c);
    if(currentTab==='strategy')renderStrategy(c);
    if(currentTab==='content')renderContent(c);
    if(currentTab==='training')renderTraining(c);
    if(currentTab==='tasks')renderClientTasks(c);
    if(currentTab==='metrics')renderMetrics(c);
    if(currentTab==='timeline')renderTimeline(c);
    if(currentTab==='ai')renderAI(c);
    $('[data-action="editClient"]')?.addEventListener('click',()=>openClientModal(c));
    $('[data-action="backClients"]')?.addEventListener('click',()=>{currentClientId=null;currentTab='overview';render()});
  }

  function renderOverview(c){
    const answers=Object.values(c.interviewAnswers).filter(v=>v.answer?.trim()).length;
    const total=interviewGroups.reduce((n,g)=>n+g.questions.length,0)+c.customInterviewQuestions.length;
    const pending=c.tasks.filter(t=>!t.done);
    const latestMetric=c.metrics[0];
    $('#clientTab').innerHTML=`
      <div class="grid cols4">
        <div class="card stat"><strong>${answers}/${total}</strong><span>访谈已记录</span></div>
        <div class="card stat"><strong>${c.content.length}</strong><span>内容库</span></div>
        <div class="card stat"><strong>${c.training.filter(x=>x.completed).length}</strong><span>已完成培训</span></div>
        <div class="card stat"><strong>${pending.length}</strong><span>待完成作业/任务</span></div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>当前状态</h3>
        <div class="summary-grid">
          <div class="summary-cell"><b>目前做到哪一步</b><span>${esc(text(c.stage))}</span></div>
          <div class="summary-cell"><b>下一步该干什么</b><span>${esc(text(c.nextAction))}</span></div>
          <div class="summary-cell"><b>最近一次跟进</b><span>${esc(fmt(c.lastFollowUpAt||c.createdAt))}</span></div>
          <div class="summary-cell"><b>下次跟进</b><span>${esc(dayFmt(c.nextFollowUpDate))}</span></div>
          <div class="summary-cell"><b>下次培训</b><span>${esc(dayFmt(c.nextTrainingDate))}</span></div>
          <div class="summary-cell"><b>最近视频表现</b><span>${latestMetric?`播放 ${latestMetric.views||0}｜咨询 ${latestMetric.inquiries||0}｜到店 ${latestMetric.storeVisits||0}｜成交 ${latestMetric.sales||0}`:'暂无数据'}</span></div>
        </div>
        <div class="actions" style="margin-top:12px"><button class="btn small" data-action="editStatus">调整当前状态</button><button class="btn small primary" data-action="askNext">让AI给下一步</button></div>
      </div>
      <div class="grid cols2" style="margin-top:16px">
        <div class="card"><h3>客户核心资料</h3><div class="kvs">
          <b>老板/出镜人</b><span>${esc(text(c.basic.person))}</span>
          <b>主营</b><span>${esc(text(c.basic.products))}</span>
          <b>目标</b><span>${esc(text(c.basic.goal))}</span>
          <b>问题</b><span>${esc(text(c.basic.problem))}</span>
          <b>优势</b><span>${esc(text(c.basic.advantages))}</span>
        </div></div>
        <div class="card"><h3>当前运营方向</h3><div class="kvs">
          <b>定位</b><span>${esc(text(c.strategy.positioning))}</span>
          <b>一句话人设</b><span>${esc(text(c.strategy.personaOneLiner))}</span>
          <b>核心优势</b><span>${esc(text(c.strategy.coreAdvantages))}</span>
          <b>阶段目标</b><span>${esc(text(c.strategy.stageGoal))}</span>
        </div><div class="actions" style="margin-top:12px"><button class="btn small" data-action="jumpStrategy">打开运营规划</button></div></div>
      </div>
      <div class="grid cols2" style="margin-top:16px">
        <div class="card"><h3>待完成作业</h3>${pending.slice(0,6).map(t=>`<div class="task-item"><b>${esc(t.title)}</b><div class="small">${t.due?`截止 ${esc(t.due)}`:'未设截止'} · ${esc(t.type||'任务')}</div></div>`).join('')||'<div class="small">暂无待办</div>'}</div>
        <div class="card"><h3>最近时间线</h3>${c.timeline.slice(0,6).map(t=>`<div class="timeline-item"><b>${esc(t.title)}</b><div class="small">${fmt(t.date)} · ${esc(t.type)}</div></div>`).join('')||'<div class="small">暂无记录</div>'}</div>
      </div>`;
    $('[data-action="editStatus"]')?.addEventListener('click',()=>openStatusModal(c));
    $('[data-action="askNext"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据这个客户现在的档案、最近培训、未完成作业、最近视频数据和时间线，告诉我“下一次最应该做什么”。请按：本次目标、现场顺序、要问的问题、要拍的内容、要教的拍摄/剪辑、客户实操、作业、回来后要记录什么，给我一份可直接执行的清单。'),40)});
    $('[data-action="jumpStrategy"]')?.addEventListener('click',()=>{currentTab='strategy';renderClient()});
  }

  function renderProfile(c){
    const fields=[
      ['person','老板 / 出镜人','年龄、性格、从业年限、谁出镜'],
      ['products','主营产品 / 服务 / 价格 / 利润','尽量记录最好卖、利润品、引流品'],
      ['goal','客户最终目标','同城流量、到店、成交、咨询、直播、IP、学会自己做'],
      ['problem','当前最大问题','经营、账号、内容、执行问题'],
      ['advantages','已知优势 / 特殊资源','必须尽量具体、可证明'],
      ['targetAudience','目标人群','年龄、地区、身份、消费场景'],
      ['competitors','竞品 / 同行','主要同行、价格、优劣势'],
      ['accountStatus','账号现状','粉丝、历史内容、最好数据、标签'],
      ['equipment','设备情况','手机、麦克风、支架、灯、剪辑软件'],
      ['execution','执行能力与时间','谁拍、谁剪、一周能做多少'],
      ['history','老板经历','以前行业、入行、失败、亏损、被坑被骗、转折'],
      ['family','家庭 / 夫妻 / 孩子','客户愿意说再记'],
      ['contact','联系方式 / 其他业务信息','可选'],
      ['notes','其他长期备注','任何后续需要长期保留的信息']
    ];
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">客户长期档案</h3><div class="small">后面了解到的新信息随时补充，自动保存。</div></div></div></div><div class="grid cols2">${fields.map(([k,l,p])=>`<div class="card field"><label>${esc(l)}</label><textarea data-basic="${k}" placeholder="${esc(p)}">${esc(c.basic[k]||'')}</textarea></div>`).join('')}</div>`;
    $$('[data-basic]').forEach(el=>el.oninput=()=>{c.basic[el.dataset.basic]=el.value;c.updatedAt=now();scheduleSave()});
  }

  function questionKey(groupId,index){return `${groupId}:${index}`}
  function renderInterview(c){
    const answered=Object.values(c.interviewAnswers).filter(v=>v.answer?.trim()).length;
    const total=interviewGroups.reduce((n,g)=>n+g.questions.length,0)+c.customInterviewQuestions.length;
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar">
        <div><h3 style="margin:0">第一次客户深度访谈</h3><div class="small">已记录 ${answered}/${total}。现场边聊边记，可标记“重要 / 可拍视频 / 下次追问”。</div></div>
        <span class="spacer"></span><button class="btn small" data-action="aiQuestions">AI推荐下一批问题</button><button class="btn small" data-action="addQuestion">＋ 自定义问题</button><button class="btn small" data-action="printInterview">打印</button>
      </div></div>
      <div class="note-box">不要像审问。先聊生意，再聊经历；客户愿意展开的地方继续追问“当时发生了什么、为什么、最后怎么解决”。家庭和敏感经历以客户愿意说为前提。</div>
      ${interviewGroups.map((g,gi)=>`<div class="card interview-group"><h3>${gi+1}. ${esc(g.title)}</h3>${g.questions.map((q,qi)=>renderQuestion(c,questionKey(g.id,qi),q)).join('')}</div>`).join('')}
      ${c.customInterviewQuestions.length?`<div class="card interview-group"><h3>自定义追问</h3>${c.customInterviewQuestions.map((q,qi)=>renderQuestion(c,`custom:${q.id}`,q.text,true,q.id)).join('')}</div>`:''}
      <div class="card"><h3>沟通结束前必须确认</h3>${['账号主要出镜人是谁','初步人设一句话','最值得拍的3个真实故事','最值得讲的3个专业问题','2个真正的同城话题','最容易现场拍到的真实场景','第一次培训准备拍哪1—2条','客户手机/麦克风/剪映情况','下一次上门时间和客户作业'].map(x=>`<div class="question"><div class="question-title">□ ${esc(x)}</div></div>`).join('')}</div>`;
    bindInterview(c);
    $('[data-action="printInterview"]')?.addEventListener('click',()=>window.print());
    $('[data-action="addQuestion"]')?.addEventListener('click',()=>openCustomQuestionModal(c));
    $('[data-action="aiQuestions"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据这个客户目前已经回答的深度访谈和空缺信息，给我下一批最值得继续追问的10—15个问题。不要重复已经问清楚的；优先挖能影响账号定位、人设、3—5条首拍文案和培训方式的信息。'),40)});
  }
  function renderQuestion(c,key,q,custom=false,customId=''){
    const a=c.interviewAnswers[key]||{};
    return `<div class="question">
      <div class="question-head"><input type="checkbox" data-qdone="${esc(key)}" ${a.done?'checked':''}><div class="question-title">${esc(q)}</div>${custom?`<span class="spacer"></span><button class="btn small danger" data-delq="${esc(customId)}">删除</button>`:''}</div>
      <textarea data-qanswer="${esc(key)}" placeholder="现场记录客户回答……">${esc(a.answer||'')}</textarea>
      <div class="question-tools">
        <label><input type="checkbox" data-qimportant="${esc(key)}" ${a.important?'checked':''}>重要</label>
        <label><input type="checkbox" data-qcontent="${esc(key)}" ${a.contentIdea?'checked':''}>可拍视频</label>
        <label><input type="checkbox" data-qfollow="${esc(key)}" ${a.followUp?'checked':''}>下次追问</label>
      </div>
    </div>`;
  }
  function bindInterview(c){
    $$('[data-qanswer]').forEach(el=>el.oninput=()=>updateAnswer(c,el.dataset.qanswer,'answer',el.value));
    $$('[data-qdone]').forEach(el=>el.onchange=()=>updateAnswer(c,el.dataset.qdone,'done',el.checked));
    $$('[data-qimportant]').forEach(el=>el.onchange=()=>updateAnswer(c,el.dataset.qimportant,'important',el.checked));
    $$('[data-qcontent]').forEach(el=>el.onchange=()=>updateAnswer(c,el.dataset.qcontent,'contentIdea',el.checked));
    $$('[data-qfollow]').forEach(el=>el.onchange=()=>updateAnswer(c,el.dataset.qfollow,'followUp',el.checked));
    $$('[data-delq]').forEach(b=>b.onclick=()=>{c.customInterviewQuestions=c.customInterviewQuestions.filter(x=>x.id!==b.dataset.delq);delete c.interviewAnswers[`custom:${b.dataset.delq}`];scheduleSave();renderClient()});
  }
  function updateAnswer(c,key,field,value){c.interviewAnswers[key]||={};c.interviewAnswers[key][field]=value;c.interviewAnswers[key].updatedAt=now();c.updatedAt=now();scheduleSave()}

  function renderStrategy(c){
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">整个运营规划</h3><div class="small">字段拆开长期保存；可以自己改，也可以让AI基于最新档案重做。</div></div><span class="spacer"></span><button class="btn small primary" data-action="genStrategy">AI梳理整个规划</button></div></div>
      <div class="strategy-group">${strategyGroups.map((g,i)=>`<details ${i===0?'open':''}><summary>${esc(g.title)} <span class="small">(${g.fields.length}项)</span></summary><div class="details-body"><div class="grid cols2">${g.fields.map(([k,l,p])=>`<div class="field"><label>${esc(l)}</label><textarea data-strategy="${k}" placeholder="${esc(p)}">${esc(c.strategy[k]||'')}</textarea></div>`).join('')}</div></div></details>`).join('')}</div>`;
    $$('[data-strategy]').forEach(el=>el.oninput=()=>{c.strategy[el.dataset.strategy]=el.value;c.updatedAt=now();scheduleSave()});
    $('[data-action="genStrategy"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('请根据当前客户全部真实资料，重新梳理“整个运营规划”。必须按这些板块输出：客户诊断、账号定位、一句话人设、身份/性格/经历/专业/地域标签、目标客户、核心优势、最大问题、昵称/头像/简介/背景图/封面、置顶3条、主页前9条、同城/人设/专业/产品/真实顾客/真实经营/热点/老板观点8个内容方向、当前阶段目标、本阶段不要做什么。资料不足的地方明确写待补，不要编。'),40)});
  }

  function renderContent(c){
    const grouped=CONTENT_STATUSES.map(s=>[s,c.content.filter(i=>i.status===s)]);
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">内容策划库</h3><div class="small">每条从灵感到复盘长期记录，AI文案也能保存进来。</div></div><span class="spacer"></span><button class="btn small primary" data-action="aiScripts">AI出3—5条</button><button class="btn small" data-action="addContent">＋ 新建内容</button></div></div>
      ${grouped.map(([s,items])=>`<div class="card"><div class="toolbar"><h3 style="margin:0">${esc(s)}</h3><span class="tag">${items.length}</span></div><div style="margin-top:10px">${items.length?items.map(contentCard).join(''):'<div class="small">暂无</div>'}</div></div>`).join('')}`;
    $$('[data-content-edit]').forEach(b=>b.onclick=()=>openContentModal(c,b.dataset.contentEdit));
    $$('[data-content-delete]').forEach(b=>b.onclick=()=>{if(confirm('删除这条内容？')){c.content=c.content.filter(x=>x.id!==b.dataset.contentDelete);addTimeline(c,'删除内容',b.dataset.contentDelete,'内容');scheduleSave();renderClient()}});
    $('[data-action="addContent"]')?.addEventListener('click',()=>openContentModal(c));
    $('[data-action="aiScripts"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('根据当前客户已确认的真实资料，给我3—5条现在就能拍的视频。优先覆盖人设、同城、专业/产品、真实经营/顾客、合适的热点/观点。每条给：拍摄目的、3秒开头、完整口播、镜头设计、补素材、封面标题、发布文案建议。不要虚构经历。'),40)});
  }
  function contentCard(i){
    return `<div class="content-item"><div class="toolbar"><div><h4>${esc(i.title||'未命名内容')}</h4><div class="tags"><span class="tag">${esc(i.category||'未分类')}</span>${i.trainingId?'<span class="tag blue">关联培训</span>':''}</div></div><span class="spacer"></span><button class="btn small" data-content-edit="${i.id}">编辑</button><button class="btn small danger" data-content-delete="${i.id}">删除</button></div>
      ${i.hook?`<p><b>开头：</b>${esc(i.hook)}</p>`:''}
      ${i.script?`<p>${esc(i.script.slice(0,260))}${i.script.length>260?'…':''}</p>`:''}
      <div class="small">${i.shootDate?`拍摄 ${esc(i.shootDate)} · `:''}${i.publishDate?`发布 ${esc(i.publishDate)} · `:''}${i.review?'已写复盘':''}</div>
    </div>`;
  }

  function renderTraining(c){
    const ordered=c.training.slice().sort((a,b)=>(Number(a.number)||99)-(Number(b.number)||99)||String(a.date||'').localeCompare(String(b.date||'')));
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">上门培训与实际记录</h3><div class="small">标准教案只是起点，每次实际记录要根据客户上一次结果调整。</div></div><span class="spacer"></span><button class="btn small" data-action="viewTemplates">查看标准三次教案</button><button class="btn small primary" data-action="newTraining">＋ 新建培训</button></div></div>
      ${ordered.length?ordered.map(t=>trainingCard(t)).join(''):'<div class="empty">还没有培训记录。可以从标准教案创建第一次培训。</div>'}`;
    $$('[data-training-edit]').forEach(b=>b.onclick=()=>openTrainingModal(c,b.dataset.trainingEdit));
    $$('[data-training-delete]').forEach(b=>b.onclick=()=>{if(confirm('删除这次培训记录？')){c.training=c.training.filter(x=>x.id!==b.dataset.trainingDelete);scheduleSave();renderClient()}});
    $('[data-action="newTraining"]')?.addEventListener('click',()=>openTrainingChoice(c));
    $('[data-action="viewTemplates"]')?.addEventListener('click',()=>openTrainingTemplates());
  }
  function trainingCard(t){
    return `<div class="training-card"><div class="toolbar"><div><h4>${esc(t.title||`第${t.number||'?'}次培训`)}</h4><div class="small">${esc(t.date||'未定日期')} ${t.location?`· ${esc(t.location)}`:''} · ${t.completed?'已完成':'计划中'}</div></div><span class="spacer"></span><button class="btn small" data-training-edit="${t.id}">打开教案/记录</button><button class="btn small danger" data-training-delete="${t.id}">删除</button></div>
      <div class="kvs" style="margin-top:10px"><b>本次目标</b><span>${esc(text(t.objective))}</span><b>实际拍摄</b><span>${esc(text(t.actualVideos))}</span><b>客户仍不会</b><span>${esc(text(t.stillWeak))}</span><b>下次重点</b><span>${esc(text(t.nextFocus))}</span></div></div>`;
  }

  function renderClientTasks(c){
    const pending=c.tasks.filter(t=>!t.done);
    const done=c.tasks.filter(t=>t.done);
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">客户作业 / 任务</h3><div class="small">记录客户提交、你的反馈、主要问题和下一次纠正点。</div></div><span class="spacer"></span><button class="btn small primary" data-action="addTask">＋ 布置作业</button></div></div>
      <div class="grid cols2">
        <div class="card"><h3>待完成 / 逾期</h3>${pending.length?pending.map(taskCard).join(''):'<div class="small">暂无待完成作业</div>'}</div>
        <div class="card"><h3>已完成</h3>${done.length?done.slice(0,12).map(taskCard).join(''):'<div class="small">暂无已完成作业</div>'}</div>
      </div>`;
    $$('[data-task-edit]').forEach(b=>b.onclick=()=>openTaskModal(c,b.dataset.taskEdit));
    $$('[data-task-toggle]').forEach(b=>b.onclick=()=>{const t=c.tasks.find(x=>x.id===b.dataset.taskToggle);if(t){t.done=!t.done;if(t.done&&!t.submitAt)t.submitAt=now();addTimeline(c,t.done?'完成作业':'重新打开作业',t.title,'作业');scheduleSave();renderClient()}});
    $$('[data-task-delete]').forEach(b=>b.onclick=()=>{if(confirm('删除这条作业？')){c.tasks=c.tasks.filter(x=>x.id!==b.dataset.taskDelete);scheduleSave();renderClient()}});
    $('[data-action="addTask"]')?.addEventListener('click',()=>openTaskModal(c));
  }
  function taskCard(t){
    const overdue=!t.done&&t.due&&new Date(t.due)<new Date(today());
    return `<div class="task-item"><div class="toolbar"><div><b>${esc(t.title)}</b><div class="small">${esc(t.type||'客户作业')} · ${t.due?`截止 ${esc(t.due)}`:'未设截止'}${overdue?' · 已逾期':''}</div></div><span class="spacer"></span><button class="btn small" data-task-edit="${t.id}">编辑</button><button class="btn small" data-task-toggle="${t.id}">${t.done?'重新打开':'标记完成'}</button><button class="btn small danger" data-task-delete="${t.id}">删除</button></div>${t.issues?`<div class="small" style="margin-top:8px">主要问题：${esc(t.issues)}</div>`:''}</div>`;
  }

  function renderMetrics(c){
    const ms=c.metrics.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const last5=ms.slice(0,5);
    const sums=last5.reduce((o,m)=>{['views','likes','comments','favorites','shares','profileVisits','messages','priceAsks','addressAsks','inquiries','storeVisits','sales'].forEach(k=>o[k]=(o[k]||0)+Number(m[k]||0));return o},{});
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">视频数据</h3><div class="small">每5条做一次小复盘，不只看播放。</div></div><span class="spacer"></span><button class="btn small primary" data-action="addMetric">＋ 录入视频数据</button><button class="btn small" data-action="aiReview">AI复盘最近5条</button></div></div>
      ${last5.length?`<div class="card"><h3>最近 ${last5.length} 条合计</h3><div class="metric-grid">${metricKeys().map(([k,l])=>`<div class="metric-box"><b>${l}</b><span>${sums[k]||0}</span></div>`).join('')}</div></div>`:''}
      ${ms.length?ms.map(metricCard).join(''):'<div class="empty">还没有视频数据。</div>'}`;
    $$('[data-metric-edit]').forEach(b=>b.onclick=()=>openMetricModal(c,b.dataset.metricEdit));
    $$('[data-metric-delete]').forEach(b=>b.onclick=()=>{if(confirm('删除这条数据？')){c.metrics=c.metrics.filter(x=>x.id!==b.dataset.metricDelete);scheduleSave();renderClient()}});
    $('[data-action="addMetric"]')?.addEventListener('click',()=>openMetricModal(c));
    $('[data-action="aiReview"]')?.addEventListener('click',()=>{currentTab='ai';renderClient();setTimeout(()=>quickAI('请只重点分析这个客户最近5条视频数据，并结合内容类型判断：1 哪类内容更值得继续 2 哪类只是播放高但没转化 3 哪类播放一般但咨询/到店好 4 下一轮3—5条怎么安排 5 还缺哪些数据。不要只讲通用道理。'),40)});
  }
  function metricKeys(){return [['views','播放'],['likes','点赞'],['comments','评论'],['favorites','收藏'],['shares','分享'],['profileVisits','主页访问'],['messages','私信'],['priceAsks','问价'],['addressAsks','问地址'],['inquiries','咨询'],['storeVisits','到店'],['sales','成交']]}
  function metricCard(m){
    return `<div class="metric-item"><div class="toolbar"><div><b>${esc(m.title||'未命名视频')}</b><div class="small">${esc(m.date||'')} · ${esc(m.category||'未分类')}</div></div><span class="spacer"></span><button class="btn small" data-metric-edit="${m.id}">编辑</button><button class="btn small danger" data-metric-delete="${m.id}">删除</button></div><div class="metric-grid">${metricKeys().map(([k,l])=>`<div class="metric-box"><b>${l}</b><span>${Number(m[k]||0)}</span></div>`).join('')}</div>${m.review?`<div class="small" style="margin-top:10px">复盘：${esc(m.review)}</div>`:''}</div>`;
  }

  function renderTimeline(c){
    $('#clientTab').innerHTML=`<div class="card"><div class="toolbar"><div><h3 style="margin:0">客户时间线</h3><div class="small">沟通、拍摄、培训、作业、数据、方向调整都按日期记录。</div></div><span class="spacer"></span><button class="btn small primary" data-action="addTimeline">＋ 新增记录</button></div></div>
      ${c.timeline.length?c.timeline.map(t=>`<div class="timeline-item"><div class="toolbar"><div><b>${esc(t.title)}</b><div class="small">${fmt(t.date)} · ${esc(t.type||'记录')}</div></div></div>${t.detail?`<div style="margin-top:7px;white-space:pre-wrap;font-size:13px">${esc(t.detail)}</div>`:''}</div>`).join(''):'<div class="empty">暂无时间线记录</div>'}`;
    $('[data-action="addTimeline"]')?.addEventListener('click',()=>openTimelineModal(c));
  }

  function renderAI(c){
    const history=c.chat||[];
    $('#clientTab').innerHTML=`
      <div class="card"><div class="toolbar"><div><h3 style="margin:0">AI运营助手</h3><div class="small">${config.aiEnabled?'AI会自动带上当前客户档案、访谈、规划、最近内容、培训、作业、数据和时间线。':'服务器还没有配置 DEEPSEEK_API_KEY。'}</div></div><span class="spacer"></span><button class="btn small danger" data-action="clearChat">清空对话</button></div></div>
      <div class="quick-prompts">
        ${['整个运营规划','下一次执行单','出3—5条文案','根据访谈梳理人设','复盘最近5条数据','下一次培训教案'].map(x=>`<button class="btn small" data-prompt="${esc(x)}">${esc(x)}</button>`).join('')}
      </div>
      <div class="chat-wrap">
        <div id="chatLog" class="chat-log">${history.length?history.map((m,i)=>chatMessage(m,i)).join(''):'<div class="small">直接在这里聊当前客户，不用每次重新介绍。</div>'}</div>
        <div class="chat-input"><textarea id="aiInput" placeholder="例如：明天第二次去这个客户，我具体按什么顺序执行？"></textarea><button id="aiSend" class="btn primary">发送</button></div>
      </div>`;
    const log=$('#chatLog');if(log)log.scrollTop=log.scrollHeight;
    $('#aiSend')?.addEventListener('click',sendAI);
    $('#aiInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendAI()}});
    $$('[data-prompt]').forEach(b=>b.onclick=()=>quickAI(promptText(b.dataset.prompt)));
    $$('[data-save-ai]').forEach(b=>b.onclick=()=>openSaveAIResult(c,Number(b.dataset.saveAi)));
    $('[data-action="clearChat"]')?.addEventListener('click',()=>{if(confirm('清空这个客户的AI对话？')){c.chat=[];scheduleSave();renderClient()}});
  }
  function promptText(x){
    const map={
      '整个运营规划':'根据这个客户当前全部真实资料，给我重新梳理整个运营规划。字段要覆盖：诊断、定位、一句话人设、核心优势、目标客户、账号包装、置顶3条、主页前9条、8类内容方向、当前阶段目标和本阶段不要做什么。资料不足要明确。',
      '下一次执行单':'根据这个客户最近一次培训、作业、视频数据和时间线，给我下一次去现场的详细执行单：目标、先问什么、现场拍什么、每条怎么拍、教什么、客户自己练什么、作业、验收和回来后记录什么。',
      '出3—5条文案':'根据这个客户现在已经确认的真实资料，给我3—5条能直接拍的文案，覆盖最适合的人设/同城/专业/真实经营/观点。每条给开头、完整口播、镜头、补素材、封面。不要编。',
      '根据访谈梳理人设':'只根据这个客户已经记录的深度访谈，帮我提炼：一句话人设、身份标签、性格标签、经历标签、专业标签、最有价值的3个故事、最值得继续追问的5个问题。',
      '复盘最近5条数据':'分析最近5条视频数据和内容类型，告诉我哪些模型值得复制、哪些只有播放没转化、下一轮3—5条怎么排。',
      '下一次培训教案':'根据这个客户现在的学习进度、上次培训记录和作业问题，生成下一次详细培训教案：预计时长、目标、拍哪几条、选题/文案/拍摄/剪辑具体教什么、客户实操、作业、验收标准。'
    };return map[x]||x;
  }
  function chatMessage(m,i){
    return `<div class="msg ${m.role==='assistant'?'assistant':'user'}">${esc(m.content)}${m.role==='assistant'?`<div class="msg-tools"><button class="btn small" data-save-ai="${i}">保存到客户模块</button></div>`:''}</div>`;
  }
  async function sendAI(){
    const input=$('#aiInput');const msg=input.value.trim();if(!msg)return;input.value='';await quickAI(msg);
  }
  async function quickAI(msg){
    const c=client();if(!c)return;
    c.chat.push({role:'user',content:msg,date:now()});scheduleSave();renderClient();
    const log=$('#chatLog');if(log){log.innerHTML+=`<div class="msg assistant" id="thinking">正在结合客户档案分析……</div>`;log.scrollTop=log.scrollHeight}
    try{
      const history=c.chat.slice(0,-1);
      const r=await api('/api/ai',{method:'POST',body:JSON.stringify({clientId:c.id,message:msg,history})});
      c.chat.push({role:'assistant',content:r.text,date:now()});scheduleSave();renderClient();
    }catch(e){
      c.chat.push({role:'assistant',content:`AI调用失败：${e.message}`,date:now()});scheduleSave();renderClient();
    }
  }

  function renderAllTasks(){
    setPage('待办任务','跨客户查看所有作业、拍摄、培训和跟进');
    const all=state.clients.flatMap(c=>c.tasks.map(t=>({...t,clientId:c.id,clientName:c.name}))).sort((a,b)=>Number(a.done)-Number(b.done)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
    $('#content').innerHTML=`<div class="card"><h3>全部任务</h3>${all.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>客户</th><th>任务</th><th>类型</th><th>截止</th><th>状态</th></tr></thead><tbody>${all.map(t=>`<tr data-open-client="${t.clientId}"><td>${esc(t.clientName)}</td><td>${esc(t.title)}</td><td>${esc(t.type||'')}</td><td>${esc(t.due||'—')}</td><td>${t.done?'已完成':(t.due&&new Date(t.due)<new Date(today())?'逾期':'待完成')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="small">暂无任务</div>'}</div>`;
    $$('[data-open-client]').forEach(r=>r.onclick=()=>{currentClientId=r.dataset.openClient;currentView='customers';currentTab='tasks';render()});
  }

  function renderSettings(){
    setPage('设置与备份','备份客户资料、查看AI和存储状态');
    $('#content').innerHTML=`
      <div class="grid cols2">
        <div class="card"><h3>系统状态</h3><div class="kvs"><b>存储方式</b><span>${esc(config.storage||'未知')}</span><b>AI状态</b><span>${config.aiEnabled?`已连接 · ${esc(config.model)}`:'未配置 DEEPSEEK_API_KEY'}</span><b>登录保护</b><span>${config.authRequired?'已开启':'未设置 APP_PASSWORD'}</span><b>数据更新时间</b><span>${esc(fmt(state.updatedAt))}</span></div></div>
        <div class="card"><h3>备份与恢复</h3><p class="small">建议定期下载JSON备份。导入会用备份覆盖当前数据。</p><div class="actions"><a class="btn" href="/api/export">下载JSON备份</a><button class="btn" data-action="import">导入备份</button></div><input id="importFile" class="hidden" type="file" accept=".json,application/json"></div>
      </div>
      <div class="card"><h3>生产环境建议</h3><ul><li>Railway 上配置 PostgreSQL，并让服务获得 DATABASE_URL。</li><li>设置 APP_PASSWORD，避免知道网址的人直接看到客户资料。</li><li>DEEPSEEK_API_KEY 只放服务器环境变量，不放前端。</li><li>即使使用 PostgreSQL，也建议定期下载JSON备份。</li></ul></div>`;
    $('[data-action="import"]')?.addEventListener('click',()=>$('#importFile').click());
    $('#importFile')?.addEventListener('change',async e=>{
      const f=e.target.files[0];if(!f)return;if(!confirm('导入会覆盖当前全部客户数据，确定继续？'))return;
      const txt=await f.text();const data=JSON.parse(txt);await api('/api/import',{method:'POST',body:JSON.stringify(data)});toast('导入成功');await load();
    });
  }

  function openModal(title,body,onReady){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=`<div class="modal-body-inner">${body}</div>`;$('#modal').classList.remove('hidden');onReady?.()}
  function closeModal(){$('#modal').classList.add('hidden')}

  function openClientModal(existing=null){
    const c=existing?ensureClient(existing):null,b=c?.basic||{};
    openModal(c?'编辑客户基础资料':'新增客户',`<div class="form-grid">
      <div class="field"><label>客户 / 门店名称</label><input id="m-name" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>所在地区</label><input id="m-area" value="${esc(c?.area||'')}"></div>
      <div class="field full-row"><label>具体行业（自己填写）</label><input id="m-industry" value="${esc(c?.industry||'')}" placeholder="冷鲜猪肉、川菜馆、轻钢别墅、眉形设计、农机服务……"></div>
      <div class="field"><label>合作类型</label><select id="m-service">${['3000培训陪跑','代运营','咨询诊断','内容拍摄','其他'].map(x=>`<option ${c?.serviceType===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>客户状态</label><select id="m-status">${['意向','已签约','进行中','暂停','已结束'].map(x=>`<option ${c?.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>当前阶段</label><input id="m-stage" value="${esc(c?.stage||'前期了解')}" placeholder="前期了解 / 第一次培训 / 线上陪跑"></div>
      <div class="field"><label>老板 / 出镜人</label><input id="m-person" value="${esc(b.person||'')}"></div>
      <div class="field full-row"><label>主营产品 / 服务 / 价格 / 利润</label><textarea id="m-products">${esc(b.products||'')}</textarea></div>
      <div class="field full-row"><label>客户想达到的结果</label><textarea id="m-goal">${esc(b.goal||'')}</textarea></div>
      <div class="field full-row"><label>当前最大问题</label><textarea id="m-problem">${esc(b.problem||'')}</textarea></div>
      <div class="field full-row"><label>已知优势 / 竞争情况</label><textarea id="m-advantages">${esc(b.advantages||'')}</textarea></div>
      <div class="field full-row"><label>目前知道的老板经历</label><textarea id="m-history">${esc(b.history||'')}</textarea></div>
      <div class="field full-row"><label>家庭 / 夫妻 / 孩子等</label><textarea id="m-family">${esc(b.family||'')}</textarea></div>
    </div><div class="actions" style="margin-top:16px"><button id="saveClient" class="btn primary">保存客户</button>${c?'<button id="deleteClient" class="btn danger">删除客户</button>':''}</div>`,()=>{
      $('#saveClient').onclick=()=>{
        if(c){
          c.name=$('#m-name').value.trim()||c.name;c.area=$('#m-area').value.trim();c.industry=$('#m-industry').value.trim();c.serviceType=$('#m-service').value;c.status=$('#m-status').value;c.stage=$('#m-stage').value;
          c.basic.person=$('#m-person').value;c.basic.products=$('#m-products').value;c.basic.goal=$('#m-goal').value;c.basic.problem=$('#m-problem').value;c.basic.advantages=$('#m-advantages').value;c.basic.history=$('#m-history').value;c.basic.family=$('#m-family').value;
          addTimeline(c,'更新客户基础档案','基础资料已调整','档案');scheduleSave();
        }else{
          createClient({name:$('#m-name').value.trim(),area:$('#m-area').value.trim(),industry:$('#m-industry').value.trim(),serviceType:$('#m-service').value,status:$('#m-status').value,stage:$('#m-stage').value,person:$('#m-person').value,products:$('#m-products').value,goal:$('#m-goal').value,problem:$('#m-problem').value,advantages:$('#m-advantages').value,history:$('#m-history').value,family:$('#m-family').value});
          currentView='customers';currentTab='overview';
        }
        closeModal();render();
      };
      $('#deleteClient')?.addEventListener('click',()=>{if(confirm(`确定删除“${c.name}”及全部记录？`)){state.clients=state.clients.filter(x=>x.id!==c.id);currentClientId=null;scheduleSave();closeModal();render()}});
    });
  }

  function openStatusModal(c){
    openModal('调整客户当前状态',`<div class="form-grid">
      <div class="field"><label>目前阶段</label><input id="st-stage" value="${esc(c.stage||'')}"></div>
      <div class="field"><label>下次跟进日期</label><input id="st-follow" type="date" value="${esc(c.nextFollowUpDate||'')}"></div>
      <div class="field"><label>下次培训日期</label><input id="st-train" type="date" value="${esc(c.nextTrainingDate||'')}"></div>
      <div class="field full-row"><label>下一步该干什么</label><textarea id="st-next">${esc(c.nextAction||'')}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="st-save" class="btn primary">保存</button></div>`,()=>{
      $('#st-save').onclick=()=>{c.stage=$('#st-stage').value;c.nextFollowUpDate=$('#st-follow').value;c.nextTrainingDate=$('#st-train').value;c.nextAction=$('#st-next').value;addTimeline(c,'调整客户当前状态',c.nextAction,'进度');scheduleSave();closeModal();renderClient()};
    });
  }

  function openCustomQuestionModal(c){
    openModal('新增自定义访谈问题',`<div class="field"><label>问题</label><textarea id="cq-text" placeholder="例如：你第一次真正觉得这个生意能做起来是什么时候？"></textarea></div><div class="actions" style="margin-top:14px"><button id="cq-save" class="btn primary">添加</button></div>`,()=>{
      $('#cq-save').onclick=()=>{const t=$('#cq-text').value.trim();if(!t)return;c.customInterviewQuestions.push({id:uid(),text:t});scheduleSave();closeModal();renderClient()};
    });
  }

  function openContentModal(c,id=null,prefill={}){
    let i=id?c.content.find(x=>x.id===id):null;const isNew=!i;
    if(!i)i={id:uid(),title:'',category:'',status:'灵感',purpose:'',hook:'',script:'',shots:'',broll:'',cover:'',publishCaption:'',topics:'',shootDate:'',publishDate:'',trainingId:'',notes:'',review:'',nextCopy:'',...prefill};
    openModal(isNew?'新建内容':'编辑内容',`<div class="form-grid">
      <div class="field"><label>选题名称</label><input id="co-title" value="${esc(i.title)}"></div>
      <div class="field"><label>内容类型</label><input id="co-category" value="${esc(i.category)}" placeholder="人设 / 同城 / 专业 / 产品 / 真实顾客"></div>
      <div class="field"><label>状态</label><select id="co-status">${CONTENT_STATUSES.map(x=>`<option ${i.status===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>对应培训</label><select id="co-training"><option value="">不关联</option>${c.training.map(t=>`<option value="${t.id}" ${i.trainingId===t.id?'selected':''}>${esc(t.title||`第${t.number}次培训`)}</option>`).join('')}</select></div>
      <div class="field full-row"><label>拍摄目的</label><textarea id="co-purpose">${esc(i.purpose)}</textarea></div>
      <div class="field full-row"><label>开头钩子</label><textarea id="co-hook">${esc(i.hook)}</textarea></div>
      <div class="field full-row"><label>完整口播</label><textarea id="co-script" style="min-height:180px">${esc(i.script)}</textarea></div>
      <div class="field full-row"><label>镜头脚本</label><textarea id="co-shots">${esc(i.shots)}</textarea></div>
      <div class="field full-row"><label>补素材清单</label><textarea id="co-broll">${esc(i.broll)}</textarea></div>
      <div class="field"><label>封面标题</label><input id="co-cover" value="${esc(i.cover)}"></div>
      <div class="field"><label>话题</label><input id="co-topics" value="${esc(i.topics)}"></div>
      <div class="field full-row"><label>发布文案</label><textarea id="co-caption">${esc(i.publishCaption)}</textarea></div>
      <div class="field"><label>拍摄日期</label><input id="co-shootdate" type="date" value="${esc(i.shootDate)}"></div>
      <div class="field"><label>发布日期</label><input id="co-publishdate" type="date" value="${esc(i.publishDate)}"></div>
      <div class="field full-row"><label>复盘</label><textarea id="co-review">${esc(i.review)}</textarea></div>
      <div class="field full-row"><label>下一条如何复制</label><textarea id="co-next">${esc(i.nextCopy)}</textarea></div>
      <div class="field full-row"><label>备注</label><textarea id="co-notes">${esc(i.notes)}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="co-save" class="btn primary">保存内容</button></div>`,()=>{
      $('#co-save').onclick=()=>{
        Object.assign(i,{
          title:$('#co-title').value.trim()||'未命名内容',category:$('#co-category').value,status:$('#co-status').value,trainingId:$('#co-training').value,
          purpose:$('#co-purpose').value,hook:$('#co-hook').value,script:$('#co-script').value,shots:$('#co-shots').value,broll:$('#co-broll').value,
          cover:$('#co-cover').value,topics:$('#co-topics').value,publishCaption:$('#co-caption').value,shootDate:$('#co-shootdate').value,publishDate:$('#co-publishdate').value,
          review:$('#co-review').value,nextCopy:$('#co-next').value,notes:$('#co-notes').value,updatedAt:now()
        });
        if(isNew){c.content.unshift(i);addTimeline(c,'新增内容策划',i.title,'内容')}
        else addTimeline(c,'更新内容',i.title,'内容');
        scheduleSave();closeModal();renderClient();
      };
    });
  }

  function openTrainingChoice(c){
    openModal('新建培训记录',`<div class="info-box">可以从标准教案一键创建，再根据这个客户实际情况修改；也可以建空白培训。</div><div class="grid cols3" style="margin-top:14px">${trainingTemplates.map(t=>`<button class="btn" data-template="${t.no}">从第${t.no}次标准教案创建</button>`).join('')}<button class="btn" data-template="0">空白培训</button></div>`,()=>{
      $$('[data-template]').forEach(b=>b.onclick=()=>{const no=Number(b.dataset.template);closeModal();openTrainingModal(c,null,no)});
    });
  }
  function openTrainingTemplates(){
    openModal('三次上门标准教案',trainingTemplates.map(t=>`<div class="training-card"><h3>${esc(t.title)}</h3><div class="kvs"><b>目标</b><span>${esc(t.objective)}</span><b>预计时长</b><span>${esc(t.plannedDuration)}</span><b>准备拍摄</b><span>${esc(t.plannedVideos)}</span><b>作业</b><span>${esc(t.homework)}</span><b>验收</b><span>${esc(t.acceptance)}</span></div></div>`).join(''));
  }
  function blankTraining(){return {id:uid(),title:'',number:'',date:'',location:'',completed:false,actualDuration:'',actualVideos:'',learned:'',stillWeak:'',issuesFound:'',issuesFixed:'',result:'',aiPlan:''}}
  function openTrainingModal(c,id=null,templateNo=0,prefill={}){
    let t=id?c.training.find(x=>x.id===id):null;const isNew=!t;
    if(!t){
      const template=trainingTemplates.find(x=>x.no===templateNo);
      t={...blankTraining(),...(template?JSON.parse(JSON.stringify(template)):{}),...prefill};
      t.id=uid();t.date=t.date||today();t.title=t.title||`培训 ${t.number||''}`;
    }
    const groups=trainingFieldGroups.map((g,i)=>`<details ${i===0?'open':''}><summary>${esc(g.title)}</summary><div class="details-body"><div class="form-grid">${g.fields.map(([k,l,type])=>{
      const v=t[k]??'';
      if(type==='textarea')return `<div class="field ${['objective','plannedVideos','actualVideos','teachWhy','demo','clientPractice','homework','acceptance','nextFocus','result','aiPlan'].includes(k)?'full-row':''}"><label>${esc(l)}</label><textarea id="tr-${k}">${esc(v)}</textarea></div>`;
      return `<div class="field"><label>${esc(l)}</label><input id="tr-${k}" type="${type}" value="${esc(v)}"></div>`;
    }).join('')}</div></div></details>`).join('');
    openModal(isNew?'新建培训教案/记录':'培训教案与实际记录',`<div class="field"><label>培训标题</label><input id="tr-title" value="${esc(t.title||'')}"></div><div class="field" style="margin-top:10px"><label class="checkline"><input id="tr-completed" type="checkbox" ${t.completed?'checked':''}> 本次培训已完成</label></div><div class="training-group" style="margin-top:14px">${groups}</div><div class="actions" style="margin-top:14px"><button id="tr-save" class="btn primary">保存培训记录</button>${!isNew?'<button id="tr-task" class="btn">把本次作业同步到作业模块</button>':''}</div>`,()=>{
      $('#tr-save').onclick=()=>{
        t.title=$('#tr-title').value.trim()||`第${$('#tr-number')?.value||'?'}次培训`;t.completed=$('#tr-completed').checked;
        trainingFieldGroups.forEach(g=>g.fields.forEach(([k])=>{const el=$(`#tr-${k}`);if(el)t[k]=el.value}));
        t.updatedAt=now();
        if(isNew){c.training.push(t);addTimeline(c,'建立培训计划',t.title,'培训')}else addTimeline(c,'更新培训记录',t.title,'培训');
        if(t.completed)addTimeline(c,'完成培训',`${t.title}${t.actualVideos?`｜拍摄：${t.actualVideos}`:''}`,'培训',t.date?new Date(`${t.date}T12:00:00`).toISOString():now());
        scheduleSave();closeModal();renderClient();
      };
      $('#tr-task')?.addEventListener('click',()=>{if(!t.homework)return toast('这次培训还没有填写作业');openTaskModal(c,null,{title:`${t.title}课后作业`,type:'客户作业',note:t.homework,trainingId:t.id,issues:t.stillWeak,nextCorrection:t.nextFocus})});
    });
  }

  function openTaskModal(c,id=null,prefill={}){
    let t=id?c.tasks.find(x=>x.id===id):null;const isNew=!t;
    if(!t)t={id:uid(),title:'',type:'客户作业',assignedDate:today(),due:'',note:'',submitContent:'',submitAt:'',done:false,feedback:'',issues:'',nextCorrection:'',trainingId:'',createdAt:now(),...prefill};
    openModal(isNew?'布置作业 / 任务':'编辑作业 / 任务',`<div class="form-grid">
      <div class="field full-row"><label>作业标题</label><input id="ta-title" value="${esc(t.title)}"></div>
      <div class="field"><label>作业类型</label><select id="ta-type">${['客户作业','拍摄','培训','复盘','跟进','其他'].map(x=>`<option ${t.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>对应培训</label><select id="ta-training"><option value="">不关联</option>${c.training.map(x=>`<option value="${x.id}" ${t.trainingId===x.id?'selected':''}>${esc(x.title||`第${x.number}次培训`)}</option>`).join('')}</select></div>
      <div class="field"><label>布置日期</label><input id="ta-assigned" type="date" value="${esc(t.assignedDate||'')}"></div>
      <div class="field"><label>截止日期</label><input id="ta-due" type="date" value="${esc(t.due||'')}"></div>
      <div class="field full-row"><label>作业说明</label><textarea id="ta-note">${esc(t.note||'')}</textarea></div>
      <div class="field full-row"><label>客户提交内容</label><textarea id="ta-submit">${esc(t.submitContent||'')}</textarea></div>
      <div class="field"><label>客户提交时间</label><input id="ta-submittime" type="datetime-local" value="${esc(t.submitAt?new Date(t.submitAt).toISOString().slice(0,16):'')}"></div>
      <div class="field"><label class="checkline"><input id="ta-done" type="checkbox" ${t.done?'checked':''}> 已完成</label></div>
      <div class="field full-row"><label>我的反馈</label><textarea id="ta-feedback">${esc(t.feedback||'')}</textarea></div>
      <div class="field full-row"><label>主要问题</label><textarea id="ta-issues">${esc(t.issues||'')}</textarea></div>
      <div class="field full-row"><label>下次需要纠正</label><textarea id="ta-next">${esc(t.nextCorrection||'')}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="ta-save" class="btn primary">保存</button></div>`,()=>{
      $('#ta-save').onclick=()=>{
        Object.assign(t,{title:$('#ta-title').value.trim()||'未命名作业',type:$('#ta-type').value,trainingId:$('#ta-training').value,assignedDate:$('#ta-assigned').value,due:$('#ta-due').value,note:$('#ta-note').value,submitContent:$('#ta-submit').value,done:$('#ta-done').checked,feedback:$('#ta-feedback').value,issues:$('#ta-issues').value,nextCorrection:$('#ta-next').value});
        const st=$('#ta-submittime').value;t.submitAt=st?new Date(st).toISOString():'';
        if(isNew){c.tasks.unshift(t);addTimeline(c,'布置作业',t.title,'作业')}else addTimeline(c,'更新作业',t.title,'作业');
        scheduleSave();closeModal();renderClient();
      };
    });
  }

  function openMetricModal(c,id=null){
    let m=id?c.metrics.find(x=>x.id===id):null;const isNew=!m;
    if(!m){m={id:uid(),date:today(),title:'',category:'',contentId:'',review:''};metricKeys().forEach(([k])=>m[k]=0)}
    openModal(isNew?'录入视频数据':'编辑视频数据',`<div class="form-grid">
      <div class="field"><label>日期</label><input id="me-date" type="date" value="${esc(m.date||'')}"></div>
      <div class="field"><label>视频 / 选题</label><input id="me-title" value="${esc(m.title||'')}"></div>
      <div class="field"><label>内容类型</label><input id="me-cat" value="${esc(m.category||'')}"></div>
      <div class="field"><label>关联内容库</label><select id="me-content"><option value="">不关联</option>${c.content.map(x=>`<option value="${x.id}" ${m.contentId===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
      ${metricKeys().map(([k,l])=>`<div class="field"><label>${esc(l)}</label><input id="me-${k}" type="number" min="0" value="${Number(m[k]||0)}"></div>`).join('')}
      <div class="field full-row"><label>复盘备注</label><textarea id="me-review">${esc(m.review||'')}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="me-save" class="btn primary">保存数据</button></div>`,()=>{
      $('#me-save').onclick=()=>{
        m.date=$('#me-date').value;m.title=$('#me-title').value.trim()||'未命名视频';m.category=$('#me-cat').value;m.contentId=$('#me-content').value;m.review=$('#me-review').value;
        metricKeys().forEach(([k])=>m[k]=Number($(`#me-${k}`).value||0));
        if(isNew){c.metrics.unshift(m);addTimeline(c,'录入视频数据',`${m.title}｜播放${m.views}｜咨询${m.inquiries}｜到店${m.storeVisits}｜成交${m.sales}`,'数据')}else addTimeline(c,'更新视频数据',m.title,'数据');
        scheduleSave();closeModal();renderClient();
      };
    });
  }

  function openTimelineModal(c,prefill={}){
    openModal('新增时间线记录',`<div class="form-grid">
      <div class="field"><label>类型</label><select id="tl-type">${['沟通','拍摄','培训','作业','内容','数据','复盘','方向调整','其他'].map(x=>`<option ${prefill.type===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>标题</label><input id="tl-title" value="${esc(prefill.title||'')}"></div>
      <div class="field full-row"><label>详细记录</label><textarea id="tl-detail">${esc(prefill.detail||'')}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="tl-save" class="btn primary">保存</button></div>`,()=>{
      $('#tl-save').onclick=()=>{addTimeline(c,$('#tl-title').value.trim()||'新增记录',$('#tl-detail').value,$('#tl-type').value);scheduleSave();closeModal();renderClient()};
    });
  }

  function openSaveAIResult(c,index){
    const m=c.chat[index];if(!m||m.role!=='assistant')return;
    openModal('保存AI结果到客户模块',`<div class="info-box">不会自动覆盖旧内容。你选择保存位置后，可以再到对应模块继续修改。</div><div class="form-grid" style="margin-top:14px">
      <div class="field"><label>保存到</label><select id="ai-target">
        <option value="basic">客户档案备注</option><option value="strategy">运营规划调整备注</option><option value="idea">内容选题（灵感）</option>
        <option value="script">完整文案（待拍）</option><option value="trainingPlan">培训计划</option><option value="trainingRecord">培训记录</option>
        <option value="task">作业</option><option value="review">复盘</option><option value="timeline">时间线</option>
      </select></div>
      <div class="field"><label>标题</label><input id="ai-title" value="AI建议 ${today()}"></div>
      <div class="field full-row"><label>保存内容</label><textarea id="ai-body" style="min-height:260px">${esc(m.content)}</textarea></div>
    </div><div class="actions" style="margin-top:14px"><button id="ai-save" class="btn primary">保存</button></div>`,()=>{
      $('#ai-save').onclick=()=>{
        const target=$('#ai-target').value,title=$('#ai-title').value.trim()||'AI建议',body=$('#ai-body').value;
        if(target==='basic'){c.basic.notes=(c.basic.notes?c.basic.notes+'\n\n':'')+`【${title}】\n${body}`;addTimeline(c,'AI结果保存到客户档案',title,'AI')}
        if(target==='strategy'){c.strategy.adjustmentNotes=(c.strategy.adjustmentNotes?c.strategy.adjustmentNotes+'\n\n':'')+`【${title}】\n${body}`;addTimeline(c,'AI结果保存到运营规划',title,'AI')}
        if(target==='idea'){c.content.unshift({id:uid(),title,category:'AI选题',status:'灵感',purpose:'',hook:'',script:body,shots:'',broll:'',cover:'',publishCaption:'',topics:'',shootDate:'',publishDate:'',trainingId:'',review:'',nextCopy:'',notes:'由AI对话保存',createdAt:now()});addTimeline(c,'AI保存内容选题',title,'内容')}
        if(target==='script'){c.content.unshift({id:uid(),title,category:'AI文案',status:'待拍',purpose:'',hook:'',script:body,shots:'',broll:'',cover:'',publishCaption:'',topics:'',shootDate:'',publishDate:'',trainingId:'',review:'',nextCopy:'',notes:'由AI对话保存',createdAt:now()});addTimeline(c,'AI保存完整文案',title,'内容')}
        if(target==='trainingPlan'){c.training.push({...blankTraining(),id:uid(),title,number:c.training.length+1,date:'',objective:body,aiPlan:body,completed:false});addTimeline(c,'AI保存培训计划',title,'培训')}
        if(target==='trainingRecord'){c.training.push({...blankTraining(),id:uid(),title,date:today(),result:body,aiPlan:body,completed:true});addTimeline(c,'AI保存培训记录',title,'培训')}
        if(target==='task'){c.tasks.unshift({id:uid(),title,type:'客户作业',assignedDate:today(),due:'',note:body,submitContent:'',submitAt:'',done:false,feedback:'',issues:'',nextCorrection:'',trainingId:'',createdAt:now()});addTimeline(c,'AI保存为作业',title,'作业')}
        if(target==='review'){c.reviewNotes=(c.reviewNotes?c.reviewNotes+'\n\n':'')+`【${title}】\n${body}`;addTimeline(c,'保存AI复盘',body,'复盘')}
        if(target==='timeline'){addTimeline(c,title,body,'AI')}
        scheduleSave();closeModal();toast('已保存');renderClient();
      };
    });
  }

  function initEvents(){
    $$('#nav button').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;if(currentView!=='customers')currentClientId=null;render()});
    $('#quickAdd').onclick=()=>openClientModal();
    $('#modalClose').onclick=closeModal;$('.modal-backdrop').onclick=closeModal;
    $('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');
    $('#loginBtn').onclick=async()=>{try{await api('/api/login',{method:'POST',body:JSON.stringify({password:$('#loginPassword').value})});await load()}catch(e){$('#loginError').textContent=e.message}};
    $('#logoutBtn').onclick=async()=>{await api('/api/logout',{method:'POST',body:'{}'});location.reload()};
    if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  return {async init(){initEvents();try{await load()}catch(e){document.body.innerHTML=`<div style="padding:30px;font-family:sans-serif"><h2>系统启动失败</h2><pre>${esc(e.message)}</pre></div>`}}};
})();
App.init();
