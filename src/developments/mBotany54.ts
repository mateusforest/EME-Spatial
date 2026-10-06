import * as T from 'three';
import {canopy51} from './mCanopy51';
import {addMGalleryFoliage} from './mGalleryFoliage';
import type {Own} from './mSurfaces';
/** Shared botanical meshes keep the new forecourt and shaded paths inexpensive to draw. */
export function botany54(root:T.Group,own:Own){
 const bark=own(new T.MeshStandardMaterial({color:'#8b7860',roughness:.92})),leaf=own(new T.MeshStandardMaterial({color:'#597347',roughness:.85,side:T.DoubleSide}));
 const trunk=own(new T.CylinderGeometry(.17,.29,6,9));trunk.translate(0,3,0);
 const p:number[]=[];
 for(let f=0;f<15;f++)for(let j=0;j<22;j++)for(const side of [-1,1]){const a=f*Math.PI*2/15,t=j/22,r=.20+t*3.2,y=6+Math.sin(t*Math.PI)*1.2-t*.8,l=.75*(1-t*.74),x=Math.cos(a)*r,z=Math.sin(a)*r;p.push(x,y,z,x+Math.cos(a+.82*side)*l,y-.17,z+Math.sin(a+.82*side)*l,x+Math.cos(a)*.18,y+.01,z+Math.sin(a)*.18);}
 const frond=own(new T.BufferGeometry());frond.setAttribute('position',new T.Float32BufferAttribute(p,3));frond.computeVertexNormals();
 const palms=[[132,24,1.45],[144,25,1.22],[164,24,1.55],[176,18,1.30],[126,-15,1.45],[180,-20,1.25],[139,-31,1.45],[172,-32,1.2]];
 for(const [g,m]of [[trunk,bark],[frond,leaf]] as const){const mesh=own(new T.InstancedMesh(g,m,palms.length)),d=new T.Object3D();palms.forEach(([x,z,s],i)=>{d.position.set(x,.4,z);d.rotation.y=i*1.9;d.scale.setScalar(s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 const positions=[[36,37.2],[89,38],[126,35],[185,22],[83,-18],[112,-66],[32,-46]];
 const tree=canopy51(own),crowns=own(new T.InstancedMesh(tree.geometry,tree.material,positions.length*8)),trunks=own(new T.InstancedMesh(trunk,bark,positions.length)),d=new T.Object3D();
 positions.forEach(([x,z],i)=>{d.position.set(x,.4,z);d.scale.set(.78,.82,.78);d.rotation.set(0,0,0);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);for(let j=0;j<8;j++){const a=j*2.4;d.position.set(x+Math.cos(a)*.6,5.3+(j%3)*.38,z+Math.sin(a)*.6);d.scale.set(3.3,2.8,3.1);d.rotation.y=a;d.updateMatrix();crowns.setMatrixAt(i*8+j,d.matrix);}addMGalleryFoliage(root,own,[-1,1].map(s=>[x+s*.8,.4,z,2.5]));});crowns.receiveShadow=true;trunks.castShadow=true;root.add(trunks,crowns);
 const uplights=positions.filter((_,i)=>[0,2,3,4].includes(i)).map(([x,z])=>{const l=new T.PointLight('#ffe0a9',0,11,2);l.position.set(x,.7,z);l.userData.managed53=true;root.add(l);return l;});
 return {update:(night:number)=>uplights.forEach(l=>l.intensity=night*45)};
}
