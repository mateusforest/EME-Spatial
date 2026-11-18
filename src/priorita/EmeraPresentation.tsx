import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Compass,Download,Expand,FileSpreadsheet,FileText,Image as ImageIcon,Map as MapIcon,MapPin,Mountain,Plus,Trash2,TrendingUp,Trees,Waves,X} from 'lucide-react';
import {areas,blockNames,lotById,lots,number,plan,statusInfo} from './model';
import type {LotStatus} from './model';
import {commercialTerms,money} from './commercial';
import {projection} from './presentation-model';
import {loadMaterials,removeMaterial,saveMaterial} from './local-materials';
import type {PaymentInputs} from './payment-simulation';
import PaymentSimulator from './PaymentSimulator';
import EmeraLogo from './EmeraLogo';
import './presentation.css';
import './emera-presentation.css';

/**
 * Central de apresentação do Émera (rota Serra). Reorganiza o material comercial em oito seções,
 * com as imagens renderizadas do próprio cenário 3D. Valores, prazos e distâncias são ilustrativos.
 */
export const emeraTabs=['Visão geral','Galeria','Lazer','Implantação','Localização','Condições','Empresa','Documentos'] as const;
export type EmeraTab=typeof emeraTabs[number];

const G='/assets/priorita/serra-v8/gallery/';
type Shot={id:string;file:string;title:string;caption:string;group:string};
const shots:Shot[]=[
  {id:'aerea-geral',file:'aerea-geral.webp',title:'O Émera, por inteiro',caption:'Vista aérea do traçado ampliado: 12 quadras, anel viário e áreas de lazer.',group:'Vistas aéreas'},
  {id:'aerea-entardecer',file:'aerea-entardecer.webp',title:'Fim de tarde na serra',caption:'Luz dourada sobre o loteamento e os capões de araucária.',group:'Vistas aéreas'},
  {id:'planta',file:'planta.webp',title:'Planta vista de cima',caption:'Implantação completa, com a portaria ao sul.',group:'Vistas aéreas'},
  {id:'horizonte',file:'horizonte.webp',title:'Campo aberto até o horizonte',caption:'Coxilhas, araucárias e a cidade ao longe.',group:'Vistas aéreas'},
  {id:'letreiro-entrada',file:'letreiro-entrada.webp',title:'Chegada pelo letreiro',caption:'O letreiro Émera recebe quem entra pela avenida.',group:'Ruas e chegada'},
  {id:'avenida',file:'avenida.webp',title:'Avenida arborizada',caption:'Calçadas largas, árvores e iluminação em toda a extensão.',group:'Ruas e chegada'},
  {id:'rua-anel',file:'rua-anel.webp',title:'Anel viário',caption:'As Ruas 05, 06 e 07 contornam o loteamento.',group:'Ruas e chegada'},
  {id:'casas',file:'casas.webp',title:'Casas contemporâneas',caption:'Exemplos de ocupação dos lotes, com arquitetura atual.',group:'Ruas e chegada'},
  {id:'playground',file:'playground.webp',title:'Playground',caption:'Brinquedos, piso emborrachado e bancos à sombra.',group:'Lazer'},
  {id:'quadra-areia',file:'quadra-areia.webp',title:'Quadra de areia',caption:'Vôlei e futevôlei com área de descanso ao lado.',group:'Lazer'},
  {id:'piscina',file:'piscina.webp',title:'Piscina e deck',caption:'Piscina adulta e infantil, pergolado e cerca de vidro.',group:'Lazer'},
  {id:'quiosque',file:'quiosque.webp',title:'Quiosque com churrasqueira',caption:'Espaço gourmet coberto, com mesa comunitária.',group:'Lazer'},
  {id:'letreiro-noite',file:'letreiro-noite.webp',title:'À noite',caption:'Letreiro iluminado e ruas acesas.',group:'Noite'},
];
const groups=['Vistas aéreas','Ruas e chegada','Lazer','Noite'];
const byId=(id:string)=>shots.find(s=>s.id===id)!;

