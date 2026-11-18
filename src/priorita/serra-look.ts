import * as T from 'three';

/**
 * Priorità · Serra — acabamento visual procedural (sem novos downloads de textura).
 * Campo nativo com manchas de palha/oliva, sombra dos capões, folhagem com volume,
 * e materiais de alvenaria, madeira, basalto, telha metálica e vidro para casas e portaria.
 * Tudo é ilustrativo: não representa levantamento nem projeto aprovado.
 */
export const CANOPY_EXTENT=5200;

/**
 * Final colour grade for the Serra route, applied after ACES: vibrance (muted tones gain more than
 * already-saturated ones), a little contrast and a slightly warm lift. Neutral whites stay neutral.
 */
const gradeGLSL=`
vec3 srGrade(vec3 c){
  float l=dot(c,vec3(.2126,.7152,.0722));
  // Keep both endpoints and the neutral axis intact as the sun crosses the sky.
  c=mix(vec3(l),c,.98);
  c+=.17*c*(1.-c)*(2.*c-1.);
  return clamp(c,0.,1.);
}
`;
export function installSerraGrade(renderer:T.WebGLRenderer){
  const plain='vec3 CustomToneMapping( vec3 color ) { return color; }';
  if(T.ShaderChunk.tonemapping_pars_fragment.includes(plain))
    T.ShaderChunk.tonemapping_pars_fragment=T.ShaderChunk.tonemapping_pars_fragment.replace(plain,gradeGLSL+'vec3 CustomToneMapping( vec3 color ) { return srGrade( ACESFilmicToneMapping( color ) ); }');
  if(T.ShaderChunk.tonemapping_pars_fragment.includes('srGrade'))renderer.toneMapping=T.CustomToneMapping;
}

export const noiseGLSL=`
float srHash(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float srNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(srHash(i),srHash(i+vec2(1.,0.)),f.x),mix(srHash(i+vec2(0.,1.)),srHash(i+vec2(1.,1.)),f.x),f.y);}
float srFbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*srNoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+17.3;a*=.5;}return s;}
`;

/** Shared ground colour: used by the distant relief and by the site lawn outside the parcels, so the seam disappears. */
export const fieldGLSL=`
uniform sampler2D srDetail;uniform sampler2D srCanopy;uniform vec3 srSunShift;
vec3 srField(vec2 xz,float footprint){
  float macro=srFbm(xz*.0034+4.7);
  float meso=srFbm(xz*.019+31.);
  float micro=srNoise(xz*.33);
  vec3 green=vec3(.066,.123,.055),olive=vec3(.130,.147,.077),straw=vec3(.218,.180,.102);
  float broad=srFbm(xz*.0011+83.);
  vec3 c=mix(green,olive,smoothstep(.34,.58,macro));
  c=mix(c,straw,smoothstep(.46,.70,meso*.60+macro*.30+broad*.24));
  c*=.70+.44*broad;
  // sangas: linhas úmidas e mais escuras que serpenteiam pelo campo
  float vein=1.-abs(2.*srNoise(xz*.0042+57.)-1.);
  c=mix(c,vec3(.048,.092,.032),smoothstep(.90,.99,vein)*.75);
  // touceiras de capim a média distância
  float tuft=srNoise(xz*1.7)*.6+srNoise(xz*4.3)*.4;
  c*=mix(1.,.80+.40*tuft,1.-smoothstep(.05,1.6,footprint));
  c*=.88+.24*micro;
  // lâminas e sementes: só a poucos metros da câmera
  float blade=1.-smoothstep(.008,.11,footprint);
  if(blade>0.){
  float blades=srNoise(vec2(xz.x*37.+srNoise(xz*2.7)*7.,xz.y*8.))*.5+srNoise(vec2(xz.x*9.+3.,xz.y*43.))*.5;
  c*=mix(1.,.66+.68*blades,blade*.75);
  // flores do campo: pontos claros esparsos, em manchas
  vec2 cell=floor(xz*4.5);
  float flower=step(.988,srHash(cell))*smoothstep(.50,.62,srNoise(xz*.045+9.))*(1.-smoothstep(.015,.10,footprint));
  c=mix(c,mix(vec3(.80,.66,.16),vec3(.86,.86,.80),step(.5,srHash(cell+3.))),flower*.8);
  }
  // fibra fotográfica só de perto
  float d=dot(texture2D(srDetail,xz/3.7).rgb,vec3(.2126,.7152,.0722));
  c*=mix(1.,.60+d*3.3,(1.-smoothstep(.03,.42,footprint))*.85);
  return c;
}
vec3 srGround(vec2 xz,float footprint){
  float under=texture2D(srCanopy,xz/${CANOPY_EXTENT}.+.5).r;
  float srCast=texture2D(srCanopy,(xz+srSunShift.xy)/${CANOPY_EXTENT}.+.5).r;
  // sob os capões o campo dá lugar a serapilheira e sub-bosque, mais escuros e frios
  vec3 c=mix(srField(xz,footprint),vec3(.050,.078,.030),clamp(under*1.5,0.,.85));
  return c*(1.-clamp(max(under*.45,srCast*srSunShift.z*.55),0.,.78));
}
`;

