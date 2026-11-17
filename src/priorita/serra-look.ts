import * as T from 'three';

/**
 * Priorità · Serra — acabamento visual procedural (sem novos downloads de textura).
 * Campo nativo com manchas de palha/oliva, sombra dos capões, folhagem com volume,
 * e materiais de alvenaria, madeira, basalto, telha metálica e vidro para casas e portaria.
 * Tudo é ilustrativo: não representa levantamento nem projeto aprovado.
 */
export const CANOPY_EXTENT=5200;

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
  vec3 green=vec3(.060,.125,.028),olive=vec3(.135,.150,.036),straw=vec3(.205,.168,.060);
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
  return c*(1.-clamp(max(under*.45,srCast*srSunShift.z*.85),0.,.78));
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
    diffuseColor.rgb*=(.90+.20*srFbm(srLocal.xz*.9))*(1.-.22*seam);
    srH=seam*.007;`},
  panel:{rough:.5,metal:.4,albedo:`
    float f=fract(srLocal.y/.48);float groove=mix(1.,smoothstep(0.,.05,f)*(1.-smoothstep(.95,1.,f)),srNear);
    diffuseColor.rgb*=mix(.55,1.,groove)*(.95+.08*srNoise(w*30.));srH=groove*.006*srNear;`},
  gravel:{rough:.96,albedo:`
    diffuseColor.rgb*=(.78+.40*srFbm(srWorld.xz*1.9))*(.90+.22*srNoise(srWorld.xz*23.)*srNear);
    srH=srNoise(srWorld.xz*23.)*.006*srNear;`},
  asphalt:{rough:.86,albedo:`
    diffuseColor.rgb*=vec3(1.18,1.18,1.2)*(.84+.30*srFbm(srWorld.xz*.55))*(.90+.22*srNoise(srWorld.xz*31.)*srNear);
    srH=srNoise(srWorld.xz*31.)*.004*srNear;`},
};
const surfaceFor=(name:string)=>/Parede|Reboco/.test(name)?'plaster':/Madeira|Deck/.test(name)?'wood':/Pedra|Basalto/.test(name)?'stone'
  :/Telhado|Cobertura/.test(name)?'roof':/Portão/.test(name)?'panel':/Saibro/.test(name)?'gravel':/Asfalto/.test(name)?'asphalt':'';

export function createSerraLook(detail:T.Texture){
  const canopy=new T.CanvasTexture(document.createElement('canvas'));
  canopy.generateMipmaps=true;canopy.minFilter=T.LinearMipmapLinearFilter;canopy.magFilter=T.LinearFilter;
  const uniforms={srDetail:{value:detail},srCanopy:{value:canopy as T.Texture},srSunShift:{value:new T.Vector3(0,0,1)}};
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
        const r=Math.max(2.2,(kind?6.5:8.5)*s*scale),px=(x/CANOPY_EXTENT+.5)*size,py=(z/CANOPY_EXTENT+.5)*size;
        if(px<r+2||py<r+2||px>size-r-2||py>size-r-2)continue;
        const grad=g.createRadialGradient(px,py,0,px,py,r);grad.addColorStop(0,'rgba(255,255,255,.9)');grad.addColorStop(.6,'rgba(255,255,255,.62)');grad.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=grad;g.beginPath();g.arc(px,py,r,0,Math.PI*2);g.fill();
      }
      canopy.flipY=false;canopy.dispose();canopy.needsUpdate=true;
    },
    setSun(direction:T.Vector3,daylight:number,night:number){
      const reach=9/Math.max(.22,direction.y);
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
      material.color.set(araucaria?'#2c4628':'#36522a');
      material.onBeforeCompile=shader=>{
        worldVarying(shader);
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float srMottle=srNoise(srWorld.xz*.85+srWorld.y*.6)*.55+srNoise(srWorld.xz*3.3+srWorld.y*2.1)*.45;
            diffuseColor.rgb*=mix(.58,1.22,srMottle);
            diffuseColor.rgb*=mix(vec3(.42,.50,.50),vec3(1.10,1.08,.90),smoothstep(-.8,.9,normalize(srLocalN).y));`)
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
        material.color.set('#4d6272');material.roughness=.05;material.metalness=.9;material.envMapIntensity=3.2;
        material.emissive.set('#ffc98a');material.emissiveIntensity=0;glass.push(material);
        material.onBeforeCompile=shader=>{
          worldVarying(shader);
          shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            totalEmissiveRadiance*=.25+.75*step(.42,srHash(floor(srLocal.xz/1.9)+floor(srLocal.y/2.6)+floor(srWorld.xz/9.)));`);
        };
        material.customProgramCacheKey=()=> 'sr-glass-v1';material.needsUpdate=true;return;
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
