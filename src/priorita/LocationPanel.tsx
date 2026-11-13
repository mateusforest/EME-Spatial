import {ArrowUpRight,MapPin} from 'lucide-react';
import {lots,areas,plan} from './model';
const polygon=(p:number[][])=>p.map(v=>v.join(',')).join(' ');
const all=lots.flatMap(l=>l.polygon),minX=Math.min(...all.map(p=>p[0]))-5,minY=Math.min(...all.map(p=>p[1]))-5;
const siteBox=`${minX} ${minY} ${Math.max(...all.map(p=>p[0]))-minX+5} ${Math.max(...all.map(p=>p[1]))-minY+5}`;
export default function LocationPanel(){
 return <>
  <div className="pr-section-intro"><div><span className="pr-eyebrow">LOCALIZAÇÃO E CONTEXTO</span><h3>Vacaria, Rio Grande do Sul.</h3></div><a className="pr-map-link" href="https://www.google.com/maps/search/?api=1&query=Vacaria%2C+RS" target="_blank" rel="noreferrer">Abrir Google Maps <ArrowUpRight size={16}/></a></div>
  <div className="pr-location-pair">
   <section className="pr-city-map"><iframe title="Mapa da cidade de Vacaria no Google Maps" src="https://maps.google.com/maps?q=Vacaria%2C%20RS&z=12&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/><div><MapPin size={17}/><span><b>Mapa da cidade</b><small>O pino identifica Vacaria. Não é a localização do loteamento.</small></span></div></section>
   <figure className="pr-location-aerial"><div className="pr-aerial-art"><img src="/assets/priorita/presentation/localizacao-ilustrativa-v11.webp" alt="Paisagem aérea fictícia com uma área de terreno destacada para demonstrar a apresentação"/><svg className="pr-aerial-site" viewBox={siteBox} aria-label="Implantação do Priorità sobre a paisagem fictícia">{plan.roads.map((r,i)=><polygon key={`r${i}`} points={polygon(r.polygon)} fill="#3f4b40" stroke="#f0dfb4" strokeWidth=".7"/>)}{areas.map(a=><polygon key={a.id} points={polygon(a.polygon)} fill="#839553b0" stroke="#efd9a2" strokeWidth="1"/>)}{lots.map(l=><polygon key={l.id} points={polygon(l.polygon)} fill="#d1ae5c40" stroke="#ffe7b3" strokeWidth=".6"/>)}</svg><span className="pr-location-callout pr-callout-access">Acesso principal<small>Trajeto simulado</small></span><span className="pr-location-callout pr-callout-city">Comércio e serviços<small>Ponto ilustrativo</small></span><span className="pr-location-callout pr-callout-green">Área verde<small>Entorno ilustrativo</small></span><span className="pr-aerial-pin">Priorità <small>Posição simulada</small></span><span className="pr-aerial-badge">IMAGEM GERADA · ILUSTRATIVA</span></div><figcaption><b>Uma possibilidade de implantação</b><span>Vista aérea fictícia, criada para demonstração. Contorno, proporções, vias e posição não representam o terreno real.</span></figcaption></figure>
  </div>
  <div className="pr-location-notice"><MapPin size={21}/><p><b>O endereço exato será confirmado.</b> O mapa real da cidade e a imagem ilustrativa cumprem funções diferentes. Distâncias, acessos e pontos próximos serão preenchidos após a validação da localização.</p></div>
  <div className="pr-pending-grid">{['Comércio e serviços','Educação e saúde','Acessos e mobilidade'].map(t=><div key={t}><b>{t}</b><span>Espaço reservado para pontos e distâncias validados.</span></div>)}</div>
 </>;
}
