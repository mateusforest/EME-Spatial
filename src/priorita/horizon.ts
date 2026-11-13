import * as T from 'three';

// An illustrative continuation of the site, never survey data. A fixed budget
// of coarse rings replaces the old white fade without extending site detail.
export const horizonRings=[500,515,530,550,570,600,640,740,880,1050,1250,1500,1800,2150,2550,3000,3600,4400,5400,6600,8000,10000,13000,17000];
const edgeSegments=160;
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

export function contextHeight(x:number,z:number,siteHeight:(x:number,z:number)=>number){
  const extent=Math.max(Math.abs(x),Math.abs(z));
  const blend=smooth(530,1250,extent);
  const hills=35+42*Math.sin(x*.0013+.6)+34*Math.cos(z*.00105-.3)
    +20*Math.sin((x-z)*.0017)+15*Math.sin((x+z)*.0021);
  const falloff=Math.max(0,Math.hypot(x,z)-3500);
  return (siteHeight(x,z)-.14)*(1-blend)+hills*blend-falloff*falloff*.000004;
}

export function createContextGeometry(siteHeight:(x:number,z:number)=>number,siteGeometry:T.BufferGeometry[]=[]){
  const positions:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[];
  const perRing=edgeSegments*4;
  const boundary=new Map<string,{y:number;color:number[];normal:number[];uv:number[]}>();
  const key=(x:number,z:number)=>`${Math.round(x/6.25)},${Math.round(z/6.25)}`;
  for(const geometry of siteGeometry){
    const p=geometry.getAttribute('position'),c=geometry.getAttribute('color'),n=geometry.getAttribute('normal'),t=geometry.getAttribute('uv');
    if(!c||!n||!t)continue;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i);
      if(Math.abs(Math.max(Math.abs(x),Math.abs(z))-500)>.025)continue;
      boundary.set(key(x,z),{y:p.getY(i),color:[c.getX(i),c.getY(i),c.getZ(i)],normal:[n.getX(i),n.getY(i),n.getZ(i)],uv:[t.getX(i),t.getY(i)]});
    }
  }
  const seamNormals:number[][]=[];
  for(const radius of horizonRings)for(let side=0;side<4;side++)for(let i=0;i<edgeSegments;i++){
    const p=-radius+2*radius*i/edgeSegments;
    const [x,z]=[[p,-radius],[radius,p],[-p,radius],[-radius,-p]][side];
    const edge=boundary.get(key(x/radius*500,z/radius*500));
    positions.push(x,radius===500&&edge?edge.y:contextHeight(x,z,siteHeight),z);
    // Match the Blender ground UV projection, including glTF's V direction.
    uv.push(...(radius===500&&edge?edge.uv:[x/7,1-z/7]));
    const distant=smooth(550,3200,radius);
    const patch=.5+.5*Math.sin(x*.0018+Math.sin(z*.002)*1.5)*Math.cos(z*.0013);
    const macro=.84-distant*(.025+patch*.045),blend=smooth(500,640,radius);
    const base=edge?.color||[.85,.85,.825];
    colors.push(base[0]*(1-blend)+macro*blend,base[1]*(1-blend)+macro*blend,base[2]*(1-blend)+macro*.97*blend);
    if(radius===500)seamNormals.push(edge?.normal||[0,1,0]);
  }
  for(let row=0;row<horizonRings.length-1;row++)for(let i=0;i<perRing;i++){
    const a=row*perRing+i,b=row*perRing+(i+1)%perRing,c=a+perRing,d=b+perRing;
    indices.push(a,b,c,b,d,c);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const normals=geometry.getAttribute('normal');
  seamNormals.forEach((n,i)=>normals.setXYZ(i,n[0],n[1],n[2]));
  return geometry;
}

export function createDistantGroves(siteHeight:(x:number,z:number)=>number){
  // Only silhouettes: shared 36-triangle crowns, no alpha leaves or shadows.
  const crowns=new T.InstancedMesh(new T.SphereGeometry(1,6,4),
    new T.MeshStandardMaterial({color:'#435b3c',roughness:1}),22*12*3);
  crowns.name='Horizonte ilustrativo · bosques distantes';
  let seed=9317,index=0;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const dummy=new T.Object3D(),color=new T.Color();
  for(let g=0;g<22;g++){
    const angle=g*2.39996,radius=850+random()*2150;
    const cx=Math.cos(angle)*radius,cz=Math.sin(angle)*radius;
    for(let tree=0;tree<12;tree++){
      const x=cx+(random()-.5)*190,z=cz+(random()-.5)*90,h=16+random()*13;
      const y=contextHeight(x,z,siteHeight);
      for(let lobe=0;lobe<3;lobe++){
        // Sink the silhouette into the coarse hillside so its base cannot float
        // above the interpolated surface between terrain rings.
        dummy.position.set(x+(lobe-1)*h*.3,y+h*(.25+random()*.08),z+(random()-.5)*h*.35);
        dummy.scale.set(h*.5,h*.48,h*.48);dummy.rotation.set(0,random()*Math.PI,0);dummy.updateMatrix();
        crowns.setMatrixAt(index,dummy.matrix);color.setScalar(.8+random()*.3);crowns.setColorAt(index++,color);
      }
    }
  }
  crowns.computeBoundingSphere();return crowns;
}

export function createHorizonSky(){
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    uniforms:{topColor:{value:new T.Color('#2e7db4')},bottomColor:{value:new T.Color('#9ebccc')},
      sunDirection:{value:new T.Vector3(1,1,1).normalize()},sunColor:{value:new T.Color('#ffdfac')},
      daylight:{value:1},cloudColor:{value:new T.Color('#dce8ee')}},
    vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDirection;uniform vec3 sunColor;
      uniform float daylight;uniform vec3 cloudColor;varying vec3 vDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec3 d=normalize(vDirection);float h=smoothstep(-.025,.64,d.y);
        vec3 color=mix(bottomColor,topColor,pow(h,.85));
        // A few thin high clouds; no volumetric march, texture download or animation loop.
        vec2 p=d.xz/max(.12,d.y)*vec2(1.6,1.9);
        float n=noise(p)*.6+noise(p*2.03+7.)*.28+noise(p*4.07+13.)*.12;
        float clouds=smoothstep(.60,.80,n)*smoothstep(.08,.24,d.y)*(1.-smoothstep(.72,.98,d.y));
        color=mix(color,cloudColor,clouds*.45);
        float alignment=max(0.,dot(d,sunDirection));
        float glow=pow(alignment,110.)*.2,disc=smoothstep(.99991,.99996,alignment);
        color=mix(color,sunColor,clamp((glow+disc)*daylight,0.,1.));
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  });
  const sky=new T.Mesh(new T.SphereGeometry(25000,24,12),material);
  sky.name='Céu · horizonte contínuo';
  // Draw last: opaque ground rejects hidden sky fragments on mobile GPUs.
  sky.renderOrder=10;
  return sky;
}
