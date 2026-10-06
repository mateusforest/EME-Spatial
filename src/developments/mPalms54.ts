import * as T from 'three';
import type {Own} from './mSurfaces';
export function terracePalms54(parent:T.Group,own:Own,positions:number[][]){
 const trunk=own(new T.CylinderGeometry(.12,.21,4.8,9));trunk.translate(0,2.4,0);const leaves:number[]=[];
 for(let f=0;f<13;f++)for(let j=0;j<18;j++)for(const side of [-1,1]){const a=f*Math.PI*2/13,t=j/18,r=.2+t*2.4,y=4.85+Math.sin(t*Math.PI)*.95-t*.5,l=.58*(1-t*.72),x=Math.cos(a)*r,z=Math.sin(a)*r;leaves.push(x,y,z,x+Math.cos(a+side*.87)*l,y-.11,z+Math.sin(a+side*.87)*l,x+Math.cos(a)*.15,y+.02,z+Math.sin(a)*.15);}
 const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(leaves,3));g.computeVertexNormals();
 const bark=own(new T.MeshStandardMaterial({color:'#a68e6b',roughness:.88})),green=own(new T.MeshStandardMaterial({color:'#687d4e',roughness:.84,side:T.DoubleSide}));
 for(const [geo,mat]of [[trunk,bark],[g,green]] as const){const mesh=own(new T.InstancedMesh(geo,mat,positions.length)),d=new T.Object3D();positions.forEach(([x,y,z,s=1],i)=>{d.position.set(x,y,z);d.rotation.y=i*1.92;d.scale.setScalar(s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);}
}
