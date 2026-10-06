import {useEffect,useRef} from 'react';
import {M_SITE,type MDestination} from './mSiteLayout';

export default function MSiteGuide({close,go}:{close:()=>void;go:(place:MDestination)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!;if(!dialog.open)dialog.showModal();},[]);
 const select=(place:MDestination)=>{go(place);close();};
 return <dialog ref={ref} className="m-site-guide" onClose={close} aria-labelledby="m-site-title">
  <button autoFocus className="m-card-close" aria-label="Fechar implantação" onClick={()=>ref.current?.close()}>×</button>
  <span className="m-eyebrow">EME SPATIAL · IMPLANTAÇÃO LOCAL</span><h2 id="m-site-title">Um lugar. Vários pontos de vista.</h2>
  <p>Este mapa acompanha o cenário navegável e a implantação da referência aérea. Frente e fundos são relativos à entrada do prédio; a orientação geográfica ainda está em estudo.</p>
  <svg viewBox="-185 -185 400 245" role="img" aria-label="Mapa: chegada à frente, piscina e quadras à direita, lago nos fundos e golfe no entorno">
   <rect x="-185" y="-185" width="400" height="245" rx="8" fill="#dce2d4"/>
   {M_SITE.golf.map((g,i)=><g key={i}><polyline points={g.points.map(p=>p.join(',')).join(' ')} fill="none" stroke="#a5b497" strokeWidth={g.width} strokeLinecap="round"/><ellipse cx={g.green[0]} cy={g.green[1]} rx="12" ry="9" fill="#8a9f80"/></g>)}
   <ellipse cx={M_SITE.lake.center[0]} cy={M_SITE.lake.center[1]} rx={M_SITE.lake.radius[0]} ry={M_SITE.lake.radius[1]} fill="#719c99"/>
   <rect x="-22" y="-15" width="44" height="30" rx="4" fill="#f7f4ea" stroke="#bdbaa9"/>
   <rect x="-10" y="-9" width="20" height="19" rx="2" fill="#3c5c4b"/>
   <rect x={M_SITE.pool[0]-19} y={M_SITE.pool[1]-23} width="40" height="54" rx="1" fill="#719c99"/>
   <rect x="85" y="-34" width="28" height="48" fill="#8a9f80" stroke="#f7f4ea"/><rect x="87" y="18" width="24" height="27" fill="#d0c2a4"/><rect x="-36" y="-8" width="8" height="51" fill="#777d75"/><rect x="34" y="-49" width="34" height="13" fill="#f7f4ea"/><path d="M 0 16 L 0 40 M -170 54 L 195 54" stroke="#b8b7a8" strokeWidth="5" fill="none"/>
   <g fill="#243e32" fontSize="8" textAnchor="middle"><text x="65" y="-116">Lago</text><text x="-100" y="-80">Golfe</text><text x="51" y="-29">Piscina / lazer</text><text x="99" y="8">Quadras</text><text x="0" y="29">Chegada</text><text x="0" y="-156">Fundos do empreendimento</text></g>
   <text x="0" y="5" textAnchor="middle" fill="white" fontSize="10">M</text>
  </svg>
  <div className="m-site-links">{(['Edifício','Alameda iluminada','Jardim e lazer','Parque e lago','Garagem','Quadras'] as MDestination[]).map(p=><button key={p} onClick={()=>select(p)}>Ver {p.toLowerCase()} ↗</button>)}</div>
  <h3>Explore em duas escalas</h3><p>Nas fachadas, use a barra de altura ou as setas para percorrer os andares. A bolinha acompanha a residência e abre informações e a visita interna. Nas áreas comuns, escolha “Caminhar aqui”: arraste para olhar e use WASD ou os botões para andar. Use “Voltar à vista geral” para retomar a órbita.</p>
  <h3>Como ler as vistas das residências</h3><p>A varanda principal olha para a chegada. O lazer fica à direita da torre; o lago, nos fundos à direita. O golfe envolve o conjunto, principalmente à esquerda e mais ao fundo. Altura, paredes, árvores e direção da câmera mudam o que aparece em cada ambiente.</p>
  <h3>Rooftop e fundos</h3><p>Acima do 22º andar, o rooftop comum reúne piscina, bar e lounge. A piscina privativa continua na varanda projetada da cobertura. Nas laterais e nos fundos, faixas curvas de pedra, brises e jardineiras acompanham a torre. Os vãos laterais são compartilhados com a visita interna; os posteriores mantêm vidro de privacidade. As projeções rasas não são varandas habitáveis.</p>
  <h3>O que ainda vamos compatibilizar</h3><p>Piscinas, quadras, galeria em dois pavimentos e acesso em rampa já têm posição nesta implantação. Academia, subsolo completo, dimensões definitivas, acessibilidade, circulação vertical e distribuição interna continuam em estudo.</p>
  <p className="m-site-note">As imagens de referência têm diferenças de implantação e de vista. Use este cenário para conferir posição e orientação; as imagens continuam como direção de acabamento. A piscina privativa da cobertura já faz parte da residência.</p>
  <p className="m-site-note"><a href="/assets/m/garage55/CREDITOS.html" target="_blank" rel="noreferrer">Créditos dos modelos do estacionamento ↗</a></p>
 </dialog>;
}


