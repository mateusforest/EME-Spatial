import * as T from 'three';

/**
 * Émera · cidade no horizonte (ilustrativa). Um único InstancedMesh de prismas, a ~5,5 km na direção
 * da estrada de acesso, com núcleo de torres e bairros mais baixos em volta. A neblina da cena o deixa
 * enevoado, perceptível sem competir com o loteamento. À noite, janelas acesas.
 * Não representa Vacaria nem outra cidade real.
 */
export function createSerraCity(scene:T.Scene){
  const dir=new T.Vector2(-.56,-.83).normalize(),side=new T.Vector2(-dir.y,dir.x);
  const DIST=5400,COUNT=640;
  let seed=91;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const gauss=()=>(rnd()+rnd()+rnd()-1.5)/1.5;
  const material=new T.MeshStandardMaterial({name:'Cidade',color:'#ffffff',roughness:.75,metalness:.08,envMapIntensity:.6});
  const night={value:0};
  material.onBeforeCompile=shader=>{
    shader.uniforms.srCityNight=night;
    shader.vertexShader='varying vec3 srCity;varying vec3 srCityN;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 srCp=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        srCp=instanceMatrix*srCp;
      #endif
      srCity=(modelMatrix*srCp).xyz;srCityN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal);`);
    shader.fragmentShader='uniform float srCityNight;varying vec3 srCity;varying vec3 srCityN;\n'+shader.fragmentShader
      .replace('#include <color_fragment>',`#include <color_fragment>
        float srSideways=abs(srCityN.y)<.5?1.:0.;
        float srU=abs(srCityN.x)>abs(srCityN.z)?srCity.z:srCity.x;
        vec2 srCell=vec2(srU/3.4,srCity.y/3.3);
        float srWin=step(.28,fract(srCell.x))*step(.3,fract(srCell.y))*srSideways;
        diffuseColor.rgb*=mix(1.,.62,srWin*.8);
        diffuseColor.rgb*=mix(.86,1.,clamp(srCity.y/160.,0.,1.));`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float srLit=step(.55,fract(sin(dot(floor(srCell)+floor(srCity.xz/41.),vec2(12.9898,78.233)))*43758.5453));
        totalEmissiveRadiance+=vec3(1.,.80,.52)*srWin*srLit*srCityNight*1.6;`);
  };
  material.customProgramCacheKey=()=> 'sr-city-v1';
  const geometry=new T.BoxGeometry(1,1,1).translate(0,.5,0);
  const mesh=new T.InstancedMesh(geometry,material,COUNT);
  const m=new T.Matrix4(),q=new T.Quaternion(),pos=new T.Vector3(),scl=new T.Vector3(),tone=new T.Color(),up=new T.Vector3(0,1,0);
  const tones=['#8f989f','#7f8a93','#a39d93','#6f7f8c','#958f86','#64727e','#a7adb2'];
  const angle=Math.atan2(dir.x,dir.y);
  for(let i=0;i<COUNT;i++){
    const lateral=gauss()*1500,depth=gauss()*560;
    const core=Math.exp(-(lateral*lateral)/(420*420)-(depth*depth)/(260*260));
    const h=14+rnd()*30+core*(80+rnd()*190)*(rnd()<.75?1:.45);
    const w=16+rnd()*26+core*12,d=16+rnd()*22;
    const cx=dir.x*(DIST+depth)+side.x*lateral,cz=dir.y*(DIST+depth)+side.y*lateral;
    // a base fica bem abaixo do relevo distante: nenhum prédio flutua sobre um vale
    pos.set(cx,-95,cz);q.setFromAxisAngle(up,angle+(rnd()<.8?0:rnd()*.6));scl.set(w,h+95,d);
    mesh.setMatrixAt(i,m.compose(pos,q,scl));mesh.setColorAt(i,tone.set(tones[Math.floor(rnd()*tones.length)]));
  }
  mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;mesh.name='Émera · cidade no horizonte';
  scene.add(mesh);
  return {
    setNight(level:number){night.value=level;},
    dispose(){scene.remove(mesh);geometry.dispose();material.dispose();mesh.dispose();}
  };
}
