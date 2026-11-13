export const budgetVersion=1;
export const tiers=[
 {id:'essential',name:'Essencial',tag:'Apresentar o empreendimento',description:'Uma visão clara da implantação, com navegação simples e modelo leve.',features:['Visão aérea e rotação do empreendimento','Lotes identificados com informações básicas','Materiais e paisagismo simplificados','Visualização em dispositivos definidos no escopo'],limit:'Sem caminhada livre, interiores detalhados ou personalização.'},
 {id:'evolved',name:'Interativo',tag:'Explorar com mais liberdade',description:'Mais navegação, detalhes e realismo para conduzir a visita.',features:['Tudo do Essencial','Caminhada e percursos por áreas selecionadas','Materiais, iluminação e paisagismo mais detalhados','Mapa de disponibilidade com atualização definida'],limit:'Interiores, integrações e atualização automática precisam ser especificados.'},
 {id:'complete',name:'Completo',tag:'Uma experiência personalizada',description:'Maior profundidade visual, ambientes detalhados e recursos sob medida.',features:['Tudo do Interativo','Áreas comuns e interiores selecionados','Cenas de iluminação e acabamentos combinados','Integrações e apresentação assistida previstas no escopo'],limit:'Não significa recursos ilimitados. Quantidade de ambientes e desempenho dependem de validação.'},
] as const;
export const mediaItems=[
 {id:'images',name:'Imagens de divulgação',unit:'imagem',detail:'Perspectivas tratadas; indicar resolução e ambientes.'},
 {id:'films',name:'Filme do empreendimento',unit:'filme',detail:'Roteiro, duração, trilha e locução definidos no escopo.'},
 {id:'shorts',name:'Vídeos curtos para redes',unit:'vídeo',detail:'Informar duração, formato e se são cortes do filme.'},
 {id:'pieces',name:'Peças de lançamento',unit:'peça',detail:'Artes para anúncios, redes e apresentação; mídia paga à parte.'},
] as const;
export type Tier=typeof tiers[number]['id'];
export type MediaId=typeof mediaItems[number]['id'];
export type Cost={id:string;name:string;amount:string;monthly:boolean;cash:boolean};
export type Timeline={launch:string;stages:{month:string;percent:string}[]};
export const newTimeline=():Timeline=>({launch:'',stages:[{month:'0',percent:'15'},{month:'1',percent:'30'},{month:'2',percent:'25'},{month:'3',percent:'30'}]});
export type Budget={version:1;timeline?:Timeline;name:string;tier:Tier;include3d:boolean;units:string;scope:string;revisions:string;deliveryWeeks:string;media:Record<MediaId,{quantity:string;cost:string}>;tierCosts:Record<Tier,string>;costs:Cost[];cloud:{mode:'pending'|'local'|'desktop'|'streams';rate:string;hours:string;sessions:string;minutes:string;fixed:string;fx:string;extra:string};commercial:{mode:'lot'|'fixed'|'percent';price:string;lotValue:string;months:string;sold:string;firstMonth:string;salesMonths:string;delay:string;installments:string;tax:string;partner:string;reserve:string;margin:string;discount:string}};
export function newBudget():Budget{return {version:1,timeline:newTimeline(),name:'Loteamento · estudo de 96 lotes',tier:'evolved',include3d:true,units:'96',scope:'Escopo sugerido para revisão: navegação 3D, mapa de lotes, imagens, filme e peças de lançamento. Confirmar áreas, formatos, atualização de disponibilidade e acesso dos clientes.',revisions:'2',deliveryWeeks:'',media:{images:{quantity:'12',cost:''},films:{quantity:'1',cost:''},shorts:{quantity:'4',cost:''},pieces:{quantity:'8',cost:''}},tierCosts:{essential:'',evolved:'',complete:''},costs:[{id:'hardware',name:'Computadores próprios · depreciação alocada ao projeto',amount:'',monthly:false,cash:false},{id:'power',name:'Energia, internet e operação · parcela deste projeto',amount:'',monthly:true,cash:true},{id:'tools',name:'Ferramentas de imagem, vídeo e complementos',amount:'',monthly:true,cash:true},{id:'support',name:'Hospedagem web, manutenção e atendimento',amount:'',monthly:true,cash:true},{id:'admin',name:'Contabilidade, comercial e administração · rateio',amount:'',monthly:true,cash:true}],cloud:{mode:'pending',rate:'',hours:'',sessions:'',minutes:'',fixed:'',fx:'',extra:''},commercial:{mode:'lot',price:'1500',lotValue:'',months:'24',sold:'48',firstMonth:'7',salesMonths:'12',delay:'0',installments:'1',tax:'',partner:'',reserve:'',margin:'',discount:''}};}
export function validateBudget(x:unknown):Budget{
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Arquivo de orçamento inválido.');
 const b=x as Budget;
 const text=(s:unknown,max=6000)=>typeof s==='string'&&s.length<=max;
 const number=(s:unknown,max=1e9,int=false)=>text(s,30)&&(s===''||(Number.isFinite(Number(s))&&Number(s)>=0&&Number(s)<=max&&(!int||Number.isInteger(Number(s)))));
 if(b.version!==1||!text(b.name,180)||!text(b.scope)||!tiers.some(t=>t.id===b.tier)||typeof b.include3d!=='boolean'||!number(b.units,100000,true)||!number(b.revisions,100,true)||!number(b.deliveryWeeks,520))throw Error('Confira os dados do projeto.');
 for(const t of tiers)if(!number(b.tierCosts?.[t.id]))throw Error('Custo 3D inválido.');
 for(const m of mediaItems)if(!number(b.media?.[m.id]?.quantity,10000,true)||!number(b.media?.[m.id]?.cost))throw Error('Confira as quantidades e custos de mídia.');
 if(!Array.isArray(b.costs)||b.costs.length>80||b.costs.some(c=>!text(c.id,100)||!text(c.name,200)||!number(c.amount)||typeof c.cash!=='boolean'||typeof c.monthly!=='boolean')||new Set(b.costs.map(c=>c.id)).size!==b.costs.length)throw Error('Lista de custos inválida.');
 if(!['pending','local','desktop','streams'].includes(b.cloud?.mode))throw Error('Informe o modo de navegação.');
 for(const key of ['rate','hours','sessions','minutes','fixed','fx','extra'] as const)if(!number(b.cloud[key]))throw Error('Confira os valores da nuvem.');
 if(!['lot','fixed','percent'].includes(b.commercial?.mode))throw Error('Condição comercial inválida.');
 for(const key of ['price','lotValue','months','sold','firstMonth','salesMonths','delay','installments','tax','partner','reserve','margin','discount'] as const)if(!number(b.commercial[key]))throw Error('Condição comercial inválida.');
 for(const key of ['months','firstMonth','salesMonths','installments'] as const)if(b.commercial[key]!==''&&(!Number.isInteger(Number(b.commercial[key]))||Number(b.commercial[key])<1||Number(b.commercial[key])>120))throw Error('Prazos devem ser inteiros entre 1 e 120 meses.');
 for(const key of ['sold','delay'] as const)if(b.commercial[key]!==''&&!Number.isInteger(Number(b.commercial[key])))throw Error('Lotes e atraso devem ser números inteiros.');
 if(Number(b.commercial.sold)>Number(b.units)||Number(b.commercial.delay)>120)throw Error('Confira lotes vendidos e atraso de recebimento.');
 for(const key of ['tax','partner','reserve','margin','discount'] as const)if(Number(b.commercial[key])>100)throw Error('Percentuais devem ficar entre 0 e 100.');
 if(b.commercial.mode==='percent'&&Number(b.commercial.price)>100)throw Error('Percentual por lote deve ficar entre 0 e 100.');
 if(b.timeline){
  const t=b.timeline;
  if(!number(t.launch,120,true)||(t.launch!==''&&Number(t.launch)<1)||!Array.isArray(t.stages)||t.stages.length!==4)throw Error('Confira o lançamento e as quatro etapas financeiras.');
  if(t.stages.some(s=>!number(s.month,120,true)||!number(s.percent,100)))throw Error('Confira mês e percentual das etapas.');
  if(t.stages.every(s=>s.percent!=='')&&Math.abs(t.stages.reduce((n,s)=>n+Number(s.percent),0)-100)>0.001)throw Error('A distribuição dos custos iniciais deve somar 100%.');
  if(t.stages.some((s,i)=>i>0&&s.month!==''&&t.stages[i-1].month!==''&&Number(s.month)<Number(t.stages[i-1].month)))throw Error('Os meses das etapas devem seguir a ordem da produção.');
  if(t.launch!==''&&b.commercial.mode!=='fixed'&&b.commercial.firstMonth!==''&&Number(b.commercial.firstMonth)<Number(t.launch))throw Error('A primeira venda não pode anteceder o lançamento previsto no cenário.');
 }
 return b;
}
export function calculateBudget(input:Budget,priceOverride?:number,soldOverride?:number){
 const b=validateBudget(input),pending:string[]=[];
 const num=(value:string,label:string)=>{if(value.trim()===''){pending.push(label);return 0;}return Number(value);};
 const c=b.commercial,units=num(b.units,'Quantidade de lotes'),months=num(c.months,'Período analisado');
 if(units<1)throw Error('Informe ao menos um lote.');
 let once=0,monthly=0,cashOnce=0,cashMonthly=0;
 if(b.include3d){const v=num(b.tierCosts[b.tier],'Custo do 3D selecionado');once+=v;cashOnce+=v;}
 for(const item of mediaItems){const q=num(b.media[item.id].quantity,'Quantidade de '+item.name);if(q){const v=q*num(b.media[item.id].cost,'Custo de '+item.name);once+=v;cashOnce+=v;}}
 for(const row of b.costs){const v=num(row.amount,row.name);if(row.monthly){monthly+=v;if(row.cash)cashMonthly+=v;}else{once+=v;if(row.cash)cashOnce+=v;}}
 let cloudMonthly=0;
 if(b.cloud.mode==='pending')pending.push('Definir navegação e nuvem');
 if(b.cloud.mode==='desktop'||b.cloud.mode==='streams'){
  const cl=b.cloud,rate=num(cl.rate,'Tarifa da nuvem'),usage=cl.mode==='desktop'?num(cl.hours,'Horas mensais da equipe'):num(cl.sessions,'Sessões mensais')*num(cl.minutes,'Minutos por sessão');
  cloudMonthly=(rate*usage+num(cl.fixed,'Custo fixo mensal da nuvem'))*num(cl.fx,'Câmbio efetivo')+num(cl.extra,'Outros custos da nuvem');
  if(Number(cl.fx)<=0&&cl.fx!=='')throw Error('O câmbio deve ser positivo.');

 }
 const tax=num(c.tax,'Tributos')/100,partner=num(c.partner,'Parceiro')/100,reserve=num(c.reserve,'Reserva')/100,margin=num(c.margin,'Margem desejada')/100,discount=num(c.discount,'Custo do capital')/100;
 if(tax+partner+margin>=1)throw Error('Tributos, parceiro e margem devem somar menos de 100%.');
 once*=1+reserve;monthly*=1+reserve;cashOnce*=1+reserve;cashMonthly*=1+reserve;
 const cloudWithReserve=cloudMonthly*(1+reserve);
 const launch=b.timeline?num(b.timeline.launch,'Mês do lançamento'):1;
 const cloudLast=b.timeline?launch+23:months;
 const allocations=b.timeline?b.timeline.stages.map((s,i)=>({month:num(s.month,'Mês da etapa '+(i+1)),weight:num(s.percent,'Percentual da etapa '+(i+1))/100})):[{month:0,weight:1}];
 const fee=priceOverride??num(c.price,'Preço proposto');
 const unitFee=c.mode==='percent'?fee*num(c.lotValue,'Preço médio do lote')/100:fee;
 const maxRevenue=c.mode==='fixed'?fee:unitFee*units;
 const sold=soldOverride??num(c.sold,'Lotes no cenário'),first=num(c.firstMonth,'Mês inicial'),salesMonths=num(c.salesMonths,'Período de vendas'),delay=num(c.delay,'Atraso do repasse'),installments=num(c.installments,'Parcelas da remuneração');
 const last=Math.max(months,first+salesMonths+delay+installments);
 const collection=new Array(last+1).fill(0);
 if(c.mode==='fixed'){for(let j=0;j<installments;j++)collection[first+delay+j]+=fee/installments;}
 else for(let t=0;t<salesMonths;t++){const n=Math.floor((t+1)*sold/salesMonths)-Math.floor(t*sold/salesMonths);for(let j=0;j<installments;j++)collection[first+t+delay+j]+=n*unitFee/installments;}
 let cash=0,economic=0,minCash=0,pv=0,received=0,pvUnits=0,pvCost=0,economicCost=0,upfrontCash=0;let payback:number|null=null,firstReceipt:number|null=null;
 const rows=[];
 for(let m=0;m<=months;m++){
  const weight=allocations.filter(s=>s.month===m).reduce((n,s)=>n+s.weight,0);
  const productionCost=once*weight,productionCash=cashOnce*weight;
  const cloudCost=m>0&&launch>0&&m>=launch&&m<=cloudLast?cloudWithReserve:0;
  const cost=productionCost+(m>0?monthly:0)+cloudCost,cashCost=productionCash+(m>0?cashMonthly:0)+cloudCost;
  const revenue=m>0?collection[m]||0:0,net=revenue*(1-tax-partner)-cashCost;
  if(firstReceipt===null){upfrontCash=Math.max(upfrontCash,-cash+cashCost);if(revenue>0)firstReceipt=m;}
  received+=revenue;cash+=net;economic+=revenue*(1-tax-partner)-cost;economicCost+=cost;minCash=Math.min(minCash,cash);
  pv+=(revenue*(1-tax-partner)-cost)/((1+discount)**m);pvCost+=cost/((1+discount)**m);
  pvUnits+=(c.mode==='fixed'?revenue/(fee||1):revenue/(unitFee||1))/((1+discount)**m);
  if(m>0&&economic>=0&&payback===null&&received>0)payback=m;
  rows.push({month:m,revenue,cost,cashCost,cashOut:cashCost+revenue*(tax+partner),productionCost,cloudCost,net,cash,economic});
 }
 const productionFuture=allocations.filter(s=>s.month>months).reduce((n,s)=>n+once*s.weight,0);
 const cloudFuture=launch>0?Math.max(0,cloudLast-Math.max(months,launch-1))*cloudWithReserve:0;
 // Derive collection weights independently of fee so a zero trial price still has a meaningful target.
 if(fee===0){const nonzero=calculateBudget({...b,commercial:{...c,price:c.mode==='percent'?'1':'1'}},undefined,sold);pvUnits=nonzero.pvUnits;}
 const target=pvUnits>0?pvCost/(pvUnits*(1-tax-partner-margin)):null;
 const future=Math.max(0,(c.mode==='fixed'?fee:sold*unitFee)-received);
 return {launch,cloudLast,productionFuture,cloudFuture,upfrontCash,firstReceipt,pending:[...new Set(pending)],complete:pending.length===0,units,months,once,monthly,cashOnce,cashMonthly,cloudMonthly,unitFee,maxRevenue,received,future,economicCost,profit:economic,margin:received>0?economic/received:null,cashRequired:Math.max(0,-minCash),pv,target,pvUnits,payback,rows,breakEven:unitFee>0&&c.mode!=='fixed'?Math.ceil(economicCost/(unitFee*(1-tax-partner))):null};
}