const bumpGLSL=(height:string)=>`
  { float srHh=${height};
    vec3 srDpdx=dFdx(-vViewPosition),srDpdy=dFdy(-vViewPosition);
    vec3 srRx=cross(srDpdy,normal),srRy=cross(normal,srDpdx);float srDet=dot(srDpdx,srRx);
    normal=normalize(abs(srDet)*normal-sign(srDet)*(dFdx(srHh)*srRx+dFdy(srHh)*srRy)); }
`;

type Shader=Parameters<NonNullable<T.Material['onBeforeCompile']>>[0];
const worldVarying=(shader:Shader)=>{
  shader.vertexShader='varying vec3 srWorld;varying vec3 srLocal;varying vec3 srLocalN;\n'+shader.vertexShader
    .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n srLocalN=objectNormal;')
    .replace('#include <project_vertex>',`#include <project_vertex>
      srLocal=position;
      vec4 srPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        srPosition=instanceMatrix*srPosition;
      #endif
      srWorld=(modelMatrix*srPosition).xyz;`);
  shader.fragmentShader='varying vec3 srWorld;varying vec3 srLocal;varying vec3 srLocalN;\n'+noiseGLSL+shader.fragmentShader;
};

/** Wall-space coordinates for a box-modelled building: u along the wall, v up. Horizontal faces use the plan. */
const wallUV='vec3 srN=normalize(srLocalN);vec2 w=abs(srN.y)>.7?srLocal.xz:(abs(srN.x)>abs(srN.z)?vec2(srLocal.z,srLocal.y):vec2(srLocal.x,srLocal.y));float srFoot=max(length(dFdx(srLocal)),length(dFdy(srLocal)));float srNear=1.-smoothstep(.02,.22,srFoot);float srH=0.;';

