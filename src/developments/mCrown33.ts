import {greenMarbleMonogram} from './mMarbleMonogram';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';

/** Approved two-level crown concept. Dimensions are design-study values, not engineering. */
export const M_CROWN={revision:33,base:94,lowerWidth:36,lowerDepth:32,upperWidth:32,upperDepth:28,upperDeck:5,water:5.78,island:5.8,centerZ:-2.3};
function shape(w:number,d:number,r:number){const s=new T.Shape(),a=w/2,b=d/2;s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s;}
type Palette={solid:T.MeshStandardMaterial;timber:T.MeshStandardMaterial;bronze:T.MeshStandardMaterial;glass:T.MeshStandardMaterial;water:T.MeshStandardMaterial};
export function buildMCrown33(crown:T.Group,own:Own,m:Palette,_logo:(p:T.Group,x:number,y:number,z:number,s:number)=>void){
 const structure=new T.Group();structure.name='M two level crown architecture';crown.add(structure);structure.userData.revision=33;
 const batches=new Map<T.Material,T.BufferGeometry[]>();
 function add(g:T.BufferGeometry,mat:T.Material){if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const list=batches.get(mat)||[];list.push(g);batches.set(mat,list);}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material=m.solid,angle=0){const g=new T.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,y,z);add(g,mat);}
 function slab(s:T.Shape,y:number,h:number,z:number,mat:T.Material=m.solid){const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(0,y,z);add(g,mat);}
 function band(w:number,d:number,r:number,inset:number,y:number,h:number,mat:T.Material){const s=shape(w,d,r);s.holes.push(new T.Path(shape(w-2*inset,d-2*inset,Math.max(.1,r-inset)).getPoints(12).reverse()));slab(s,y,h,-2.3,mat);}
 function rail(w:number,d:number,r:number,y:number){const pts=shape(w,d,r).getPoints(12);for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],len=a.distanceTo(b),x=(a.x+b.x)/2,z=-(a.y+b.y)/2-2.3,angle=Math.atan2(b.y-a.y,b.x-a.x);box(x,y+.59,z,len,1.18,.035,m.glass,angle);box(x,y+1.19,z,len,.035,.04,m.bronze,angle);if(i%2===0)box(a.x,y+.59,-a.y-2.3,.035,1.18,.035,m.bronze);}}
 // Lower event floor has a wider perimeter terrace than the pool platform above.
 slab(shape(36,32,2.3),-.24,.74,-2.3);rail(35.5,31.5,2.1,.5);
 slab(shape(32,28,2.1),4.3,.70,-2.3);slab(shape(31.7,27.7,2),4.23,.055,-2.3,m.timber);
 rail(31.5,27.5,1.9,5);
 // Party salon enclosure, sliding central doors and structural supports.
 for(const z of [-12.8,8.2])for(let x=-12;x<=12;x+=2){
  if(z>0&&Math.abs(x)<2)continue;
  box(x,2.39,z,1.94,3.78,.035,m.glass);box(x-1,2.39,z,.06,3.78,.10,m.bronze);
 }
 for(const x of [-13,13])for(let z=-11.8;z<8;z+=2){box(x,2.39,z,.035,3.78,1.94,m.glass);box(x,2.39,z-1,.10,3.78,.06,m.bronze);}
 for(const x of [-11,-4,4,11])for(const z of [-9,6])box(x,2.4,z,.35,3.8,.4,m.timber);
 // The main core rises inside the central island; circulation never requires crossing water.
 box(0,4.7,-8.7,3.8,8.4,3.8);box(0,7.16,-6.77,1.6,2.7,.045,m.bronze);box(0,1.89,-6.77,1.6,2.7,.045,m.bronze);
 // Closed 360-degree pool ring, offset around a smaller dry island.
 const basin=shape(28,24,1.8);const hole=shape(22,16,1.65);basin.holes.push(new T.Path(hole.getPoints(12).map(p=>new T.Vector2(p.x,p.y+.7)).reverse()));
 slab(basin,5,.77,-2.3);
 const surface=shape(27.94,23.94,1.77);const inner=shape(22,16,1.65);surface.holes.push(new T.Path(inner.getPoints(12).map(p=>new T.Vector2(p.x,p.y+.7)).reverse()));slab(surface,5.77,.01,-2.3,m.water);
 slab(shape(22,16,1.65),5,.8,-3);
 band(28.04,24.04,1.82,.045,5.21,.57,m.water);
 band(28.6,24.6,2.1,.30,5.04,.075,m.bronze);
 // A dry upper perimeter ledge separates overflow from the guarded outer edge.
 band(28.85,24.85,2.2,.10,5,.13,m.solid);
 // Central open bar pavilion: no full-width skyline-blocking wall.
 slab(shape(16,7.6,1.1),9.05,.34,-4.4,m.timber);
 for(const x of [-7.15,7.15])for(const z of [-7.2,-1.5])box(x,7.42,z,.27,3.24,.32,m.timber);
 box(0,6.38,-2.4,11.4,1.16,1.25);box(0,7.15,-7,10.7,2.7,.18,m.timber);
 // Compact support behind enlarged sculptural logo, elevated above the pavilion.
 // Logo stands alone: rear slatted backing removed in revision 34.
 for(const x of [-5.04,5.04])box(x,9.65,-4.9,.22,.60,.30,m.bronze);
 const monogram=greenMarbleMonogram(own);monogram.position.set(0,9.46,-4.9);monogram.scale.setScalar(1.55);crown.add(monogram);
 for(const [mat,parts] of batches){const flat=parts.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),mat);mesh.name='Crown33 '+mat.name;structure.add(mesh);}}
 crown.userData.crownRevision=33;
}

