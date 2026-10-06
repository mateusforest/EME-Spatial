import * as T from 'three';
import type {Own} from './mSurfaces';

/** Actual folded leaves remain visible at distance, unlike sparse alpha-mask cards. */
export function canopy51(own:Own){
 let seed=51017;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];
 const shades=[new T.Color('#32572c'),new T.Color('#4c7336'),new T.Color('#6b8b40'),new T.Color('#3e6730')];
 for(let i=0;i<210;i++){
  const angle=random()*Math.PI*2,z=random()*2-1,r=Math.pow(random(),.33)*.43,s=Math.sqrt(1-z*z);
  const centre=new T.Vector3(Math.cos(angle)*s*r,z*r*.8,Math.sin(angle)*s*r);
  const tilt=random()*Math.PI*2,axis=new T.Vector3(Math.cos(tilt),random()*.5-.25,Math.sin(tilt)).normalize();
  const side=new T.Vector3(-axis.z,.2,axis.x).normalize(),length=.105+random()*.07,width=.035+random()*.023;
  const points=[centre.clone().addScaledVector(axis,-length*.5),centre.clone().addScaledVector(side,width),centre.clone().add(new T.Vector3(0,.015,0)),centre.clone().addScaledVector(side,-width),centre.clone().addScaledVector(axis,length*.5)];
  const start=positions.length/3,color=shades[i%shades.length];for(const p of points){positions.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b);}
  indices.push(start,start+1,start+2,start,start+2,start+3,start+2,start+1,start+4,start+3,start+2,start+4);
 }
 const geometry=own(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=own(new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.8}));material.name='M51 layered botanical canopy';
 return {geometry,material};
}