const surfaces:Record<string,{albedo:string;rough?:number;metal?:number}>={
  plaster:{rough:.9,albedo:`
    float g=srFbm(w*9.),big=srFbm(w*.7+5.);
    diffuseColor.rgb*=(.94+.08*g*srNear)*(.95+.08*big)*mix(.86,1.,smoothstep(.0,.55,srLocal.y+.02));
    srH=g*.003*srNear;`},
  wood:{rough:.72,albedo:`
    float plank=(abs(srN.y)>.7?w.y:w.x)/.14,along=abs(srN.y)>.7?w.x:w.y;
    float id=floor(plank),f=fract(plank);
    float groove=mix(1.,smoothstep(0.,.07,f)*(1.-smoothstep(.93,1.,f)),srNear);
    float grain=srNoise(vec2(plank*9.,along*2.4))*.6+srNoise(vec2(plank*3.,along*.8+id*7.))*.4;
    diffuseColor.rgb*=(.80+.36*srHash(vec2(id,3.)))*(.86+.26*grain)*mix(.42,1.,groove);
    srH=(groove*.006+grain*.0012)*srNear;`},
  stone:{rough:.92,albedo:`
    float row=floor(w.y/.26),bw=.40+.32*srHash(vec2(row,2.));
    float bx=(w.x+srHash(vec2(row,7.))*1.7)/bw;vec2 f=vec2(fract(bx),fract(w.y/.26));
    float joint=mix(1.,smoothstep(0.,.05,f.x)*(1.-smoothstep(.95,1.,f.x))*smoothstep(0.,.10,f.y)*(1.-smoothstep(.90,1.,f.y)),srNear);
    float tone=srHash(vec2(floor(bx),row)),speck=srFbm(w*13.);
    diffuseColor.rgb*=mix(vec3(.74,.76,.82),vec3(1.22,1.12,.98),tone)*(.82+.36*speck)*mix(.46,1.,joint);
    srH=(joint*.012+speck*.004)*srNear;`},
  roof:{rough:.64,metal:.18,albedo:`
    float u=abs(srN.x)>abs(srN.z)?srLocal.z:srLocal.x;
    float seam=(1.-smoothstep(.0,.045,abs(fract(u/.42)-.5)))*srNear;
    diffuseColor.rgb*=(.94+.10*srFbm(srLocal.xz*.6))*(1.-.14*seam);
    srH=0.;`},
  panel:{rough:.5,metal:.4,albedo:`
    float f=fract(srLocal.y/.48);float groove=mix(1.,smoothstep(0.,.05,f)*(1.-smoothstep(.95,1.,f)),srNear);
    diffuseColor.rgb*=mix(.55,1.,groove)*(.95+.08*srNoise(w*30.));srH=groove*.006*srNear;`},
  concrete:{rough:.86,albedo:`
    float form=fract(w.y/.62),pour=srFbm(w*vec2(.35,2.2)+9.);
    float line=mix(1.,smoothstep(0.,.03,form)*(1.-smoothstep(.97,1.,form)),srNear);
    diffuseColor.rgb*=(.90+.16*pour)*(.95+.08*srNoise(w*28.)*srNear)*mix(.80,1.,line);
    srH=(line*.004+srNoise(w*28.)*.0015)*srNear;`},
  slats:{rough:.7,albedo:`
    float s=(abs(srN.y)>.7?w.y:w.x)/.085,along=abs(srN.y)>.7?w.x:w.y;float id=floor(s),f=fract(s);
    float gap=mix(.72,smoothstep(.0,.10,f)*(1.-smoothstep(.62,.72,f)),srNear);
    float grain=srNoise(vec2(id*5.,along*1.9));
    diffuseColor.rgb*=mix(1.,.86+.26*srHash(vec2(id,5.)),srNear)*(.95+.09*grain)*mix(.10,1.,gap);
    srH=gap*.02*srNear;`},
  cladding:{rough:.6,metal:.25,albedo:`
    float u=abs(srN.x)>abs(srN.z)?srLocal.z:srLocal.x;
    float seam=(1.-smoothstep(.0,.03,abs(fract(u/.33)-.5)))*srNear;
    diffuseColor.rgb*=(.92+.14*srFbm(w*.8))*(1.-.30*seam);
    srH=seam*.006;`},
  sand:{rough:.98,albedo:`
    float sg=srNoise(srWorld.xz*7.)*.5+srNoise(srWorld.xz*23.)*.5,big=srFbm(srWorld.xz*.35);
    float steps=smoothstep(.62,.8,srNoise(srWorld.xz*1.6+3.));
    diffuseColor.rgb*=(.86+.22*big)*(.92+.14*sg*srNear)*(1.-.10*steps);
    srH=big*.04+sg*.006*srNear-steps*.02;`},
  gravel:{rough:.96,albedo:`
    diffuseColor.rgb*=(.78+.40*srFbm(srWorld.xz*1.9))*(.90+.22*srNoise(srWorld.xz*23.)*srNear);
    srH=srNoise(srWorld.xz*23.)*.006*srNear;`},
  asphalt:{rough:.86,albedo:`
    diffuseColor.rgb*=vec3(1.18,1.18,1.2)*(.84+.30*srFbm(srWorld.xz*.55))*(.90+.22*srNoise(srWorld.xz*31.)*srNear);
    srH=srNoise(srWorld.xz*31.)*.004*srNear;`},
};
const surfaceFor=(name:string)=>/Areia/.test(name)?'sand':/Concreto/.test(name)?'concrete':/Ripado/.test(name)?'slats':/Escuro/.test(name)?'cladding':/Parede|Reboco/.test(name)?'plaster':/Madeira|Deck/.test(name)?'wood':/Pedra|Basalto/.test(name)?'stone'
  :/Telhado|Cobertura/.test(name)?'roof':/Portão/.test(name)?'panel':/Saibro/.test(name)?'gravel':/Asfalto/.test(name)?'asphalt':'';

