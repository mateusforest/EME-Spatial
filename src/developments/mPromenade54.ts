import * as T from 'three';
import {craft53} from './mCraft53';
import {addMGalleryFoliage} from './mGalleryFoliage';
import {patioPoint53} from './mPatioLayout53';
import {botany54} from './mBotany54';
import {M_SITE} from './mSiteLayout';
import type {Own,mSurfaces} from './mSurfaces';

export const PATHS54:{name:string;points:number[][];width:number}[]=[
 {name:'Alameda das duas torres',points:[[-22,43],[0,43],[24,42],[51,41],[81,43],[116,42],[153,38],[181,38]],width:4.2},
 {name:'Alameda do lago',points:[[78,42],[78,22],[79,-4],[79,-25],[78,-40],[80,-57],[99,-67],[120,-77]],width:3.4},
 {name:'Passeio Torre Lago',points:[[153,38],[183,32],[189,12],[189,-17],[179,-32],[154,-36],[128,-40],[116,-48],[126,-62]],width:3.4},
 {name:'Acesso Torre Lago',points:[[153,38],[153,29],[153,18],[153,10]],width:5},
 {name:'Clube e deck do lago',points:[[30,-33],[44,-33],[62,-33],[68,-43],[62,-53],[62,-67]],width:3},
 {name:'Passeio do jardim',points:[[24,43],[25,28],[25,10],[25,-12],[27,-32],[37,-53],[51,-65]],width:2.5},
];

