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
export type Budget={version:1;name:string;tier:Tier;include3d:boolean;units:string;scope:string;revisions:string;deliveryWeeks:string;media:Record<MediaId,{quantity:string;cost:string}>;tierCosts:Record<Tier,string>;costs:Cost[];cloud:{mode:'pending'|'local'|'desktop'|'streams';rate:string;hours:string;sessions:string;minutes:string;fixed:string;fx:string;extra:string};commercial:{mode:'lot'|'fixed'|'percent';price:string;lotValue:string;months:string;sold:string;firstMonth:string;salesMonths:string;delay:string;installments:string;tax:string;partner:string;reserve:string;margin:string;discount:string}};
export function newBudget():Budget{return {version:1,name:'Loteamento · estudo de 96 lotes',tier:'evolved',include3d:true,units:'96',scope:'Escopo sugerido para revisão: navegação 3D, mapa de lotes, imagens, filme e peças de lançamento. Confirmar áreas, formatos, atualização de disponibilidade e acesso dos clientes.',revisions:'2',deliveryWeeks:'',media:{images:{quantity:'12',cost:''},films:{quantity:'1',cost:''},shorts:{quantity:'4',cost:''},pieces:{quantity:'8',cost:''}},tierCosts:{essential:'',evolved:'',complete:''},costs:[{id:'hardware',name:'Computadores próprios · depreciação alocada ao projeto',amount:'',monthly:false,cash:false},{id:'power',name:'Energia, internet e operação · parcela deste projeto',amount:'',monthly:true,cash:true},{id:'tools',name:'Ferramentas de imagem, vídeo e complementos',amount:'',monthly:true,cash:true},{id:'support',name:'Hospedagem web, manutenção e atendimento',amount:'',monthly:true,cash:true},{id:'admin',name:'Contabilidade, comercial e administração · rateio',amount:'',monthly:true,cash:true}],cloud:{mode:'pending',rate:'',hours:'',sessions:'',minutes:'',fixed:'',fx:'',extra:''},commercial:{mode:'lot',price:'1500',lotValue:'',months:'24',sold:'48',firstMonth:'7',salesMonths:'12',delay:'0',installments:'1',tax:'',partner:'',reserve:'',margin:'',discount:''}};}
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
 return b;
}
export function calculateBudget(input:Budget,priceOverride?:number,soldOverride?:number){
 const b=validateBudget(input),pending:string[]=[];
 const num=(value:string,label:string)=>{if(value.trim()===''){pending.push(label);return 0;}return Number(value);};
 const c=b.commercial,units=num(b.units,'Quantidade de lotes'),months=num(c.months,'Prazo de operação');
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
  monthly+=cloudMonthly;cashMonthly+=cloudMonthly;
 }
 const tax=num(c.tax,'Tributos')/100,partner=num(c.partner,'Parceiro')/100,reserve=num(c.reserve,'Reserva')/100,margin=num(c.margin,'Margem desejada')/100,discount=num(c.discount,'Custo do capital')/100;
 if(tax+partner+margin>=1)throw Error('Tributos, parceiro e margem devem somar menos de 100%.');
 once*=1+reserve;monthly*=1+reserve;cashOnce*=1+reserve;cashMonthly*=1+reserve;
 const fee=priceOverride??num(c.price,'Preço proposto');
 const unitFee=c.mode==='percent'?fee*num(c.lotValue,'Preço médio do lote')/100:fee;
 const maxRevenue=c.mode==='fixed'?fee:unitFee*units;
 const sold=soldOverride??num(c.sold,'Lotes no cenário'),first=num(c.firstMonth,'Mês inicial'),salesMonths=num(c.salesMonths,'Período de vendas'),delay=num(c.delay,'Atraso do repasse'),installments=num(c.installments,'Parcelas da remuneração');
 const last=Math.max(months,first+salesMonths+delay+installments);
 const collection=new Array(last+1).fill(0);
 if(c.mode==='fixed'){for(let j=0;j<installments;j++)collection[first+delay+j]+=fee/installments;}
 else for(let t=0;t<salesMonths;t++){const n=Math.floor((t+1)*sold/salesMonths)-Math.floor(t*sold/salesMonths);for(let j=0;j<installments;j++)collection[first+t+delay+j]+=n*unitFee/installments;}
 let cash=-cashOnce,economic=-once,minCash=cash,pv=-once,received=0,pvUnits=0,pvCost=once;let payback:number|null=null;
 const rows=[{month:0,revenue:0,cost:once,cashCost:cashOnce,net:-cashOnce,cash,economic}];
 for(let m=1;m<=months;m++){const revenue=collection[m]||0,net=revenue*(1-tax-partner)-cashMonthly;received+=revenue;cash+=net;economic+=revenue*(1-tax-partner)-monthly;minCash=Math.min(minCash,cash);pv+=(revenue*(1-tax-partner)-monthly)/((1+discount)**m);pvCost+=monthly/((1+discount)**m);pvUnits+=(c.mode==='fixed'?revenue/(fee||1):revenue/(unitFee||1))/((1+discount)**m);if(economic>=0&&payback===null)payback=m;rows.push({month:m,revenue,cost:monthly,cashCost:cashMonthly,net,cash,economic});}
 // Derive collection weights independently of fee so a zero trial price still has a meaningful target.
 if(fee===0){const nonzero=calculateBudget({...b,commercial:{...c,price:c.mode==='percent'?'1':'1'}},undefined,sold);pvUnits=nonzero.pvUnits;}
 const economicCost=once+monthly*months,target=pvUnits>0?pvCost/(pvUnits*(1-tax-partner-margin)):null;
 const future=Math.max(0,(c.mode==='fixed'?fee:sold*unitFee)-received);
 return {pending:[...new Set(pending)],complete:pending.length===0,units,months,once,monthly,cashOnce,cashMonthly,cloudMonthly,unitFee,maxRevenue,received,future,economicCost,profit:economic,margin:received>0?economic/received:null,cashRequired:Math.max(0,-minCash),pv,target,pvUnits,payback,rows,breakEven:unitFee>0&&c.mode!=='fixed'?Math.ceil(economicCost/(unitFee*(1-tax-partner))):null};
}
