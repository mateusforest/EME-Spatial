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

export function createHorizonSky(serra=false){
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
  if(serra){material.fragmentShader=serraSkyFragment;material.needsUpdate=true;}
  const sky=new T.Mesh(new T.SphereGeometry(25000,serra?48:24,serra?24:12),material);
  sky.name='Céu · horizonte contínuo';
  // Draw last: opaque ground rejects hidden sky fragments on mobile GPUs.
  sky.renderOrder=10;
  return sky;
}

/**
 * Serra sky: horizon-weighted atmosphere, warm scattering around the sun, sun-lit cumulus with grey bases,
 * thin cirrus, layered blue coxilhas on the horizon and a few stars at night. One full-screen shader, no textures.
 */
const serraSkyFragment=`uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDirection;uniform vec3 sunColor;
  uniform float daylight;uniform vec3 cloudColor;varying vec3 vDirection;
  float hash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+9.7;a*=.5;}return s;}
  void main(){
    vec3 d=normalize(vDirection);float y=max(d.y,0.);
    float toSun=max(0.,dot(d,sunDirection));
    float lowSun=1.-smoothstep(.05,.55,sunDirection.y);
    // atmosphere: deep zenith, pale and slightly warm towards the horizon
    float t=1.-exp(-y*3.4);
    vec3 color=mix(bottomColor*1.06,topColor,t);
    color+=sunColor*(pow(toSun,5.)*.09+pow(toSun,36.)*.20)*daylight*(.45+lowSun);
    color=mix(color,mix(color,sunColor,.42),lowSun*(1.-t)*pow(toSun,2.)*daylight);
    // stars
    float night=1.-smoothstep(.0,.5,daylight);
    vec2 sp=d.xz/(abs(d.y)+.35)*210.;
    color+=vec3(.9,.95,1.)*step(.9975,hash(floor(sp)))*night*smoothstep(.04,.3,d.y)*.8;
    if(d.y>.004){
      // cumulus: warped fbm on a flat cloud deck, lit from the sun side
      vec2 p=d.xz/(d.y+.11)*1.15;
      vec2 q=p+vec2(fbm(p*.6+3.1),fbm(p*.6+11.7))*.7;
      float n=fbm(q*1.05);
      float cover=smoothstep(.50,.72,n);
      float towards=fbm(q*1.05+sunDirection.xz*.16);
      float lit=clamp(.58+(n-towards)*3.6,0.,1.);
      float core=smoothstep(.60,.86,n);
      vec3 shade=mix(cloudColor*.56,bottomColor,.30);
      vec3 bright=mix(cloudColor,sunColor,(.30+.35*lowSun)*daylight)*1.10;
      vec3 cloud=mix(shade,bright,lit)*(1.-core*.22);
      float far=exp(-.055/(d.y+.02));
      cover*=smoothstep(.0,.10,d.y);
      color=mix(color,mix(bottomColor,cloud,far),cover*.92);
      // cirrus: thin streaks high up
      float cirrus=smoothstep(.56,.80,fbm(p*vec2(.42,2.3)+41.))*smoothstep(.18,.5,d.y)*.28;
      color=mix(color,mix(cloudColor,sunColor,.2*daylight),cirrus*(1.-cover));
    }
    // layered coxilhas fading into the haze: depth for the Campos de Cima da Serra horizon
    vec2 az=d.xz/max(.0001,length(d.xz));
    vec3 ridge=bottomColor*vec3(.52,.66,.72);
    float h1=.010+.090*(fbm(az*2.6+7.)-.30),h2=.002+.062*(fbm(az*4.7+19.)-.30),h3=-.006+.040*(fbm(az*8.5+31.)-.30);
    color=mix(color,mix(bottomColor,ridge,.30),(1.-smoothstep(-.003,.003,d.y-h1)));
    color=mix(color,mix(bottomColor,ridge,.52),(1.-smoothstep(-.003,.003,d.y-h2)));
    color=mix(color,mix(bottomColor,ridge*vec3(.92,1.,.90),.70),(1.-smoothstep(-.003,.003,d.y-h3)));
    color=mix(color,bottomColor,(1.-smoothstep(-.05,.0,d.y))*.55);
    float disc=smoothstep(.99991,.99996,toSun)*step(h1,d.y);
    color=mix(color,sunColor*1.4,clamp(disc*daylight,0.,1.));
    #ifdef TONE_MAPPING
      color=srGrade(color);
    #endif
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
  }`;