export function promenade54(scene:T.Scene,own:Own,surfaces:ReturnType<typeof mSurfaces>){
 const root=new T.Group();root.name='Alamedas conectadas · LED 2700K';scene.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#e9dfcc',roughness:.85}));surfaces.finishStone(stone);
 const night54={value:0},paving54=own(stone.clone());
 paving54.onBeforeCompile=shader=>{shader.uniforms.promenadeNight54=night54;shader.vertexShader='varying float vWalkEdge54;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vWalkEdge54=uv.y;');shader.fragmentShader='uniform float promenadeNight54;varying float vWalkEdge54;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n float edge54=min(vWalkEdge54,1.0-vWalkEdge54);totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.0,.58,.22)*promenadeNight54*(.035+.75*exp(-pow(max(edge54,0.0)*6.5,1.25)));');};paving54.customProgramCacheKey=()=> 'promenade-warm-edge54';
 const wood=own(new T.MeshStandardMaterial({color:'#b3946b',roughness:.83}));surfaces.finishWood(wood);
 const metal=own(new T.MeshStandardMaterial({color:'#373e35',metalness:.6,roughness:.4}));
 const led=own(new T.MeshStandardMaterial({color:'#fff6e4',emissive:'#ffce84',emissiveIntensity:2.6,roughness:.4}));led.userData.noNightFill=true;
 const c=document.createElement('canvas');c.width=16;c.height=64;const ctx=c.getContext('2d')!,gradient=ctx.createLinearGradient(0,0,0,64);gradient.addColorStop(0,'rgba(255,190,85,0)');gradient.addColorStop(.5,'rgba(255,211,136,.70)');gradient.addColorStop(1,'rgba(255,190,85,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,64);
 const tex=own(new T.CanvasTexture(c));tex.colorSpace=T.SRGBColorSpace;
 const glow=own(new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));glow.toneMapped=false;
 let length=0;
 function strip(points:T.Vector3[],width:number,m:T.Material,y:number){const pos:number[]=[],uv:number[]=[],idx:number[]=[];let d=0;points.forEach((p,i)=>{const tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize(),normal=new T.Vector3(-tangent.z,0,tangent.x);if(i)d+=p.distanceTo(points[i-1]);for(const s of [-1,1]){const v=p.clone().addScaledVector(normal,width*.5*s);pos.push(v.x,p.y+y,v.z);uv.push(d/2,(s+1)/2);}if(i<points.length-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}});const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.receiveShadow=m===stone||m===paving54;root.add(mesh);return mesh;}
 function run(points:number[][],width:number,paving=true,closed=false,y=.39,terrain=false){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],y,p[1])),closed,'centripetal');const pts=curve.getPoints(Math.max(36,Math.ceil(curve.getLength()*1.2)));length+=curve.getLength()*2;
  if(terrain)for(const p of pts){const c=M_SITE.campus,edge=T.MathUtils.smoothstep(Math.max(c.minX-p.x,p.x-c.maxX,c.minZ-p.z,p.z-c.maxZ),0,30),outer=1-T.MathUtils.smoothstep(Math.max(Math.abs(p.x)-196,-p.z-191,p.z-28),0,44);p.y=.06+outer*Math.max(0,edge*(.9+Math.sin(p.x*.028+p.z*.014)*.85+Math.cos(p.z*.043-p.x*.008)*.55+Math.sin(p.x*.05-p.z*.022)*.24))+.175;}
  if(paving)strip(pts,width,paving54,0);
  for(const side of [-1,1]){const edge=pts.map((p,i)=>{const t=curve.getTangent(i/(pts.length-1));return p.clone().add(new T.Vector3(-t.z,0,t.x).multiplyScalar(side*(width*.5-.065)));});strip(edge,.055,led,.025);strip(edge,1.1,glow,.033);}
 }
 for(const path of PATHS54)run(path.points,path.width);
 // Follow precisely the same irregular shoreline as the existing lake promenade.
 const lake=Array.from({length:72},(_,i)=>{const a=i/72*Math.PI*2,r=(1+.095*Math.sin(a*3+.7)+.055*Math.sin(a*5+1.2))*1.1*1.06;return [65+Math.cos(a)*70*r,-116+Math.sin(a)*38*r];});run(lake,2.8,false,true,.30,true);
 run([[-41,38],[-54,18],[-57,-45],[-39,-94],[-62,-160],[-109,-191],[-185,-169],[-194,-62],[-181,26]],2.4,false,false,.3,true);
 run([[116,-48],[146,-59],[196,-90],[198,-153],[148,-181],[72,-182],[-12,-174],[-62,-160]],2.4,false,false,.3,true);
 run([[0,12],[0,24],[0,43]],6.7,false,false,.29);
 // Both residential streets follow the exact shared site mapping, so LEDs follow their curbs.
 for(const z of [115,160])for(const side of [-1,1]){const p=Array.from({length:91},(_,i)=>{const q=patioPoint53(-135+i*3.55,z+side*5.25);return [q.x,q.z];});run(p,.06,false,false,.27);}
 for(const x of [-140,190])for(const side of [-1,1])run(Array.from({length:25},(_,i)=>{const p=patioPoint53(x+side*5.25,115+i*45/24);return[p.x,p.z];}),.06,false,false,.27);
 for(const side of [-1,1])run(Array.from({length:28},(_,i)=>{const p=patioPoint53(side*6.5,73+i*42/27);return[p.x,p.z];}),.06,false,false,.27);
 const k=craft53(root,own),b=k.box;
 const seats:[[number,number,number],...number[][]]=[[37,38.3,0],[89,39.8,0],[126,37.8,0],[183,22,Math.PI/2],[83,-18,Math.PI/2],[113,-69,-.4],[30,-47,-.2]];
 for(const [x,z,a]of seats){const group=new T.Group();group.position.set(x,.39,z);group.rotation.y=a;root.add(group);const seat=craft53(group,own);for(let i=0;i<6;i++)seat.box(0,.46,-.40+i*.14,3.4,.09,.11,wood);for(let i=0;i<4;i++)seat.box(0,.75+i*.14,-.46,3.4,.10,.10,wood);for(const dx of [-1.25,1.25])seat.box(dx,.24,0,.09,.48,.80,metal);seat.box(0,.23,-.32,3.1,.035,.05,led);seat.flush();b(x,.54,z-1.25,4.4,.4,1.1,stone);addMGalleryFoliage(root,own,[-1.5,-.5,.5,1.5].map(dx=>[x+dx,.75,z-1.25,2.1]));}
 // Ground fixtures physically present alongside the paths; light washes remain a batched effect.
 for(const path of PATHS54){const curve=new T.CatmullRomCurve3(path.points.map(p=>new T.Vector3(p[0],0,p[1])));const n=Math.max(2,Math.floor(curve.getLength()/12));for(let i=0;i<=n;i++){const p=curve.getPoint(i/n),t=curve.getTangent(i/n),x=p.x-t.z*(path.width*.5+.5),z=p.z+t.x*(path.width*.5+.5);b(x,.76,z,.12,.76,.12,metal);b(x,1.10,z,.25,.05,.20,led);}}
 k.flush();const botany=botany54(root,own);root.userData.ledMetres=Math.round(length);return {root,update:(night:number)=>{night54.value=night;glow.opacity=night*.9;botany.update(night);}};
}
