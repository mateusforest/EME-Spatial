import {createServer} from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {readRegistry,validateRegistry} from './delivery-config.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const port=4197,origin=`http://127.0.0.1:${port}`,token=randomBytes(32).toString('hex');
const file='config/deliveries.json';let busy=false,state={phase:'idle',message:''};
const revision=()=>createHash('sha256').update(readFileSync(file)).digest('hex');
function command(executable,args){return new Promise((ok,fail)=>{
  const child=spawn(executable,args,{cwd:root,windowsHide:true,env:{...process.env,PATH:dirname(process.execPath)+';'+process.env.PATH}});let output='';
  const timeout=setTimeout(()=>{child.kill();fail(Error('A operação excedeu o tempo. Confira a publicação antes de repetir.'));},240000);
  child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});
  child.on('error',e=>{clearTimeout(timeout);fail(e);});child.on('close',code=>{clearTimeout(timeout);code===0?ok(output.trim()):fail(Error(output.slice(-1200)||'Não foi possível executar a operação.'));});
});}
async function publish(){
  busy=true;state={phase:'building',message:'Verificando a entrega e preparando a publicação…'};
  try{
    if(await command('git',['branch','--show-current'])!=='main')throw Error('Abra a versão principal do projeto antes de publicar.');
    const changes=await command('git',['status','--porcelain','--','src','public','config','vite.config.ts','vercel.json','package.json','delivery.html','tools/delivery-config.ts','tools/delivery-plugin.ts','tools/manage-deliveries.mjs','tools/delivery-manager.html']);
    if(changes.split('\n').some(line=>line.trim()&&!line.endsWith('config/deliveries.json')))throw Error('Há outras alterações do site em andamento. Finalize essa revisão antes de publicar as entregas.');
    await command('git',['fetch','origin','main']);
    if(await command('git',['rev-parse','HEAD'])!==await command('git',['rev-parse','origin/main']))throw Error('O projeto local precisa estar sincronizado com o site antes de publicar.');
    await command(process.execPath,['node_modules/typescript/bin/tsc','-b']);
    await command(process.execPath,['node_modules/vite/bin/vite.js','build']);
    if(changes.trim()){
      await command('git',['add','--',file]);
      await command('git',['commit','--only','-m','Update project delivery publication settings','--',file]);
      await command('git',['push','origin','HEAD:main']);
    }
    state={phase:'deploying',message:'Enviado à hospedagem. Aguardando a atualização do site…'};
    const expected=createHash('sha256').update(JSON.stringify(readRegistry())).digest('hex');
    let confirmed=false;
    for(let i=0;i<36;i++){
      try{const response=await fetch('https://www.emespatial.com/delivery-release.json?v='+Date.now(),{signal:AbortSignal.timeout(10000),cache:'no-store'});if(response.ok&&(await response.json()).revision===expected){confirmed=true;break;}}catch{}
      await new Promise(r=>setTimeout(r,5000));
    }
    state=confirmed?{phase:'done',message:'Atualização confirmada no site. Os links já podem ser compartilhados.'}:{phase:'pending',message:'Envio realizado. A hospedagem ainda não confirmou a atualização; confira o site antes de encaminhar os links.'};
  }catch(e){state={phase:'error',message:e.message};}finally{busy=false;}
}
createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  if(req.headers.host!==`127.0.0.1:${port}`){json(403,{error:'Acesso local somente.'});return;}
  if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(readFileSync('tools/delivery-manager.html','utf8').replace('__TOKEN__',token));return;}
  if(req.method==='GET'&&req.url==='/api/deliveries'){try{json(200,{registry:readRegistry(),revision:revision(),busy,state});}catch(e){json(500,{error:e.message});}return;}
  if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-delivery-token']!==token||req.headers['content-type']!=='application/json'){json(403,{error:'Solicitação local inválida.'});return;}
  if(busy){json(409,{error:'A publicação já está em andamento.'});return;}
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>32000)throw Error('Pedido muito grande.');}
    const input=JSON.parse(body);
    if(input.revision!==revision()){json(409,{error:'A configuração mudou. Reabra o painel para carregar a versão atual.'});return;}
    if(req.url==='/api/save'){
      const registry=readRegistry(),project=registry.projects.find(p=>p.slug===input.slug);if(!project)throw Error('Projeto não encontrado.');
      project.status=input.status;validateRegistry(registry);writeFileSync(file,JSON.stringify(registry,null,2)+'\n');state={phase:'saved',message:'Rascunho salvo nesta máquina. Clique em Publicar alterações para atualizar o site.'};json(200,{ok:true});
    }else if(req.url==='/api/publish'){void publish();json(202,{ok:true});}else json(404,{error:'Operação não encontrada.'});
  }catch(e){json(400,{error:e.message});}
}).listen(port,'127.0.0.1',()=>console.log('Gerenciar entregas: '+origin));