export function finishMCrown33(crown:T.Group,own:Own,finish:{finishStone:(m:T.MeshStandardMaterial)=>void;finishWood:(m:T.MeshStandardMaterial)=>void}){
 // Static, tiny normal map keeps water legible without continuous rendering.
 const pixels=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const u=x/128*Math.PI*2,v=y/128*Math.PI*2,i=(y*128+x)*4,nx=.3*Math.cos(4*u+3*v)+.14*Math.cos(9*u-5*v),ny=.23*Math.cos(4*u+3*v)-.1*Math.cos(9*u-5*v),nz=1/Math.sqrt(1+nx*nx+ny*ny);pixels[i]=(nx*nz*.5+.5)*255;pixels[i+1]=(ny*nz*.5+.5)*255;pixels[i+2]=(nz*.5+.5)*255;pixels[i+3]=255;}
 const ripple=own(new T.DataTexture(pixels,128,128));ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(.4,.4);ripple.magFilter=ripple.minFilter=T.LinearFilter;ripple.needsUpdate=true;
 crown.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material.name==='Reference rooftop water'){const mat=o.material as T.MeshStandardMaterial;mat.normalMap=ripple;mat.normalScale.set(.13,.13);mat.color.set('#3d9295');mat.roughness=.19;mat.metalness=.12;}});
 const root=new T.Group();root.name='M crown furniture web33';root.userData.finishOnly=true;crown.add(root);
 const stone=own(new T.MeshStandardMaterial({color:'#d9d0bf',roughness:.85}));finish.finishStone(stone);
 const wood=own(new T.MeshStandardMaterial());finish.finishWood(wood);
 const linen=own(new T.MeshStandardMaterial({color:'#e2dac9',roughness:1})),olive=own(new T.MeshStandardMaterial({color:'#405e48',roughness:1})),metal=own(new T.MeshStandardMaterial({color:'#50534b',metalness:.5,roughness:.4}));
 const batches=new Map<T.Material,T.BufferGeometry[]>(),plants:number[][]=[];
 function add(g:T.BufferGeometry,m:T.Material){const a=batches.get(m)||[];a.push(g);batches.set(m,a);}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,soft=false,rx=0){const g=soft?new RoundedBoxGeometry(w,h,d,1,Math.min(.08,h/3)):new T.BoxGeometry(w,h,d);g.rotateX(rx);g.translate(x,y,z);add(g,m);}
 function cyl(x:number,y:number,z:number,r:number,h:number,m:T.Material){const g=new T.CylinderGeometry(r,r,h,16);g.translate(x,y,z);add(g,m);}
 function sofa(x:number,y:number,z:number,w=3){box(x,y+.22,z,w,.25,1.1,wood,true);box(x,y+.43,z,w-.1,.22,1,linen,true);box(x,y+.75,z-.46,w,.65,.16,linen,true);for(const dx of [-w*.32,w*.32])box(x+dx,y+.72,z-.25,.42,.4,.14,olive,true);}
 function dining(x:number,z:number){box(x,1.24,z,3.4,.10,1.25,wood,true);for(const dx of [-1.3,1.3])box(x+dx,.86,z,.15,.72,.85,wood);for(const dx of [-1,0,1])for(const dz of [-1,1]){box(x+dx,.96,z+dz,.61,.15,.60,linen,true);box(x+dx,1.28,z+dz*1.24,.62,.54,.08,wood,true);for(const leg of [-.22,.22])box(x+dx+leg,.72,z+dz,.05,.4,.48,wood);}cyl(x,1.41,z,.16,.24,stone);}
 // Event salon: two dining settings, lounge and a closed gourmet/barbecue wall.
 dining(-7,1);dining(7,1);sofa(-7,.5,-6,4);sofa(7,.5,-6,4);
 for(const x of [-7,7]){box(x,3.4,1,3.1,.065,.13,metal);for(const dx of [-1,1])box(x+dx,3.84,1,.02,.84,.02,metal);}
 for(const x of [-7,7]){cyl(x,.88,-4.2,.8,.14,stone);cyl(x,.65,-4.2,.38,.36,stone);}
 box(7,1.1,-10.8,9,1.2,1.1,wood);box(7,1.75,-10.8,9.1,.1,1.2,stone);
 box(9,2.4,-11.1,2,1.3,.65,stone);box(9,2.27,-10.75,1.45,.65,.06,metal);for(let x=8.4;x<9.7;x+=.15)box(x,1.88,-10.70,.045,.04,.55,metal);
 box(9,3.54,-11.1,1.2,.95,.6,metal);
 for(const x of [-15.4,15.4])for(const z of [-7,4]){sofa(x,.5,z,2.2);cyl(x,.85,z+1.7,.5,.12,stone);}
 // Rooftop bar with shelves and seating, entirely within the dry island.
 box(0,7.03,-2.4,11.6,.13,1.35,stone,true);
 for(let x=-5.4;x<=5.4;x+=.22)box(x,6.4,-1.75,.05,1.1,.06,wood);
 for(const x of [-4.5,-3,-1.5,0,1.5,3,4.5]){cyl(x,6.51,-.7,.29,.14,linen);for(const dx of [-.18,.18])box(x+dx,6.12,-.7,.045,.64,.36,wood);box(x,6.79,-.47,.54,.45,.065,wood);}
 for(const y of [6.55,7.25,7.95]){box(0,y,-6.83,10,.07,.40,wood);for(const x of [-4,-2,2,4])cyl(x,y+.17,-6.72,.10,.27,stone);}
 // Front pool-facing loungers, with the central route left open.
 for(const x of [-7,-4,4,7]){
  for(const dx of [-.42,.42])for(const dz of [-.8,.8])box(x+dx,5.98,2+dz,.065,.36,.065,wood);
  box(x,6.15,2,1.15,.15,2.35,wood,true);box(x,6.3,2.4,1.05,.16,1.5,linen,true);box(x,6.52,1.32,1.05,.16,.98,linen,true,.48);box(x,6.41,2.82,1.06,.04,.28,olive,true);
 }
 for(const x of [-8.8,8.8]){sofa(x,5.8,-4.9,2.8);cyl(x,6.22,-3.25,.52,.12,stone);}
 // Pots on dry decks, never in water or on overflow collection channels.
 for(const [x,y,z,s] of [[-9.5,5.8,3.1,1],[9.5,5.8,3.1,1],[-9.4,5.8,-8,1],[9.4,5.8,-8,1],[-5,5.8,-9, .8],[5,5.8,-9,.8],[-15.6,.5,9.8,1.3],[15.6,.5,9.8,1.3],[-15.6,.5,-14,1.3],[15.6,.5,-14,1.3]]){cyl(x,y+.36*s,z,.57*s,.72*s,stone);plants.push([x,y+.72*s,z,s*1.8]);}
 for(const [m,parts] of batches){const flat=parts.map(g=>{if(!g.index)return g;const f=g.toNonIndexed();g.dispose();return f;});const g=mergeGeometries(flat,false);flat.forEach(g=>g.dispose());if(g){const mesh=new T.Mesh(own(g),m);mesh.name='Crown furniture';mesh.userData.finishOnly=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}}
 addMGalleryFoliage(root,own,plants);
}


