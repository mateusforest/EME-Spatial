import * as T from 'three';
import {craft53,sign53} from './mCraft53';
import {patioPoint53} from './mPatioLayout53';
import type {mSurfaces,Own} from './mSurfaces';
/** Warps site surfaces with subdivision, retaining rigid, larger individual houses. */
export function refinePatio53(root:T.Group,own:Own,surfaces:ReturnType<typeof mSurfaces>){

 const stone=own(new T.MeshStandardMaterial({color:'#e1d6be',roughness:.7})),wood=own(new T.MeshStandardMaterial({color:'#aa8256',roughness:.75})),metal=own(new T.MeshStandardMaterial({color:'#454c43',roughness:.38,metalness:.6}));surfaces.finishStone(stone);surfaces.finishWood(wood);
 const lamp=own(new T.MeshStandardMaterial({color:'#fff0d3',emissive:'#ffdc9c',emissiveIntensity:2.4}));
 const finished=new Set<T.MeshStandardMaterial>();
 root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!(o.material instanceof T.MeshStandardMaterial))return;
  const m=o.material;if(!['Pátio honed limestone','Pátio natural oak','Pátio stone paving','Pátio linen'].includes(m.name))return;
  if(!finished.has(m)){finished.add(m);if(m.name==='Pátio natural oak')surfaces.finishWood(m);else if(m.name==='Pátio linen')surfaces.finishLinen(m);else surfaces.finishStone(m);}
  const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal'),uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/2.5;uv[i*2+1]=(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/2.5;}
  o.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
 });
 const houses=root.children.filter(o=>o.name.startsWith('Pátio house'));
 for(const house of houses){
  const group=new T.Group();group.name='M53 facade depth and portico';house.add(group);const k=craft53(group,own),b=k.box;
  const side=house.userData.variant===1?-1:1;
  // Strong mineral portal, projecting cornice and asymmetric timber screen; doors stay open.
  b(side*6.95,3.5,6.7,.48,6.3,1.15,stone);b(side*3.55,6.75,6.7,7.3,.36,1.15,stone);
  b(0,3.46,7.93,15.8,.09,.11,metal);b(0,6.72,5.7,15.7,.055,.08,lamp);
  for(let i=0;i<8;i++)b(side*(5.0+i*.22),5.15,5.45,.085,2.8,.34,wood);
  for(const x of [-5,0,5]){b(x,3.44,6.45,.5,.04,.12,lamp);}
  b(.5,3.27,7.0,2.6,.12,2.9,stone);b(.5,3.19,7.0,2.3,.025,2.6,wood);
  k.flush();
  const number=Number(house.name.match(/\d+/)?.[0]??1);sign53(group,own,String(number).padStart(2,'0'),2.0,1.72,5.54,.56);
  // web54: houses, approaches and plot borders use the SAME deformation below.
  // An independent rotation/scale made facades and driveways drift off their lots.
  house.userData.plotOrigin={x:house.position.x,z:house.position.z};
 }
 const dummy=new T.Object3D();
 function warpedGeometry(source:T.BufferGeometry){
  const flat=source.index?source.toNonIndexed():source.clone(),p=flat.getAttribute('position'),uv=flat.getAttribute('uv'),colors=flat.getAttribute('color');
  type V={p:T.Vector3;uv:T.Vector2;color:T.Color};const output:number[]=[],tex:number[]=[],rgb:number[]=[];
  const vertex=(i:number):V=>({p:new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)),uv:uv?new T.Vector2(uv.getX(i),uv.getY(i)):new T.Vector2(),color:colors?new T.Color().setRGB(colors.getX(i),colors.getY(i),colors.getZ(i)):new T.Color(1,1,1)});
  const mid=(a:V,b:V):V=>({p:a.p.clone().lerp(b.p,.5),uv:a.uv.clone().lerp(b.uv,.5),color:a.color.clone().lerp(b.color,.5)});
  for(let i=0;i<p.count;i+=3){const pending:[V,V,V][]=[[vertex(i),vertex(i+1),vertex(i+2)]];
   while(pending.length){const [a,b,c]=pending.pop()!,lengths=[a.p.distanceToSquared(b.p),b.p.distanceToSquared(c.p),c.p.distanceToSquared(a.p)],max=Math.max(...lengths);
    if(max>64){const edge=lengths.indexOf(max);if(edge===0){const m=mid(a,b);pending.push([a,m,c],[m,b,c]);}else if(edge===1){const m=mid(b,c);pending.push([a,b,m],[a,m,c]);}else{const m=mid(c,a);pending.push([a,b,m],[m,b,c]);}continue;}
    for(const v of [a,b,c]){const w=patioPoint53(v.p.x,v.p.z);output.push(w.x,v.p.y,w.z);tex.push(v.uv.x,v.uv.y);rgb.push(v.color.r,v.color.g,v.color.b);}
   }
  }flat.dispose();const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(output,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();return g;
 }
 root.updateMatrixWorld(true);
 function visit(o:T.Object3D){
  if(o instanceof T.InstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,dummy.matrix);dummy.matrix.premultiply(o.matrixWorld);dummy.matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);const p=patioPoint53(dummy.position.x,dummy.position.z);dummy.position.x=p.x;dummy.position.z=p.z;dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);}o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}
  else if(o instanceof T.Mesh){o.updateWorldMatrix(true,false);const g=o.geometry.clone().applyMatrix4(o.matrixWorld);o.geometry=warpedGeometry(g);g.dispose();o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);o.geometry.computeBoundingBox();if(o.geometry.boundingBox!.max.y<.9)o.castShadow=false;}
  for(const child of o.children)visit(child);
  if(!(o instanceof T.Mesh)){o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);}
 }
 for(const o of root.children)visit(o);
 // Warm light pools use a local shader field, avoiding a light per dwelling and street pole.
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!(m instanceof T.MeshStandardMaterial)||m.transparent||m===lamp||m.userData.patioLight53)continue;m.userData.patioLight53=true;
  const old=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=(shader,renderer)=>{old.call(m,shader,renderer);shader.uniforms.patioNight53=patioNight53;shader.vertexShader='varying vec3 vPatio53;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 wp53=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   wp53=instanceMatrix*wp53;
   #endif
   vPatio53=(modelMatrix*wp53).xyz;`);shader.fragmentShader='uniform float patioNight53; varying vec3 vPatio53;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float wash53=exp(-pow((vPatio53.y-3.65)*1.1,2.0))*.18+exp(-pow((vPatio53.y-7.3)*1.1,2.0))*.13;
   totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.0,.70,.39)*patioNight53*(.055+wash53);`);};m.customProgramCacheKey=()=>key+'|patio53';m.needsUpdate=true;
 }});
 root.userData.revision=54;root.userData.footprint='Shared curved mapping for plots, buildings and driveways';
 return surfaces.ready;
}
export const patioNight53={value:0};
