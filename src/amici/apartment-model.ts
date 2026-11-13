import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {walls,height} from './apartment-layout';

export function createApartmentModel(onChange:()=>void=()=>{}){
 const group=new T.Group();group.name='Amici · apartamento modelo Final 03';
 const textures:T.Texture[]=[];const materials:T.Material[]=[];const mirrors:Reflector[]=[];
 const loader=new T.TextureLoader();
 function map(file:string,repeat=1,normal=false){const t=loader.load('/assets/amici/apartment-03/'+file,onChange);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;if(!normal)t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 function noiseTexture(type:'cloth'|'stone'|'dark'){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!,im=ctx.createImageData(256,256);let seed=971;
  const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const v=(type==='cloth'?220+14*Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2):type==='dark'?90:235)+(rand()-.5)*12;const i=(y*256+x)*4;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);
  if(type!=='cloth'){ctx.globalAlpha=.14;ctx.strokeStyle=type==='dark'?'#e8e2d4':'#887e6d';for(let i=0;i<7;i++){ctx.beginPath();const y=rand()*256;ctx.moveTo(0,y);ctx.bezierCurveTo(90,y-40+rand()*80,140,y-40+rand()*80,256,y-40+rand()*80);ctx.lineWidth=.5+rand();ctx.stroke();}}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.repeat.set(type==='cloth'?6:1,type==='cloth'?6:1);textures.push(t);return t;
 }
 function mat(color:string,roughness=.65,extra:Partial<T.MeshStandardMaterialParameters>={}){const m=new T.MeshStandardMaterial({color,roughness,...extra});materials.push(m);return m;}
 const cloth=noiseTexture('cloth'),stoneMap=noiseTexture('stone'),darkMap=noiseTexture('dark');
 const M={
  wall:mat('#e7e3db',.88),ceiling:mat('#f3f0e8',.90),floor:mat('#d5d0c7',.49),grout:mat('#aaa79e',.95),
  wood:mat('#dec39e',.48,{map:map('oak.webp'),normalMap:map('oak-normal.webp',1,true),normalScale:new T.Vector2(.16,.16),roughnessMap:map('oak-rough.webp',1,true)}),
  oakDark:mat('#9b7c58',.51,{map:map('oak.webp')}),quartz:mat('#ece6d9',.28,{map:stoneMap}),blackStone:mat('#353c3c',.32,{map:darkMap}),
  fabric:mat('#ded8cb',.93,{map:cloth,bumpMap:cloth,bumpScale:.003}),rug:mat('#c8c1b5',1,{map:cloth,bumpMap:cloth,bumpScale:.007}),
  sofa:mat('#ad6139',.76,{bumpMap:cloth,bumpScale:.002}),pillow:mat('#e6d9bf',.95,{map:cloth}),blanket:mat('#645f51',.96,{map:cloth}),
  dark:mat('#262c2d',.32,{metalness:.35}),bronze:mat('#9d8155',.27,{metalness:.78}),steel:mat('#a5b0af',.24,{metalness:.85}),
  ceramic:mat('#f0ede5',.21),leaf:mat('#395744',.78),soil:mat('#2b2820',1),book:mat('#9a795b',.8),screen:mat('#152128',.12,{metalness:.35}),
  light:mat('#fff1d6',.4,{emissive:'#ffd9a1',emissiveIntensity:3}),green:mat('#6c7665',.9,{map:cloth}),tile:mat('#b7b7b0',.57),
 };
 const glass=new T.MeshPhysicalMaterial({color:'#c4dce5',roughness:.055,metalness:.08,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});materials.push(glass);
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,bevel=0){
  const geo=bevel?new RoundedBoxGeometry(w,h,d,3,Math.min(bevel,w*.4,h*.4,d*.4)):new T.BoxGeometry(w,h,d);
  if(m===M.wood||m===M.oakDark){const pos=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++){const axis=Math.abs(n.getX(i))>Math.abs(n.getZ(i));uv.setXY(i,(axis?pos.getZ(i):pos.getX(i))/1.1,pos.getY(i)/2.1);}uv.needsUpdate=true;}
  const o=new T.Mesh(geo,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;
 }
 function cylinder(name:string,x:number,y:number,z:number,r:number,h:number,m:T.Material,top=r){const o=new T.Mesh(new T.CylinderGeometry(top,r,h,32),m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 function oval(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:T.Material){const o=new T.Mesh(new T.SphereGeometry(1,24,16),m);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 function tube(name:string,points:T.Vector3[],radius:number,m:T.Material){const o=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,radius,8,false),m);o.name=name;o.castShadow=true;group.add(o);return o;}
 box('Laje',5,-.08,3.075,10.15,.16,6.3,M.floor);
 for(let x=.9;x<10;x+=.9)box('Junta porcelanato',x,.001,3.075,.003,.002,6.15,M.grout);
 for(let z=.9;z<6.15;z+=.9)box('Junta porcelanato',5,.001,z,10,.002,.003,M.grout);
 box('Forro',5,height+.06,3.075,10.14,.12,6.3,M.ceiling);
 for(const r of walls){box('Parede',r.x,height/2,r.z,r.w,height,r.d,M.wall);box('Rodapé',r.x,.045,r.z,r.w+.025,.09,r.d+.025,M.ceiling,.008);}
 // North-facing openings follow the positions in the published plan.
 box('Peitoril fachada',5,.46,0,10,.92,.14,M.wall);
 box('Verga fachada',5,2.49,0,10,.46,.14,M.wall);
 const windows=[[1.4,1.8],[4.2,1.9],[6.9,1.9],[8.95,1.25]];
 let edge=0;
 for(const [x,w] of windows){const left=x-w/2;if(left>edge)box('Entre janelas',(left+edge)/2,1.59,0,left-edge,1.34,.14,M.wall);edge=x+w/2;
  box('Janela vidro',x,1.59,-.015,w,1.34,.016,glass);
  for(const xx of [x-w/2,x,x+w/2])box('Janela montante',xx,1.59,.015,.035,1.39,.05,M.dark);
  for(const yy of [.92,2.26])box('Janela travessa',x,yy,.015,w+.05,.035,.05,M.dark);
  box('Peitoril pedra',x,.91,.04,w+.1,.035,.24,M.quartz,.01);
 }
 if(edge<10)box('Canto fachada',(edge+10)/2,1.59,0,10-edge,1.34,.14,M.wall);
 // Lightweight linen folds, not opaque flat curtain planes.
 for(const [x,w] of windows.slice(0,3))for(const side of [-1,1]){
  const geo=new T.PlaneGeometry(.36,2.2,20,22);const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){pos.setZ(i,.035*Math.sin(pos.getX(i)*75)+.008*Math.sin(pos.getY(i)*5));}geo.computeVertexNormals();
  const curtain=new T.Mesh(geo,M.fabric);curtain.position.set(x+side*(w/2-.10),1.22,.17);curtain.castShadow=true;group.add(curtain);
 }
 // Open interior frames and timber leaves tucked against walls; no invisible barriers.
 function doorway(x:number,z:number,w:number,axis:'x'|'z'){
  const dx=axis==='x'?1:0,dz=axis==='z'?1:0;
  for(const sign of [-1,1])box('Guarnição porta',x+sign*dx*w/2,1.07,z+sign*dz*w/2,axis==='x'?.055:.17,2.14,axis==='z'?.055:.17,M.wood,.008);
  box('Guarnição superior',x,2.13,z,axis==='x'?w+.06:.17,.07,axis==='z'?w+.06:.17,M.wood,.008);
  box('Bandeira sobre porta',x,2.44,z,axis==='x'?w:.12,.56,axis==='z'?w:.12,M.wall);
 }
 doorway(4.89,3.64,.94,'x');doorway(2.27,4.65,.90,'x');doorway(5.6,5.10,.90,'z');
 // Entrance remains closed to the building corridor; use the explicit return control.
 box('Porta entrada',6.35,1.07,6.055,1.03,2.14,.045,M.wood,.012);
 box('Puxador entrada',6.76,1.02,6.015,.12,.035,.045,M.dark,.007);
 // Living room: caramel sofa, nesting tables and TV/peninsula from the reference layout.
 box('Tapete sala',6.93,.012,1.70,2.15,.022,3.12,M.rug,.03);
 box('Sofá base',5.99,.28,1.69,.78,.26,2.75,M.oakDark,.07);
 box('Sofá encosto',5.70,.80,1.69,.19,.82,2.74,M.sofa,.075);
 for(const z of [.78,1.69,2.60])box('Sofá almofada',6.02,.49,z,.69,.23,.86,M.sofa,.085);
 for(const z of [.28,3.1])box('Sofá braço',6,.69,z,.78,.49,.15,M.sofa,.06);
 for(const z of [.58,2.8]){const p=box('Almofada linho',5.92,.91,z,.19,.42,.43,M.pillow,.085);p.rotation.z=-.20;p.rotation.x=.18;}
 cylinder('Mesa apoio maior',6.20,.37,3.33,.32,.045,M.blackStone);cylinder('Mesa apoio menor',6.63,.28,3.28,.23,.04,M.blackStone);
 cylinder('Base mesa',6.20,.18,3.33,.08,.36,M.dark);cylinder('Base mesa',6.63,.14,3.28,.06,.28,M.dark);
 box('Peninsula base',8.15,.47,1.65,.5,.94,3.1,M.oakDark,.04);
 box('Peninsula pedra',8.15,.97,1.65,.60,.06,3.22,M.blackStone,.08);
 box('Painel TV',8.13,1.56,1.27,.12,1.08,2.2,M.wood,.01);
 box('TV moldura',8.045,1.61,1.27,.055,.77,1.42,M.dark,.025);
 box('TV tela',8.01,1.61,1.27,.005,.715,1.365,M.screen,.015);
 // Reflected window highlight gives the switched-off glass its depth.
 box('Soundbar',7.985,1.10,1.27,.075,.045,.72,M.dark,.018);
 for(const z of [2.75,3.35]){cylinder('Banqueta',7.55,.66,z,.21,.065,M.oakDark);for(const dx of [-.13,.13])for(const dz of [-.13,.13])box('Pé banqueta',7.55+dx,.31,z+dz,.024,.61,.024,M.dark,.004);}
 // Kitchen cabinetry: real reveals, handles, toe kick, oven and plumbing.
 box('Cozinha rodapé',9.68,.065,3.1,.56,.13,5.9,M.dark);
 box('Cozinha bancada',9.65,.92,2.68,.72,.05,5.02,M.quartz,.015);
 box('Frontão cozinha',9.965,1.18,2.68,.035,.48,5.02,M.quartz);
 for(let i=0;i<8;i++){const z=.42+i*.61;box('Armário inferior',9.68,.50,z,.61,.77,.59,M.wood,.008);box('Frente armário',9.35,.50,z,.026,.74,.565,M.wood,.007);box('Cava',9.324,.82,z,.017,.018,.40,M.dark,.004);}
 for(let i=0;i<5;i++){const z=1.45+i*.65;box('Armário aéreo',9.79,2.12,z,.40,.81,.63,M.wall,.009);box('Cava aéreo',9.578,1.74,z,.018,.018,.48,M.bronze,.004);}
 box('LED bancada',9.57,1.69,2.75,.025,.012,3.55,M.light);
 box('Geladeira corpo',9.64,1.08,5.64,.70,2.16,.76,M.steel,.025);
 for(const [y,h] of [[1.49,1.28],[.42,.76]]){box('Geladeira porta',9.265,y,5.64,.035,h,.72,M.steel,.016);box('Geladeira pega',9.22,y+.13,5.94,.04,.52,.025,M.dark,.009);}
 box('Forno vidro',9.31,.46,3.48,.03,.48,.52,M.screen,.015);box('Forno pega',9.27,.67,3.48,.06,.025,.44,M.steel,.009);
 box('Cooktop',9.65,.958,3.48,.52,.018,.57,M.dark,.018);
 for(const dx of [-.13,.13])for(const dz of [-.15,.15]){const ring=new T.Mesh(new T.TorusGeometry(.075,.009,8,24),M.steel);ring.rotation.x=Math.PI/2;ring.position.set(9.65+dx,.973,3.48+dz);group.add(ring);}
 box('Cuba borda',9.64,.953,4.45,.49,.016,.58,M.steel,.06);box('Cuba interior',9.64,.96,4.45,.40,.009,.46,M.dark,.06);
 tube('Torneira',[new T.Vector3(9.84,.96,4.45),new T.Vector3(9.84,1.29,4.45),new T.Vector3(9.60,1.32,4.45),new T.Vector3(9.57,1.17,4.45)],.014,M.steel);
 cylinder('Tábua apoio',9.48,.981,2.12,.17,.025,M.oakDark);
 cylinder('Pote cerâmica',9.78,1.07,1.18,.075,.24,M.ceramic);
 // Dining group, kept clear of the main entrance path.
 box('Mesa jantar',7.7,.76,5.12,.92,.055,1.55,M.wood,.10);
 for(const dx of [-.32,.32])for(const dz of [-.59,.59]){const leg=box('Mesa pé',7.7+dx,.37,5.12+dz,.055,.73,.055,M.oakDark,.009);leg.rotation.z=dx*.12;}
 for(const x of [6.97,8.43])for(const z of [4.73,5.5]){
  box('Cadeira assento',x,.46,z,.44,.09,.46,M.green,.07);
  box('Cadeira encosto',x+(x<7.7?-.20:.20),.74,z,.07,.49,.44,M.green,.065);
  for(const dx of [-.15,.15])for(const dz of [-.16,.16])box('Cadeira pé',x+dx,.22,z+dz,.024,.44,.024,M.dark,.004);
 }
 cylinder('Jantar vaso',7.7,.91,5.12,.10,.25,M.ceramic,.07);
 for(const z of [4.72,5.52]){cylinder('Prato',7.7,.802,z,.17,.015,M.ceramic);cylinder('Copo',7.95,.86,z,.045,.12,glass);}
 box('Livro mesa',7.57,.807,5.05,.19,.025,.25,M.book,.006);
 // Pendant uses a slim profile rather than a big emissive blob.
 box('Pendente jantar',7.7,1.95,5.12,.055,.065,1.05,M.dark,.02);
 box('Difusor jantar',7.7,1.913,5.12,.04,.008,1.0,M.light);
 for(const z of [4.78,5.46])cylinder('Cabo pendente',7.7,2.34,z,.003,.75,M.dark);
 // Bedrooms: padded beds, covers with folds, bedside fittings and wardrobe joinery.
 function bed(x:number,z:number,w:number,accent:T.Material,turn=0){
  const first=group.children.length;
  box('Cama base',x,.22,z,w,.30,2.1,M.oakDark,.04);
  box('Colchão',x,.43,z,w,.22,2.06,M.fabric,.08);
  box('Cabeceira tecido',x,.86,z-1.04,w+.12,1.25,.09,accent,.045);
  const blanket=box('Duvet',x,.565,z+.18,w+.025,.12,1.69,M.fabric,.06);blanket.rotation.y=.008;
  box('Manta',x,.63,z+.76,w+.06,.055,.58,accent,.025);
  for(const dx of w>1.3?[-.38,.38]:[0]){const p=box('Travesseiro',x+dx,.63,z-.67,w>1.3?.67:.70,.16,.43,M.pillow,.08);p.rotation.y=dx*.08;}
  for(let i=0;i<9;i++)box('Costura manta',x-w/2+.04+i*(w-.08)/8,.661,z+.76,.004,.002,.51,M.fabric);
  if(turn){const origin=new T.Vector3(x,0,z),axis=new T.Vector3(0,1,0);for(const ob of group.children.slice(first)){ob.position.sub(origin).applyAxisAngle(axis,turn).add(origin);ob.rotation.y+=turn;}}
 }
 box('Tapete suíte',1.2,.012,1.72,2.28,.02,2.9,M.rug,.02);bed(1.15,1.40,1.62,M.blanket,Math.PI/2);
 for(const z of [.48,2.32]){box('Criado suíte',.27,.43,z,.42,.36,.43,M.wood,.015);cylinder('Abajur base',.27,.63,z,.075,.08,M.bronze);cylinder('Abajur cúpula',.27,.80,z,.13,.24,M.pillow,.10);}
 function wardrobe(x:number,z:number,w:number,d:number){box('Roupeiro',x,1.22,z,w,2.44,d,M.wood,.008);const across=w>d;const count=Math.max(1,Math.round((across?w:d)/.55));for(let i=0;i<count;i++){const offset=-(across?w:d)/2+(i+.5)*(across?w:d)/count;box('Roupeiro porta',across?x+offset:x+w/2+.012,1.24,across?z-d/2-.012:z+offset,across?w/count-.012:.024,2.38,across?.024:d/count-.012,M.wood,.006);box('Puxador roupeiro',across?x+offset+.12:x+w/2+.034,1.14,across?z-d/2-.038:z+offset+.10,.014,.42,.014,M.bronze,.005);}}
 wardrobe(.28,3.25,.5,1.85);wardrobe(1.15,4.31,1.8,.5);
 cylinder('Tapete redondo suíte',1.35,.013,3.15,.63,.015,M.rug);cylinder('Pufe suíte',1.15,.22,3.15,.24,.43,M.blanket);
 bed(3.38,1.2,.96,M.green);bed(5.02,1.2,.96,M.blanket);wardrobe(3.14,3.04,.65,.9);
 box('Mesa de cabeceira dupla',4.2,.43,.45,.43,.42,.38,M.wood,.02);cylinder('Luminária quarto',4.2,.77,.45,.09,.24,M.ceramic);
 // Baths: sanitary fixtures, shower screens, niches, fittings and mirrors.
 for(const x of [0,2.75]){
  box('Piso banheiro',x+1.36,.006,5.42,2.60,.01,1.38,M.tile);
  box('Parede banho pedra',x+.53,1.34,6.065,1.02,2.68,.025,M.quartz);
  box('Nicho banho',x+.53,1.42,6.043,.56,.33,.035,M.dark,.015);box('Fundo nicho',x+.53,1.42,6.02,.49,.26,.012,M.oakDark);
  cylinder('Frasco shampoo',x+.43,1.38,5.98,.035,.16,M.ceramic);cylinder('Frasco sabonete',x+.62,1.36,5.98,.03,.12,M.green);
  box('Box vidro',x+1.04,1.08,5.72,.012,2.16,.72,glass);box('Box ferragem',x+1.04,2.17,5.72,.025,.025,.76,M.dark);
  tube('Chuveiro',[new T.Vector3(x+.5,2.18,6.02),new T.Vector3(x+.5,2.18,5.70)],.012,M.dark);cylinder('Ducha',x+.5,2.16,5.66,.12,.025,M.dark);
  cylinder('Registro',x+.5,1.10,6.02,.035,.025,M.dark);
  box('Gabinete banho',x+2.19,.57,5.88,.72,.50,.43,M.wood,.025);box('Tampo banho',x+2.19,.84,5.86,.76,.035,.48,M.quartz,.02);
  oval('Cuba louça',x+2.19,.90,5.82,.25,.085,.17,M.ceramic);oval('Cuba cavidade',x+2.19,.96,5.82,.17,.015,.10,M.quartz);
  tube('Torneira banho',[new T.Vector3(x+2.19,.86,6.0),new T.Vector3(x+2.19,1.08,6.0),new T.Vector3(x+2.19,1.08,5.87)],.01,M.bronze);
  box('Aro espelho banho',x+2.19,1.55,6.048,.75,1.0,.022,M.bronze,.025);
  const mirror=new Reflector(new T.PlaneGeometry(.72,.97),{color:0xbec5c5,textureWidth:512,textureHeight:512,clipBias:.004});
  mirror.name='Espelho do banheiro';mirror.position.set(x+2.19,1.55,6.032);mirror.rotation.y=Math.PI;
  const reflect=mirror.onBeforeRender.bind(mirror);mirror.onBeforeRender=(...args)=>{if(args[1].overrideMaterial)return;reflect(...args);};group.add(mirror);mirrors.push(mirror);
  box('Luz espelho',x+2.19,2.08,6.01,.63,.025,.035,M.light,.009);
  oval('Vaso sanitário',x+1.37,.25,5.78,.23,.25,.30,M.ceramic);
  oval('Assento vaso',x+1.37,.48,5.73,.235,.026,.29,M.ceramic);
  oval('Centro assento',x+1.37,.502,5.73,.145,.009,.19,M.dark);
  box('Caixa sanitária',x+1.37,.70,6.0,.39,.44,.16,M.ceramic,.055);
  box('Acionamento',x+1.37,.928,6.0,.075,.012,.04,M.steel,.009);
  box('Toalheiro',x+2.6,1.15,5.3,.025,.025,.35,M.bronze);
  box('Toalha',x+2.57,.96,5.3,.025,.38,.27,M.fabric,.012);
 }
 // Small accessories and foliage add scale without blocking circulation.
 function plant(x:number,y:number,z:number,size:number){
  cylinder('Vaso planta',x,y+size*.15,z,size*.17,size*.3,M.ceramic,size*.20);cylinder('Terra planta',x,y+size*.31,z,size*.18,.012,M.soil);
  for(let i=0;i<11;i++){const a=i*2.39996,h=size*(.5+(i%4)*.12);const tip=new T.Vector3(x+Math.cos(a)*size*.29,y+h,z+Math.sin(a)*size*.29);tube('Haste planta',[new T.Vector3(x,y+size*.27,z),new T.Vector3(x,y+h*.8,z),tip],.003,M.leaf);const leaf=oval('Folha',tip.x,tip.y,tip.z,size*.10,size*.025,size*.22,M.leaf);leaf.rotation.set(.25,a,.25);}
 }
 plant(6.2,.40,3.33,.32);plant(9.67,.96,1.65,.42);plant(7.72,.1,.24,.65);
 for(const [x,y,z] of [[.5,1.65,3.2],[4.15,1.62,3.58]]){box('Quadro moldura',x,y,z,.55,.72,.025,M.oakDark,.008);box('Quadro papel',x,y,z-.017,.48,.65,.005,M.pillow);const art=oval('Quadro forma',x,y,z-.025,.14,.21,.003,M.green);art.rotation.z=.4;}
 // Recessed lighting hardware and cove over the social space.
 box('Sanca cozinha',8.9,2.62,3.05,2.2,.2,6.0,M.ceiling);
 box('Perfil luz sala',5.73,2.66,1.8,.018,.025,3.3,M.light);
 for(const [x,z] of [[6.8,3.8],[8.9,1.4],[8.9,3.7],[1.3,3.0],[4.2,2.9],[1.8,5.3],[4.6,5.3]]){cylinder('Aro spot',x,2.705,z,.055,.02,M.dark);cylinder('Difusor spot',x,2.692,z,.037,.012,M.light);}
 // Distant context through the windows is illustrative, never a floor-specific view.
 const sky=new T.Mesh(new T.PlaneGeometry(80,40),mat('#b4c9d3',1,{emissive:'#8aa9bd',emissiveIntensity:.6}));sky.position.set(5,4,-35);group.add(sky);
 for(let i=0;i<9;i++){const x=-12+i*4.3,h=3+(i%4)*1.8;box('Entorno distante',x,h/2-3,-17-(i%3)*4,3.2,h,3,mat(i%2?'#9fa9aa':'#c2bcb0',.9));for(let y=-1;y<h-3;y+=1.5)for(const dx of [-.8,.8])box('Janela entorno',x+dx,y,-15.48-(i%3)*4,.63,.70,.025,M.screen);}
 return{group,dispose:()=>{const geometries=new Set<T.BufferGeometry>();group.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());mirrors.forEach(m=>m.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
