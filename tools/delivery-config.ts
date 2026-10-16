import {readFileSync} from 'node:fs';

export type Delivery = {
  slug:string; status:'draft'|'unlisted'|'public'; title:string; eyebrow:string;
  description:string; cover:string; coverCredit:string; shareImage?:string;
  viewer:'botanique'|'embedded'; experience:string; manifest?:string; pdf?:string; note:string;
  category?:'Casas'|'Edifícios'|'Condomínios'; stage?:string; highlights?:string[];
  gallery?:{image:string;caption:string}[];
  entries?:{label:string;description:string;experience:string;scene?:'exterior'|'apartamento'}[];
};
export type DeliveryRegistry = {origin:string;projects:Delivery[]};
const asset = (value:unknown) => typeof value==='string' && /^\/assets\/[a-zA-Z0-9_./?=&%-]+$/.test(value) && !value.includes('..');
export function validateRegistry(value:unknown):DeliveryRegistry {
  const registry=value as DeliveryRegistry;
  if(!registry || registry.origin!=='https://www.emespatial.com' || !Array.isArray(registry.projects)) throw Error('Cadastro de entregas inválido.');
  const slugs=new Set<string>();
  for(const p of registry.projects){
    if(!p || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || slugs.has(p.slug)) throw Error('Identificador inválido ou repetido.');
    slugs.add(p.slug);
    if(!['draft','unlisted','public'].includes(p.status)) throw Error('Estado de publicação inválido.');
    for(const key of ['title','eyebrow','description','coverCredit','note'] as const) if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>1000) throw Error('Texto inválido: '+key);
    if(!asset(p.cover)|| (p.shareImage&&!asset(p.shareImage)) || (p.pdf&&!asset(p.pdf)) || (p.manifest&&!asset(p.manifest))) throw Error('Use arquivos locais para a entrega.');
    if(!['botanique','embedded'].includes(p.viewer) || !/^\/apresentar\/[a-z0-9-]+(?:\?[a-zA-Z0-9_=&%-]+)?$/.test(p.experience)) throw Error('Experiência inválida.');
    if(p.viewer==='botanique'&&!p.manifest) throw Error('Manifesto do Botanique ausente.');
    if(p.category&&!['Casas','Edifícios','Condomínios'].includes(p.category))throw Error('Categoria inválida.');
    if(p.stage&&(typeof p.stage!=='string'||p.stage.length>100))throw Error('Etapa inválida.');
    if(p.highlights&&(!Array.isArray(p.highlights)||p.highlights.length>8||p.highlights.some(s=>typeof s!=='string'||!s.trim()||s.length>160)))throw Error('Destaques inválidos.');
    if(p.gallery&&(!Array.isArray(p.gallery)||p.gallery.length>6||p.gallery.some(g=>!asset(g.image)||typeof g.caption!=='string'||!g.caption.trim()||g.caption.length>300)))throw Error('Galeria inválida.');
    if(p.entries&&(!Array.isArray(p.entries)||!p.entries.length||p.entries.length>6||p.entries.some(e=>typeof e.label!=='string'||!e.label.trim()||e.label.length>100||typeof e.description!=='string'||e.description.length>300||!/^\/apresentar\/[a-z0-9-]+(?:\?[a-zA-Z0-9_=&%-]+)?$/.test(e.experience)||(e.scene&&!['exterior','apartamento'].includes(e.scene)))))throw Error('Entrada de experiência inválida.');
  }
  return registry;
}
export function readRegistry(file='config/deliveries.json'){return validateRegistry(JSON.parse(readFileSync(file,'utf8')));}
export function publicProjects(registry:DeliveryRegistry){return registry.projects.filter(p=>p.status==='public').map(p=>({slug:p.slug,name:p.title,image:p.cover,href:'/visitar/'+p.slug,description:p.description,alt:p.coverCredit,experience:p.experience,category:p.category||'Edifícios',stage:p.stage||'Estudo interativo',highlights:p.highlights||[]}));}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function deliveryHead(registry:DeliveryRegistry,project?:Delivery){
  const p=project?.status==='draft'?undefined:project;
  const title=p?`${p.title} · EME Spatial`:'Apresentação indisponível · EME Spatial';
  const description=p?.description||'Esta apresentação não está disponível. Solicite um link atualizado a quem enviou o convite.';
  const url=p?registry.origin+'/visitar/'+p.slug:'';
  const img=p?registry.origin+(p.shareImage||p.cover):'';
  return `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${p?.status==='public'?'index, follow':'noindex, nofollow'}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="EME Spatial"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">${p?`<link rel="canonical" href="${escape(url)}"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(img)}"><meta property="og:image:alt" content="${escape(p.title+' · apresentação EME Spatial')}"><meta name="twitter:card" content="summary_large_image">`:''}<script id="delivery-data" type="application/json">${JSON.stringify(p?{...p,canonical:url}:null).replace(/</g,'\\u003c')}</script>`;
}