type Media={id:string;src:string;title:string;caption:string;group:string;local?:boolean;video?:boolean};

/** Mapa de lotes desenhado a partir do plano ativo (SVG para abrir, ampliar ou imprimir). */
function lotsSvg(stock:Record<string,LotStatus>){
  const pts=[...lots.flatMap(l=>l.polygon),...plan.roads.flatMap(r=>r.polygon)];
  const minX=Math.min(...pts.map(p=>p[0]))-8,maxX=Math.max(...pts.map(p=>p[0]))+8,minZ=Math.min(...pts.map(p=>p[1]))-8,maxZ=Math.max(...pts.map(p=>p[1]))+8;
  const P=(p:number[][])=>p.map(([x,z])=>`${(x-minX).toFixed(1)},${(maxZ-z).toFixed(1)}`).join(' ');
  const w=maxX-minX,h=maxZ-minZ;
  const body=[
    ...plan.roads.map(r=>`<polygon points="${P(r.polygon)}" fill="#cfcabd" stroke="#9c978a" stroke-width=".4"/>`),
    ...areas.map(a=>`<polygon points="${P(a.polygon)}" fill="#cfe0b8" stroke="#6f8a55" stroke-width=".5"/><text x="${(a.center[0]-minX).toFixed(1)}" y="${(maxZ-a.center[1]).toFixed(1)}" font-size="4" text-anchor="middle" fill="#3d5a2c">${a.name}</text>`),
    ...lots.map(l=>`<polygon points="${P(l.polygon)}" fill="${statusInfo[stock[l.id]].color}22" stroke="#4b5a45" stroke-width=".35"/><text x="${(l.center[0]-minX).toFixed(1)}" y="${(maxZ-l.center[1]+1.2).toFixed(1)}" font-size="3" text-anchor="middle" fill="#2c3a2a">${l.id}</text>`),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" font-family="Arial"><rect width="100%" height="100%" fill="#f6f3ea"/>${body}<text x="6" y="10" font-size="6" fill="#2c3a2a">ÉMERA · mapa de lotes e quadras (estudo ilustrativo)</text></svg>`;
}
function lotsCsv(stock:Record<string,LotStatus>){
  const f=(v:number)=>v.toFixed(2).replace('.',',');
  const rows=lots.map(l=>{const o=commercialTerms(l.id,l.area);return [l.id,l.block,l.street,f(l.area),f(l.front.value),statusInfo[stock[l.id]].label,o.price?f(o.price):'Sob consulta'].join(';');});
  return '﻿'+['ÉMERA · TABELA ILUSTRATIVA DE LOTES · SEM VALIDADE DE OFERTA','Lote;Quadra;Rua;Área (m²);Frente (m);Situação demonstrativa;Valor ilustrativo (R$)',...rows].join('\r\n');
}

export default function EmeraPresentation({selected,stock,initialTab='Visão geral',onClose,onExplore,onSelect}:{selected:string;stock:Record<string,LotStatus>;initialTab?:EmeraTab;onClose:()=>void;onExplore:(area?:string)=>void;onSelect:(id:string)=>void}){
  const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),body=useRef<HTMLDivElement>(null);
  const [tab,setTab]=useState<EmeraTab>(initialTab);
  const [group,setGroup]=useState('Todas');
  const [viewer,setViewer]=useState<number|null>(null);
  const [local,setLocal]=useState<Media[]>([]);
  const [message,setMessage]=useState('');
  const [lotId,setLotId]=useState(lotById.has(selected)?selected:lots[0].id);
  const [rate,setRate]=useState(4),[years,setYears]=useState(5);
  const [payments,setPayments]=useState<Record<string,PaymentInputs>>({});
  const urls=useRef<string[]>([]);
  useEffect(()=>{dialog.current?.showModal();let alive=true;
    loadMaterials().then(items=>{if(!alive)return;setLocal(items.filter(i=>!i.type.includes('pdf')).map(i=>{const src=URL.createObjectURL(i.file);urls.current.push(src);return {id:i.id,src,title:i.name,caption:'Adicionado neste aparelho · não faz parte do link público.',group:i.category||'Neste aparelho',local:true,video:i.type.startsWith('video/')};}));}).catch(()=>{});
    return()=>{alive=false;urls.current.forEach(URL.revokeObjectURL);};},[]);
  useEffect(()=>{body.current?.scrollTo({top:0});},[tab]);
  const media:Media[]=useMemo(()=>[...shots.map(s=>({id:s.id,src:G+s.file,title:s.title,caption:s.caption,group:s.group})),...local],[local]);
  const visible=media.filter(m=>group==='Todas'||m.group===group);
  const open=(m:Media)=>{setViewer(visible.indexOf(m)>=0?visible.indexOf(m):0);};
  const openShot=(id:string)=>{setGroup('Todas');setTab('Galeria');setViewer(media.findIndex(m=>m.id===id));};
  const step=useCallback((d:number)=>setViewer(v=>v===null?v:(v+d+visible.length)%visible.length),[visible.length]);
  useEffect(()=>{if(viewer===null)return;const key=(e:KeyboardEvent)=>{if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setViewer(null);}};window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);},[viewer,step]);
  const chooseLot=(id:string)=>{setLotId(id);onSelect(id);};
  async function addFiles(files:FileList|null){
    if(!files)return;let added=0;
    for(const file of Array.from(files)){
      if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(file.type)){setMessage('Use JPG, PNG, WebP, MP4 ou WebM.');continue;}
      if(file.size>150*1024*1024){setMessage('Cada arquivo pode ter até 150 MB.');continue;}
      try{const id=crypto.randomUUID();await saveMaterial({id,name:file.name,type:file.type,file,category:'Neste aparelho'});const src=URL.createObjectURL(file);urls.current.push(src);setLocal(p=>[...p,{id,src,title:file.name,caption:'Adicionado neste aparelho · não faz parte do link público.',group:'Neste aparelho',local:true,video:file.type.startsWith('video/')}]);added++;}catch{setMessage('Não foi possível salvar neste aparelho.');}
    }
    if(added)setMessage(`${added} arquivo(s) adicionados à galeria deste aparelho.`);if(input.current)input.current.value='';
  }
  async function remove(m:Media){try{await removeMaterial(m.id);setLocal(p=>p.filter(x=>x.id!==m.id));URL.revokeObjectURL(m.src);setViewer(null);}catch{setMessage('Não foi possível remover.');}}
  const download=(name:string,content:string,type:string)=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
  const openSvg=()=>{const url=URL.createObjectURL(new Blob([lotsSvg(stock)],{type:'image/svg+xml'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);};

  const lot=lotById.get(lotId)!,offer=commercialTerms(lot.id,lot.area),base=offer.price||0,future=projection(base,rate,years)!;
  const counts={available:lots.filter(l=>stock[l.id]==='available').length};
  const areaRange=[Math.min(...lots.map(l=>l.area)),Math.max(...lots.map(l=>l.area))];
  const current=viewer!==null?visible[viewer]:null;

  const facts=<div className="em-facts">
    <div><b>{lots.length}</b><span>lotes</span></div><div><b>{blockNames.length}</b><span>quadras</span></div>
    <div><b>{number(areaRange[0]).replace(',00','')}–{number(areaRange[1]).replace(',00','')}</b><span>m² por lote</span></div>
    <div><b>{plan.roads.length}</b><span>vias internas</span></div><div><b>{counts.available}</b><span>disponíveis na demonstração</span></div>
  </div>;

  const leisure=[
    {id:'piscina',icon:<Waves size={18}/>,title:'Piscina e deck',text:'Piscina de 18 × 8 m, piscina infantil, espreguiçadeiras, pergolado com sofás e cerca de vidro.',area:'area-2'},
    {id:'quiosque',icon:<Trees size={18}/>,title:'Quiosque gourmet',text:'Churrasqueira com coifa, bancadas, mesa comunitária e iluminação para as noites de serra.',area:'area-2'},
    {id:'quadra-areia',icon:<Mountain size={18}/>,title:'Quadra de areia',text:'Quadra oficial de vôlei de areia (16 × 8 m), com bancos e caminho até a avenida.',area:'area-1'},
    {id:'playground',icon:<Trees size={18}/>,title:'Playground',text:'Balanço, torre com escorregador, gangorra e brinquedos de mola sobre piso emborrachado.',area:'area-1'},
    {id:'letreiro-entrada',icon:<Compass size={18}/>,title:'Chegada e convivência',text:'Letreiro iluminado, pergolado com mesas de piquenique, bicicletário e caminhos arborizados.',area:'area-1'},
  ];

  return <dialog ref={dialog} className="pr-presentation em-presentation" aria-label="Apresentação do Émera" onCancel={e=>{if(viewer!==null){e.preventDefault();setViewer(null);}else onClose();}} onClose={onClose}>
    <header className="em-header">
      <EmeraLogo variant="full" height={46}/>
      <div className="em-header-copy"><span className="pr-eyebrow">LOTEAMENTO · CAMPOS DE CIMA DA SERRA · VACARIA, RS</span><h2>Viver perto do essencial.</h2></div>
      <button onClick={onClose} aria-label="Fechar apresentação"><X size={21}/></button>
    </header>
    <nav className="em-tabs" aria-label="Seções da apresentação">{emeraTabs.map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setViewer(null);}}>{t}</button>)}</nav>
    <div className="em-body" ref={body} key={tab}>

      {tab==='Visão geral'&&<>
        <section className="em-hero" style={{backgroundImage:`url(${G}aerea-entardecer.webp)`}}>
          <div className="em-hero-copy"><EmeraLogo variant="word" height={34}/><h3>Um bairro planejado entre araucárias, campo aberto e a luz da serra.</h3><p>{lots.length} lotes em {blockNames.length} quadras, ruas arborizadas e lazer completo: piscina, quiosque, quadra de areia e playground.</p>
            <div className="em-hero-actions"><button className="em-primary" onClick={()=>onExplore()}>Explorar em 3D <ArrowRight size={16}/></button><button className="em-ghost" onClick={()=>setTab('Galeria')}><ImageIcon size={16}/>Ver imagens</button></div></div>
          <small>Imagem do cenário 3D · ilustrativa</small>
        </section>
        {facts}
        <h3 className="em-title">Destaques</h3>
        <div className="em-highlights">{['piscina','avenida','playground','casas'].map(id=>{const s=byId(id);return <button key={id} onClick={()=>openShot(id)}><img src={G+s.file} alt={s.title} loading="lazy"/><span><b>{s.title}</b><small>{s.caption}</small></span></button>;})}</div>
        <div className="em-pillars">
          <div><Trees size={22}/><b>Natureza preservada</b><p>Capões de araucária e campo nativo emolduram o loteamento.</p></div>
          <div><Waves size={22}/><b>Lazer de clube</b><p>Áreas comuns pensadas para todas as idades, perto de casa.</p></div>
          <div><MapIcon size={22}/><b>Traçado planejado</b><p>Avenida central, anel viário e lotes de 12 m com esquinas amplas.</p></div>
        </div>
        <p className="em-note">Apresentação comercial ilustrativa. Implantação, relevo, paisagismo, equipamentos e casas são estudo visual e dependem de projeto e aprovação. Disponibilidade e valores são demonstrativos.</p>
      </>}

      {tab==='Galeria'&&<>
        <div className="em-intro"><div><span className="pr-eyebrow">{media.length} IMAGENS · CENÁRIO 3D DO ÉMERA</span><h3>O projeto, por todos os ângulos.</h3></div><button className="em-ghost" onClick={()=>input.current?.click()}><Plus size={16}/>Adicionar neste aparelho</button></div>
        <nav className="em-chips">{['Todas',...groups,...(local.length?['Neste aparelho']:[])].map(g=><button key={g} aria-pressed={group===g} onClick={()=>{setGroup(g);setViewer(null);}}>{g}</button>)}</nav>
        <div className="em-masonry">{visible.map((m,i)=><figure key={m.id} className={i===0&&group==='Todas'?'em-wide':''}><button onClick={()=>open(m)}>{m.video?<video src={m.src} muted preload="metadata"/>:<img src={m.src} alt={m.title} loading="lazy"/>}<Expand size={16} className="em-expand"/></button><figcaption><b>{m.title}</b><span>{m.group}</span>{m.local&&<button aria-label={'Remover '+m.title} onClick={()=>void remove(m)}><Trash2 size={13}/></button>}</figcaption></figure>)}</div>
        <p className="em-note">Imagens renderizadas do cenário 3D, sem retoque. Materiais adicionados ficam apenas neste navegador.</p>
      </>}

      {tab==='Lazer'&&<>
        <div className="em-intro"><div><span className="pr-eyebrow">ÁREAS COMUNS</span><h3>Lazer completo, a poucos passos.</h3></div></div>
        <div className="em-leisure">{leisure.map(l=>{const s=byId(l.id);return <article key={l.id}><button className="em-leisure-img" onClick={()=>openShot(l.id)}><img src={G+s.file} alt={l.title} loading="lazy"/></button><div><span className="em-icon">{l.icon}</span><h4>{l.title}</h4><p>{l.text}</p><button className="em-link" onClick={()=>onExplore(l.area)}>Ver no 3D <ArrowRight size={14}/></button></div></article>;})}</div>
        <p className="em-note">Equipamentos ilustrativos, propostos para a apresentação. Dimensões e itens finais dependem do projeto de lazer.</p>
      </>}

      {tab==='Implantação'&&<>
        <div className="em-intro"><div><span className="pr-eyebrow">TRAÇADO E LOTES</span><h3>Doze quadras, um desenho só.</h3></div><button className="em-ghost" onClick={openSvg}><MapIcon size={16}/>Abrir mapa de lotes</button></div>
        <div className="em-plan"><button onClick={()=>openShot('planta')}><img src={G+'planta.webp'} alt="Planta do Émera vista de cima"/></button>
          <aside><h4>Como o loteamento se organiza</h4><ul>
            <li><b>Avenida central</b><span>Do letreiro de entrada até a Av. Émera, ao norte.</span></li>
            <li><b>Anel viário</b><span>Ruas 05, 06 e 07 contornam as quadras e ligam as transversais.</span></li>
            <li><b>Lotes</b><span>Frentes de 10 a 16 m, profundidade de 22 a 30 m; esquinas maiores nas quadras novas.</span></li>
            <li><b>Lazer</b><span>Recreação junto à entrada, piscina e quiosque na área ao lado da avenida.</span></li>
          </ul>{facts}</aside></div>
        <h3 className="em-title">Quadras</h3>
        <div className="em-blocks">{blockNames.map(b=>{const ls=lots.filter(l=>l.block===b),free=ls.filter(l=>stock[l.id]==='available').length;return <div key={b}><b>Quadra {b}</b><span>{ls.length} lotes · {free} disponíveis</span><small>{number(Math.min(...ls.map(l=>l.area))).replace(',00','')}–{number(Math.max(...ls.map(l=>l.area))).replace(',00','')} m²</small></div>;})}</div>
        <p className="em-note">Quadras I a L, Ruas 05 a 07 e a Av. Émera são ampliação ilustrativa sobre a prancha urbanística original.</p>
      </>}

      {tab==='Localização'&&<>
        <div className="em-intro"><div><span className="pr-eyebrow">LOCALIZAÇÃO E CONTEXTO</span><h3>Émera, nos Campos de Cima da Serra.</h3></div><a className="em-ghost" href="https://www.google.com/maps/search/?api=1&query=Vacaria%2C+RS" target="_blank" rel="noreferrer"><MapPin size={16}/>Abrir no Google Maps</a></div>
        <div className="em-location">
          <section className="em-map"><iframe title="Mapa de Vacaria, RS" src="https://maps.google.com/maps?q=Vacaria%2C%20RS&z=11&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><span><MapPin size={15}/>O pino marca a cidade de Vacaria. O endereço do Émera será confirmado.</span></section>
          <figure className="em-location-art"><img src={G+'horizonte.webp'} alt="Campo aberto até o horizonte"/><figcaption><b>Paisagem de altitude</b><span>Coxilhas, campo nativo e capões de araucária: o cenário típico dos Campos de Cima da Serra.</span></figcaption></figure>
        </div>
        <div className="em-context">
          <div><b>Vacaria, RS</b><p>Cidade dos Campos de Cima da Serra, conhecida pelo clima de altitude, pelos pomares e pela tradição gaúcha.</p></div>
          <div><b>Acessos rodoviários</b><p>A cidade é cortada pelas rodovias BR-116 e BR-285, que a ligam à Serra Gaúcha, ao planalto e a Santa Catarina.</p></div>
          <div><b>Distâncias de referência</b><p>Caxias do Sul ≈ 100 km · Porto Alegre ≈ 240 km · Lages (SC) ≈ 140 km, a partir do centro de Vacaria.</p></div>
        </div>
        <div className="em-pending"><MapPin size={20}/><p><b>Próximos passos desta seção.</b> Endereço, acessos do terreno e distâncias até comércio, escolas e saúde entram após a validação da localização.</p></div>
        <p className="em-note">Distâncias aproximadas por rodovia, a partir da cidade; não do terreno. A cidade no horizonte das imagens é ilustrativa.</p>
      </>}

      {tab==='Condições'&&<>
        <PaymentSimulator reference={false} saved={payments} onSave={(id,v)=>setPayments(s=>({...s,[id]:v}))} selected={lotId} stock={stock} onSelect={chooseLot}/>
        <details className="em-valuation"><summary><TrendingUp size={18}/>Explorar uma hipótese de valorização</summary>
          <div className="pr-finance-grid"><section className="pr-finance-card"><span className="pr-eyebrow">LOTE {lot.id} · {number(lot.area)} m²</span><h3>{money(base)}</h3><p>Valor ilustrativo atual</p><label>Hipótese anual <b>{rate}%</b><input aria-label="Hipótese de valorização anual" type="range" min="-10" max="20" step=".5" value={rate} onChange={e=>setRate(+e.target.value)}/></label><label>Prazo <b>{years} anos</b><input aria-label="Prazo da projeção" type="range" min="1" max="10" value={years} onChange={e=>setYears(+e.target.value)}/></label></section>
          <section className="pr-finance-explanation"><span className="pr-eyebrow">RESULTADO DA HIPÓTESE EM {years} ANOS</span><h3>{money(future)}</h3><p>Cálculo composto com a taxa escolhida. Não é avaliação imobiliária, previsão de mercado nem garantia de retorno.</p></section></div>
        </details>
      </>}

      {tab==='Empresa'&&<>
        <section className="em-brand"><EmeraLogo variant="full" height={150}/><p>Émera nasce para criar lugares onde a vida acontece com mais calma, mais natureza e mais encontro. Um loteamento pensado do traçado ao paisagismo, para quem quer construir o próximo capítulo na serra.</p></section>
        <div className="em-pillars em-pillars-4">
          <div><Trees size={22}/><b>Respeito à paisagem</b><p>Araucárias, campo nativo e relevo como ponto de partida.</p></div>
          <div><MapIcon size={22}/><b>Planejamento</b><p>Ruas, lotes e áreas comuns desenhados em conjunto.</p></div>
          <div><Waves size={22}/><b>Convivência</b><p>Lazer que aproxima vizinhos e famílias.</p></div>
          <div><Compass size={22}/><b>Transparência</b><p>Informação clara em cada etapa, do lote à escritura.</p></div>
        </div>
        <div className="em-brand-strip"><img src={G+'letreiro-entrada.webp'} alt="Letreiro Émera na entrada"/><img src={G+'letreiro-noite.webp'} alt="Letreiro Émera à noite"/></div>
        <p className="em-note">Texto institucional de apresentação. Dados da empresa, registros e contatos comerciais serão incluídos pela equipe Émera.</p>
      </>}

      {tab==='Documentos'&&<>
        <div className="em-intro"><div><span className="pr-eyebrow">PARA CONSULTAR E COMPARTILHAR</span><h3>Documentos do Émera.</h3></div></div>
        <div className="em-docs">
          <article><MapIcon size={24}/><div><b>Mapa de lotes e quadras</b><p>Todos os {lots.length} lotes, com identificação e situação demonstrativa. Abra, amplie ou imprima.</p></div><button onClick={openSvg}>Abrir</button><button onClick={()=>download('emera-mapa-de-lotes.svg',lotsSvg(stock),'image/svg+xml')}><Download size={14}/>Baixar</button></article>
          <article><FileSpreadsheet size={24}/><div><b>Tabela de lotes</b><p>Quadra, rua, área, frente, situação e valor ilustrativo de cada lote (CSV para Excel).</p></div><button onClick={()=>download('emera-tabela-de-lotes.csv',lotsCsv(stock),'text/csv;charset=utf-8')}><Download size={14}/>Baixar</button></article>
          <article><ImageIcon size={24}/><div><b>Planta ilustrada</b><p>Vista de cima do cenário 3D, em alta resolução.</p></div><button onClick={()=>openShot('planta')}>Abrir</button><a href={G+'planta.webp'} download="emera-planta.webp"><Download size={14}/>Baixar</a></article>
          <article><ImageIcon size={24}/><div><b>Kit de imagens</b><p>{shots.length} imagens em Full HD para redes sociais e materiais de venda.</p></div><button onClick={()=>setTab('Galeria')}>Ver</button></article>
          <article><FileText size={24}/><div><b>Prancha urbanística de referência</b><p>Prancha original recebida (julho de 2024), anterior à ampliação ilustrativa. Não comprova aprovação.</p></div><a href="/assets/priorita/presentation/urbanistico-referencia.pdf" target="_blank" rel="noreferrer">Abrir</a></article>
        </div>
        <p className="em-note">Documentos gerados a partir do estudo visual. Memorial, registro e contratos serão anexados quando aprovados.</p>
      </>}

      {message&&<div className="pr-material-message" role="status">{message}<button onClick={()=>setMessage('')} aria-label="Fechar mensagem"><X size={15}/></button></div>}
    </div>
    <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>void addFiles(e.target.files)}/>
    <footer className="em-footer"><span>Émera · apresentação ilustrativa</span><button onClick={onClose}>Voltar ao 3D <ArrowRight size={15}/></button></footer>

    {current&&<div className="em-viewer" role="dialog" aria-label={current.title}>
      <button className="em-viewer-close" onClick={()=>setViewer(null)} aria-label="Fechar imagem"><X size={22}/></button>
      <button className="em-viewer-nav em-prev" onClick={()=>step(-1)} aria-label="Imagem anterior"><ArrowLeft size={22}/></button>
      {current.video?<video src={current.src} controls autoPlay playsInline/>:<img src={current.src} alt={current.title}/>}
      <button className="em-viewer-nav em-next" onClick={()=>step(1)} aria-label="Próxima imagem"><ArrowRight size={22}/></button>
      <div className="em-viewer-caption"><span>{(viewer??0)+1} / {visible.length} · {current.group}</span><b>{current.title}</b><p>{current.caption}</p><a href={current.src} download>Baixar <Download size={14}/></a></div>
      <div className="em-thumbs">{visible.map((m,i)=><button key={m.id} aria-pressed={i===viewer} onClick={()=>setViewer(i)}>{m.video?<span>▶</span>:<img src={m.src} alt="" loading="lazy"/>}</button>)}</div>
    </div>}
  </dialog>;
}
