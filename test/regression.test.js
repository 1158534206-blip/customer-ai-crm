const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('登录、保存、重启恢复、备份与损坏文件保护',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crm-regression-'));
  const dataFile=path.join(dir,'crm.json');
  let child,base,cookie='';
  async function start(){
    child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',DATABASE_URL:'',DATA_FILE:dataFile,APP_PASSWORD:'test-only-password',DEEPSEEK_API_KEY:''},stdio:['ignore','pipe','pipe']});
    let output='';
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Startup timed out')),5000);
      child.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Exit ${code}`));});
      child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('running on')){clearTimeout(timeout);resolve();}});
    });
    base='http://127.0.0.1:'+output.match(/:(\d+) ·/)[1];
  }
  async function stop(){if(child&&!child.exitCode){const done=once(child,'exit');child.kill();await done;child=null;}}
  async function request(route,method='GET',body,authenticated=true){
    return fetch(base+route,{method,headers:{'Content-Type':'application/json',...(authenticated?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  }
  try{
    await start();
    assert.equal((await request('/api/state','GET',undefined,false)).status,401);
    assert.equal((await request('/api/login','POST',{password:'wrong'})).status,401);
    const login=await request('/api/login','POST',{password:'test-only-password'});
    assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
    const state={version:2,clients:[{id:'fixture',name:'测试客户',industry:'自填行业',basic:{history:'真实经历'},interviewAnswers:{one:{answer:'访谈记录'}},training:[{title:'第一次上门'}],tasks:[{title:'拍摄作业'}],metrics:[{views:12}]}]};
    assert.equal((await request('/api/state','PUT',state)).status,200);
    assert.deepEqual((await (await request('/api/state')).json()).clients,state.clients);
    assert.equal((await request('/api/state','PUT',{clients:'bad'})).status,400);
    assert.equal((await request('/api/ai','POST',{clientId:'missing',message:'test'})).status,404);
    assert.equal((await request('/api/ai','POST',{clientId:'fixture',message:''})).status,400);
    await stop();await start();
    assert.deepEqual((await (await request('/api/export')).json()).clients,state.clients);
    const edited={...state,clients:[{...state.clients[0],name:'修改后'}]};
    assert.equal((await request('/api/import','POST',edited)).status,200);
    assert.equal((await (await request('/api/state')).json()).clients[0].name,'修改后');
    fs.writeFileSync(dataFile,'broken json');
    assert.equal((await request('/api/health')).status,503);
    assert.notEqual((await request('/api/state')).status,200);
  }finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
});

function frontendHarness(){
  const source=fs.readFileSync(path.join(root,'public/app.js'),'utf8').replace('return {async init(){','return {save,scheduleSave,setState(value){state=value;},getDirty(){return dirty;},async init(){').replace('App.init();','globalThis.testApp=App;');
  const calls=[];const elements=new Map();
  const context={console,setTimeout,clearTimeout,document:{querySelector(selector){if(!elements.has(selector))elements.set(selector,{textContent:'',classList:{remove(){},add(){}}});return elements.get(selector);}},fetch:async(url,opts)=>new Promise((resolve,reject)=>calls.push({url,body:JSON.parse(opts.body),resolve:()=>resolve({ok:true,headers:{get:()=> 'application/json'},json:async()=>({updatedAt:'saved'})}),reject}))};
  vm.createContext(context);vm.runInContext(source,context);
  return {app:context.testApp,calls,elements};
}

test('慢网络下保存串行执行，后续编辑不会被旧请求覆盖',async()=>{
  const {app,calls}=frontendHarness();
  app.setState({clients:[{name:'第一版'}]});app.scheduleSave();const saving=app.save();
  app.setState({clients:[{name:'第二版'}]});app.scheduleSave();const joined=app.save();
  assert.equal(calls.length,1);calls[0].resolve();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,2);assert.equal(calls[1].body.clients[0].name,'第二版');
  calls[1].resolve();await Promise.all([saving,joined]);assert.equal(app.getDirty(),false);
});

test('保存失败保留未保存状态并支持重试',async()=>{
  const {app,calls,elements}=frontendHarness();
  app.setState({clients:[{name:'重要资料'}]});app.scheduleSave();const saving=app.save();
  calls[0].reject(new Error('offline'));await assert.rejects(saving,/offline/);
  assert.equal(app.getDirty(),true);assert.match(elements.get('#saveStatus').textContent,/保存失败/);
  const retry=app.save();assert.equal(calls[1].body.clients[0].name,'重要资料');calls[1].resolve();await retry;
  assert.equal(app.getDirty(),false);
});
