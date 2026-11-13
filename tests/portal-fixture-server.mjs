// Disposable localhost transport for manual browser verification; never deployed.
import http from 'node:http';
import {newBudget} from '../shared/commercial-budget.ts';
import {operationFromBudget} from '../shared/commercial-links.ts';
import {validatePayload} from '../shared/portal-documents.ts';
const id='00000000-0000-0000-0000-000000000001',email='owner@example.test';
const user={id,email,aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,email,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'fixture'].join('.');
const rows=new Map();
const budget=newBudget();budget.name='TESTE · 96 lotes · R$ 1.500';budget.timeline.launch='4';budget.tierCosts.evolved='20000';budget.deliveryWeeks='12';budget.media.images.cost='300';budget.media.films.cost='2000';budget.media.shorts.cost='300';budget.media.pieces.cost='100';budget.costs=budget.costs.map(c=>({...c,amount:c.cash?'100':'0'}));budget.cloud={mode:'desktop',rate:'10',hours:'10',sessions:'',minutes:'',fixed:'0',fx:'1',extra:'0'};Object.assign(budget.commercial,{firstMonth:'4',months:'30',tax:'10',partner:'5',reserve:'10',margin:'20',discount:'0'});
function put(kind,document_id,payload,version=1){rows.set(kind+':'+document_id,{kind,document_id,payload,version,updated_at:new Date().toISOString()});}
put('budget','main',budget);put('operation','main',operationFromBudget(budget,'main',1));
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4195');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
 if(req.method==='OPTIONS'){console.log('OPTIONS',req.url,req.headers['access-control-request-headers']);res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type');res.writeHead(204);res.end();return;}
 let raw='';for await(const chunk of req)raw+=chunk;
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 console.log(req.method,path);
 const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 try{
  if(path==='/auth/v1/token')return send({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:86400,user});
  if(path==='/auth/v1/user')return send(user);
  if(path==='/auth/v1/logout')return send({});
  if(!req.headers.authorization?.startsWith('Bearer eyJ'))return send({message:'Fixture auth required'},401);
  if(path==='/rest/v1/spatial_portal_members')return send([{email}]);
  if(path==='/rest/v1/spatial_portal_documents')return send([...rows.values()]);
  if(path==='/rest/v1/rpc/spatial_portal_save'){
   const p=JSON.parse(raw),old=rows.get(p.p_kind+':'+p.p_id);
   if(p.p_owner!==id)return send({code:'42501',message:'ACCOUNT_CHANGED'},403);
   if((old?.version||0)!==p.p_version)return send({code:'P0001',message:'STALE_VERSION'},400);
   validatePayload(p.p_kind,p.p_payload);put(p.p_kind,p.p_id,p.p_payload,p.p_version+1);
   console.log(JSON.stringify({saved:p.p_kind,id:p.p_id,version:p.p_version+1,name:p.p_payload.name}));return send(rows.get(p.p_kind+':'+p.p_id));
  }
  send({message:'Unknown fixture route'},404);
 }catch(e){send({message:e.message},400);}
}).listen(54329,'127.0.0.1',()=>console.log('Fixture transport listening on 127.0.0.1:54329; ephemeral test data only.'));
