const http = require('http');
function req(method,path,body){
  return new Promise((resolve,reject)=>{
    const r=http.request({host:'127.0.0.1',port:Number(process.env.PORT||3000),path,method,headers:{'Content-Type':'application/json'}},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d}));
    });r.on('error',reject); if(body)r.write(JSON.stringify(body)); r.end();
  });
}
(async()=>{
  const h=await req('GET','/api/health');
  if(h.status!==200) throw new Error('health failed');
  const s=await req('GET','/api/state');
  if(s.status!==200) throw new Error('state failed');
  console.log('smoke test ok');
})().catch(e=>{console.error(e);process.exit(1)});