export function createSerraLook(detail:T.Texture){
  const canopy=new T.CanvasTexture(document.createElement('canvas'));
  canopy.generateMipmaps=true;canopy.minFilter=T.LinearMipmapLinearFilter;canopy.magFilter=T.LinearFilter;
  const uniforms={srDetail:{value:detail},srCanopy:{value:canopy as T.Texture},srSunShift:{value:new T.Vector3(0,0,1)},srSkyLow:{value:new T.Color('#9ebccc')},srSkyHigh:{value:new T.Color('#2875ae')}};
  const glass:T.MeshStandardMaterial[]=[];
  const bind=(shader:Shader)=>Object.assign(shader.uniforms,uniforms);

  return {
    uniforms,
    /** Fragment preamble + expression for the site lawn shader (outside the parcels). */
    lawnHeader:noiseGLSL+fieldGLSL,
    bind,
    /** Paint tree crowns into a top-down mask: ground under the capões gets darker and receives a soft cast shadow. */
    setCanopy(instances:[number,number,number,number,number,number][],light:boolean){
      const size=light?1024:2048,canvas=canopy.image as HTMLCanvasElement;canvas.width=canvas.height=size;
      const g=canvas.getContext('2d')!;g.fillStyle='#000';g.fillRect(0,0,size,size);g.globalCompositeOperation='lighter';
      const scale=size/CANOPY_EXTENT;
      for(const [kind,x,,z,,s] of instances){
        const r=Math.max(.75,(kind?6.5:8.5)*s*scale),px=(x/CANOPY_EXTENT+.5)*size,py=(z/CANOPY_EXTENT+.5)*size;
        if(px<r+2||py<r+2||px>size-r-2||py>size-r-2)continue;
        const grad=g.createRadialGradient(px,py,0,px,py,r);grad.addColorStop(0,'rgba(255,255,255,.9)');grad.addColorStop(.6,'rgba(255,255,255,.62)');grad.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=grad;g.beginPath();g.arc(px,py,r,0,Math.PI*2);g.fill();
      }
      canopy.flipY=false;canopy.dispose();canopy.needsUpdate=true;
    },
    setSun(direction:T.Vector3,daylight:number,night:number,horizon?:T.Color,zenith?:T.Color){
      if(horizon)uniforms.srSkyLow.value.copy(horizon);if(zenith)uniforms.srSkyHigh.value.copy(zenith);
      const reach=Math.min(18,6/Math.max(.22,direction.y));
      uniforms.srSunShift.value.set(direction.x*reach,direction.z*reach,daylight);
      for(const m of glass)m.emissiveIntensity=night*1.5;
    },
    /** Distant relief: procedural campo nativo, no vertex paint. */
    field(material:T.MeshStandardMaterial){
      material.vertexColors=false;material.color.set('#ffffff');material.roughness=.96;material.metalness=0;material.envMapIntensity=.6;
      material.onBeforeCompile=shader=>{
        bind(shader);worldVarying(shader);
        shader.fragmentShader=shader.fragmentShader.replace('varying vec3 srLocalN;\n'+noiseGLSL,'varying vec3 srLocalN;\n'+noiseGLSL+fieldGLSL)
          .replace('#include <color_fragment>',`#include <color_fragment>
            float srFoot=max(length(dFdx(srWorld.xz)),length(dFdy(srWorld.xz)));
            diffuseColor.rgb=srGround(srWorld.xz,srFoot);`)
          .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+bumpGLSL('(srFbm(srWorld.xz*.045)*1.6+srNoise(srWorld.xz*.6)*.10)*(1.-smoothstep(.6,5.,srFoot))'));
      };
      material.customProgramCacheKey=()=> 'sr-field-v1';material.needsUpdate=true;
    },
    /** Araucária and native-forest crowns: mottled leaf mass, dark undersides, warm sunlit tops, thin-leaf back light. */
    foliage(material:T.MeshStandardMaterial,araucaria:boolean){
      material.roughness=.88;material.metalness=0;material.envMapIntensity=.45;
      material.color.set(araucaria?'#344c40':'#48603c');
      material.onBeforeCompile=shader=>{
        worldVarying(shader);
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float srMottle=srNoise(srWorld.xz*.85+srWorld.y*.6)*.55+srNoise(srWorld.xz*3.3+srWorld.y*2.1)*.45;
            diffuseColor.rgb*=mix(.58,1.22,srMottle);
            diffuseColor.rgb*=mix(vec3(.68,.74,.73),vec3(1.13,1.09,.92),smoothstep(-.8,.9,normalize(srLocalN).y));`)
          .replace('#include <lights_physical_pars_fragment>',`#include <lights_physical_pars_fragment>
            void RE_Direct_SerraLeaf(const in IncidentLight light,const in vec3 position,const in vec3 normal,const in vec3 viewDir,const in vec3 coatNormal,const in PhysicalMaterial material,inout ReflectedLight reflected){
              RE_Direct_Physical(light,position,normal,viewDir,coatNormal,material,reflected);
              reflected.directDiffuse+=material.diffuseColor*light.color*RECIPROCAL_PI*(.04+.30*max(0.,dot(-normal,light.direction)));
            }
            #undef RE_Direct
            #define RE_Direct RE_Direct_SerraLeaf`);
      };
      material.customProgramCacheKey=()=> 'sr-foliage-v1';material.needsUpdate=true;
    },
    /** Piscina: ondulação leve, cáusticas e reflexo do céu pelo ângulo de visão (sem render extra). */
    water(material:T.MeshStandardMaterial,bounds:T.Vector4){
      material.onBeforeCompile=shader=>{
        worldVarying(shader);shader.uniforms.srSkyLow=uniforms.srSkyLow;shader.uniforms.srSkyHigh=uniforms.srSkyHigh;shader.uniforms.srPool={value:bounds};
        shader.fragmentShader='uniform vec3 srSkyLow;uniform vec3 srSkyHigh;uniform vec4 srPool;\n'+shader.fragmentShader
          .replace('#include <color_fragment>',`#include <color_fragment>
            float srC=pow(1.-abs(2.*srNoise(srWorld.xz*1.7+srNoise(srWorld.xz*.9)*2.)-1.),7.);
            float srEdge=smoothstep(.0,.9,min(min(srWorld.x-srPool.x,srPool.y-srWorld.x),min(srWorld.z-srPool.z,srPool.w-srWorld.z)));
            diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.05,1.12,1.12),diffuseColor.rgb*vec3(.55,.78,.9),srEdge)+vec3(.30,.36,.34)*srC*.55;`)
          .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+bumpGLSL('(srNoise(srWorld.xz*1.3)*.5+srNoise(srWorld.xz*3.7+7.)*.5)*.025'))
          .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            vec3 srView=normalize(vViewPosition);
            vec3 srReflect=inverseTransformDirection(reflect(-srView,normal),viewMatrix);
            float srFresnel=.04+.96*pow(1.-max(dot(normal,srView),0.),5.);
            totalEmissiveRadiance+=mix(srSkyLow,srSkyHigh,smoothstep(.0,.6,srReflect.y))*srFresnel*.85;`);
      };
      material.customProgramCacheKey=()=> 'sr-water-v2';material.needsUpdate=true;
    },
    /**
     * Desgaste do pavimento por cima do material do site (encadeia os ganchos de iluminação já existentes):
     * manchas de tom, remendos, trincas seladas, marcas de óleo no asfalto; encardido nas juntas da calçada.
     */
    wear(material:T.MeshStandardMaterial,kind:'asphalt'|'sidewalk'){
      const prev=material.onBeforeCompile,prevKey=material.customProgramCacheKey.bind(material);
      material.onBeforeCompile=(shader,renderer)=>{
        prev.call(material,shader,renderer);
        if(shader.fragmentShader.includes('srWear'))return;
        worldVarying(shader);
        const asphalt=`
          float srWear=srFbm(srWorld.xz*.07);
          float srCrackZone=smoothstep(.56,.72,srNoise(srWorld.xz*.045+3.));
          float srCrack=(1.-smoothstep(.0,.028,abs(srNoise(srWorld.xz*.32+srNoise(srWorld.xz*1.3)*.35)-.5)))*srCrackZone;
          vec2 srCell=floor(srWorld.xz/vec2(4.2,2.6));
          float srPatch=step(.9,srHash(srCell*.71+5.))*smoothstep(.0,.06,min(min(fract(srWorld.x/4.2),1.-fract(srWorld.x/4.2)),min(fract(srWorld.z/2.6),1.-fract(srWorld.z/2.6))));
          float srOil=smoothstep(.70,.88,srFbm(srWorld.xz*.55+7.));
          float srGrit=srNoise(srWorld.xz*38.)*.5+srNoise(srWorld.xz*91.)*.5;
          diffuseColor.rgb*=(.88+.22*srWear)*(1.-.42*srCrack)*mix(1.,.86,srPatch)*(1.-.28*srOil)*(.93+.14*srGrit);`;
        const sidewalk=`
          float srWear=srFbm(srWorld.xz*.18);
          float srDirt=smoothstep(.55,.85,srFbm(srWorld.xz*.9+4.));
          float srMoss=smoothstep(.62,.8,srNoise(srWorld.xz*.3+12.))*.35;
          diffuseColor.rgb*=(.9+.18*srWear)*(1.-.18*srDirt);
          diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.78,.86,.70),srMoss);`;
        shader.fragmentShader=shader.fragmentShader
          .replace('#include <color_fragment>','#include <color_fragment>\n'+(kind==='asphalt'?asphalt:sidewalk))
          .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            ${kind==='asphalt'?'roughnessFactor=clamp(roughnessFactor*(1.-.32*srOil)+.04*srPatch,.05,1.);':'roughnessFactor=clamp(roughnessFactor+.06*srDirt,.05,1.);'}`);
      };
      material.customProgramCacheKey=()=>prevKey()+'-sr-wear-'+kind+'-v1';material.needsUpdate=true;
    },
    bark(material:T.MeshStandardMaterial){
      material.color.set('#6b5a4a');material.roughness=.95;material.envMapIntensity=.4;
      material.onBeforeCompile=shader=>{
        worldVarying(shader);
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          diffuseColor.rgb*=.72+.5*srNoise(vec2(atan(srLocal.x,srLocal.z)*5.,srLocal.y*.9));`);
      };
      material.customProgramCacheKey=()=> 'sr-bark-v1';material.needsUpdate=true;
    },
    /** Houses, gate and access road, matched by the material names exported from Blender. */
    building(material:T.MeshStandardMaterial){
      if(/Vidro/.test(material.name)){
        material.color.set('#1c2328');material.roughness=.06;material.metalness=.55;material.envMapIntensity=1.1;
        material.emissive.set('#ffc98a');material.emissiveIntensity=0;glass.push(material);
        material.onBeforeCompile=shader=>{
          worldVarying(shader);shader.uniforms.srSkyLow=uniforms.srSkyLow;shader.uniforms.srSkyHigh=uniforms.srSkyHigh;
          shader.fragmentShader='uniform vec3 srSkyLow;uniform vec3 srSkyHigh;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            totalEmissiveRadiance*=.25+.75*step(.42,srHash(floor(srLocal.xz/1.9)+floor(srLocal.y/2.6)+floor(srWorld.xz/9.)));
            // reflexo do céu: o vidro espelha o horizonte de frente e o zênite em ângulo rasante
            vec3 srView=normalize(vViewPosition);
            vec3 srReflect=inverseTransformDirection(reflect(-srView,normal),viewMatrix);
            float srFresnel=.34+.66*pow(1.-max(dot(normal,srView),0.),3.);
            vec3 srSky=mix(srSkyLow*vec3(.82,.90,.86),srSkyHigh,smoothstep(.0,.55,srReflect.y));
            srSky=mix(srSky,srSkyLow*vec3(.42,.52,.36),step(srReflect.y,-.02)*.75);
            totalEmissiveRadiance+=srSky*srFresnel*(.72+.10*srNoise(srWorld.xz*.7+srWorld.y));`);
        };
        material.customProgramCacheKey=()=> 'sr-glass-v2';material.needsUpdate=true;return;
      }
      const kind=surfaceFor(material.name),surface=surfaces[kind];
      if(!surface)return;
      if(surface.rough!==undefined)material.roughness=surface.rough;
      if(surface.metal!==undefined)material.metalness=surface.metal;
      material.envMapIntensity=kind==='roof'?1.1:.7;
      if(kind==='asphalt')material.color.set('#4c4d4f');
      material.onBeforeCompile=shader=>{
        worldVarying(shader);
        shader.fragmentShader=shader.fragmentShader
          .replace('#include <color_fragment>','#include <color_fragment>\n'+wallUV+surface.albedo)
          .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+bumpGLSL('srH'));
      };
      material.customProgramCacheKey=()=> 'sr-surface-v1-'+kind;material.needsUpdate=true;
    },
    dispose(){canopy.dispose();}
  };
}
export type SerraLook=ReturnType<typeof createSerraLook>;
