import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type BotaniquePlanVector = [number, number, number];
export type BotaniquePlanPoint = readonly [number, number];
export type BotaniquePlanCamera = {position: BotaniquePlanVector; target: BotaniquePlanVector};
export type BotaniquePlanRoomView = BotaniquePlanCamera & {id: string; label: string};
export type BotaniquePlanFloor = {
  id?: string;
  label?: string;
  /** Section depth, not a floor number. The caller labels illustrative lower levels explicitly. */
  levelsBelow?: number;
};
export type BotaniquePlanHotspot = {
  id: string;
  label: string;
  position: BotaniquePlanVector;
  polygon: readonly BotaniquePlanPoint[];
  camera?: BotaniquePlanCamera;
  primary: boolean;
};
export type BotaniquePlanUnit = {
  id: string;
  final: number;
  label: string;
  marketedArea: number;
  polygon: readonly BotaniquePlanPoint[];
  labelPosition: BotaniquePlanVector;
  active: boolean;
};

// Registration against the received 1320×730 commercial drawing. Only Final 1 is
// anchored to an existing model; these are visual proportions, not surveyed dimensions.
const SCALE_X = 7.2 / 232;
const SCALE_Z = 7.8 / 243;
const FLOOR_HEIGHT = 2.86;
const rasterPoint = (x: number, y: number): BotaniquePlanPoint => [(x - 62) * SCALE_X, (y - 618) * SCALE_Z];
const rasterPolygon = (points: readonly BotaniquePlanPoint[]) => points.map(([x, y]) => rasterPoint(x, y));
const rectangle = (x0: number, z0: number, x1: number, z1: number): BotaniquePlanPoint[] => [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const rasterRect = (x0: number, y0: number, x1: number, y1: number) => rasterPolygon(rectangle(x0,y0,x1,y1));

const UNIT_REFERENCE = [
  {final:1, area:55.55, outline:[[62,375],[294,375],[294,618],[62,618]], label:[165,528]},
  {final:2, area:51.45, outline:[[316,441],[360,441],[360,421],[581,421],[581,609],[400,609],[400,645],[316,645]], label:[459,543]},
  {final:3, area:51.45, outline:[[730,421],[948,421],[948,441],[994,441],[994,645],[910,645],[910,609],[730,609]], label:[852,543]},
  {final:4, area:55.55, outline:[[1027,375],[1258,375],[1258,618],[1027,618]], label:[1154,528]},
  {final:5, area:50.5, outline:[[1027,99],[1112,99],[1112,135],[1258,135],[1258,344],[1027,344]], label:[1153,238]},
  {final:6, area:51.45, outline:[[740,111],[921,111],[921,75],[1007,75],[1007,297],[740,297]], label:[852,206]},
  {final:7, area:51.45, outline:[[307,75],[393,75],[393,111],[574,111],[574,297],[307,297]], label:[459,206]},
  {final:8, area:50.5, outline:[[62,135],[207,135],[207,99],[294,99],[294,344],[62,344]], label:[166,238]},
] as const;

// Room polygons are the current Final 1 contract in Three X/Z (Blender X/-Y).
// The L-shaped suite must not capture a click on its bathroom.
const ROOM_REFERENCE: {id: string; label: string; polygon: BotaniquePlanPoint[]; point: BotaniquePlanPoint; primary?: boolean}[] = [
  {id:'living',label:'Estar e jantar',polygon:rectangle(4.53,-4.86,7.2,-1.15),point:[5.44,-2.94],primary:true},
  {id:'kitchen',label:'Cozinha e serviço',polygon:rectangle(3.4,-7.8,7.2,-4.86),point:[5.02,-6.31],primary:true},
  {id:'hall',label:'Circulação íntima',polygon:rectangle(2.65,-4.86,4.53,-3.6),point:[3.43,-4.3]},
  {id:'suite',label:'Suíte',polygon:[[0,0],[3.17,0],[3.17,-2.66],[4.53,-2.66],[4.53,-3.6],[0,-3.6]],point:[2.44,-2.96]},
  {id:'bedroom',label:'Dormitório',polygon:rectangle(0,-7.8,3.4,-4.86),point:[2.88,-5.45]},
  {id:'bathroom',label:'Banheiro social',polygon:rectangle(0,-4.86,2.65,-3.6),point:[2.28,-4.35]},
  {id:'ensuite',label:'Banheiro da suíte',polygon:rectangle(3.17,-2.66,4.53,0),point:[3.68,-1.6]},
  {id:'balcony',label:'Sacada',polygon:rectangle(4.53,-1.15,7.2,0),point:[6.1,-.6],primary:true},
];

function contains(polygon: readonly BotaniquePlanPoint[], x: number, z: number) {
  let inside = false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,az]=polygon[j], [bx,bz]=polygon[i];
    const cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
    if(Math.abs(cross)<1e-8 && x>=Math.min(ax,bx)-1e-8 && x<=Math.max(ax,bx)+1e-8 && z>=Math.min(az,bz)-1e-8 && z<=Math.max(az,bz)+1e-8)return true;
    if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }
  return inside;
}

/** No renderer, loader, DOM, textures or GLB clones. The caller owns visibility and animation. */
export function createBotaniquePlanContext(options: {rooms?: readonly BotaniquePlanRoomView[]; floor?: BotaniquePlanFloor} = {}) {
  const group = new T.Group();
  group.name='BOTANIQUE_PLAN_CONTEXT';
  group.visible=false;
  group.userData.contextOnly=true;
  group.userData.sourceLabel='Pavimento-tipo da referência; cotas estimadas';
  const top = new T.Group(), below = new T.Group(), landscape = new T.Group();
  top.name='B_PLAN_TYPICAL_FLOOR';below.name='B_PLAN_LOWER_STRUCTURE';landscape.name='B_PLAN_DISTANT_LANDSCAPE';
  group.add(top,below,landscape);
  let disposed=false;
  const geometries=new Set<T.BufferGeometry>();
  const materials=new Set<T.Material>();
  const material=(name:string,color:string,roughness=.88)=>{
    const result=new T.MeshStandardMaterial({name,color,roughness,metalness:0});materials.add(result);return result;
  };
  const floorMaterial=material('B_PLAN_floor','#cdc8ba');
  const wallMaterial=material('B_PLAN_cut_wall','#d9d8ce');
  const slabMaterial=material('B_PLAN_slab','#b8bbae');
  const coreMaterial=material('B_PLAN_core','#8d948c');
  const windowMaterial=material('B_PLAN_lower_windows','#778583',.43);windowMaterial.metalness=.12;
  const insetMaterial=material('B_PLAN_room_inset','#c0c4b8');
  const railMaterial=material('B_PLAN_rail','#737e74');
  const highlightMaterial=material('B_PLAN_active_unit','#809c80');
  const soilMaterial=material('B_PLAN_landscape','#818d74');
  const pathMaterial=material('B_PLAN_path','#b9b5a3');
  const streetMaterial=material('B_PLAN_street','#858a82');
  const barkMaterial=material('B_PLAN_bark','#6c6656');
  const foliageMaterials=['#657761','#748364','#586e5c'].map((color,i)=>material(`B_PLAN_tree_${i}`,color));
  foliageMaterials.forEach(mat=>mat.vertexColors=true);

  type Batches = Map<T.Material,T.BufferGeometry[]>;
  const batches=():Batches=>new Map();
  const add=(batch:Batches,geometry:T.BufferGeometry,mat:T.Material)=>{
    // Normalize every primitive for reliable merging without groups or per-object draw calls.
    const plain=geometry.index?geometry.toNonIndexed():geometry;
    if(plain!==geometry)geometry.dispose();
    plain.deleteAttribute('uv');
    const list=batch.get(mat)||[];list.push(plain);batch.set(mat,list);
  };
  const box=(batch:Batches,mat:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    add(batch,new T.BoxGeometry(sx,sy,sz).translate(x,y,z),mat);
  };
  const prism=(batch:Batches,mat:T.Material,polygon:readonly BotaniquePlanPoint[],bottom:number,height:number)=>{
    const shape=new T.Shape();polygon.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:1});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,bottom,0);add(batch,geometry,mat);
  };
  const wall=(batch:Batches,mat:T.Material,a:BotaniquePlanPoint,b:BotaniquePlanPoint,bottom=0,height=.85,thickness=.14)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.001)return;
    const geometry=new T.BoxGeometry(length,height,thickness).rotateY(-Math.atan2(dz,dx));
    geometry.translate((a[0]+b[0])/2,bottom+height/2,(a[1]+b[1])/2);add(batch,geometry,mat);
  };
  const outline=(batch:Batches,mat:T.Material,polygon:readonly BotaniquePlanPoint[],bottom:number,height:number,thickness=.14)=>{
    polygon.forEach((point,i)=>wall(batch,mat,point,polygon[(i+1)%polygon.length],bottom,height,thickness));
  };
  const pixelWall=(batch:Batches,a:BotaniquePlanPoint,b:BotaniquePlanPoint,height=.65)=>wall(batch,wallMaterial,rasterPoint(...a),rasterPoint(...b),.025,height,.105);
  const flush=(batch:Batches,parent:T.Group)=>{
    for(const [mat,list] of batch) {
      const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());
      if(!geometry)continue;
      geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);
      const mesh=new T.Mesh(geometry,mat);mesh.name=mat.name;mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.contextOnly=true;
      parent.add(mesh);
    }
  };
  const clear=(parent:T.Group)=>{
    parent.traverse(o=>{if(o instanceof T.Mesh){geometries.delete(o.geometry);o.geometry.dispose();}});parent.clear();
  };

  const units:BotaniquePlanUnit[]=UNIT_REFERENCE.map(unit=>{
    const [x,z]=rasterPoint(unit.label[0],unit.label[1]);
    return {id:`final-${unit.final}`,final:unit.final,label:`Final ${unit.final}`,marketedArea:unit.area,polygon:rasterPolygon(unit.outline),labelPosition:[x,1.18,z],active:unit.final===1};
  });
  const unitFootprint=rectangle(0,-7.8,7.2,0);
  const unitBounds=new T.Box3(new T.Vector3(0,0,-7.8),new T.Vector3(7.2,2.72,0));
  const floorBounds=new T.Box3();
  units.forEach(unit=>unit.polygon.forEach(([x,z])=>floorBounds.expandByPoint(new T.Vector3(x,0,z))));
  floorBounds.max.y=2.72;
  const bounds=floorBounds.clone();
  const center=floorBounds.getCenter(new T.Vector3());
  const camera:BotaniquePlanCamera={position:[center.x-3,37,center.z+32],target:[center.x,.4,center.z]};
  // Near-vertical detail minimizes wall/furniture parallax during room selection.
  // The height retains the complete 2.72 m wall envelope on narrow phones when
  // the viewer applies its existing responsive camera-distance adjustment.
  const unitCamera:BotaniquePlanCamera={position:[3.6,15,-1.9],target:[3.6,.4,-3.9]};

  const roomHotspots:BotaniquePlanHotspot[]=ROOM_REFERENCE.map(room=>{
    const view=options.rooms?.find(v=>v.id===room.id);
    // An entry camera can be very close to a doorway. Keep its HTML/3D plan marker
    // inside this room even if a future camera is moved outside the room for framing.
    const point=view && contains(room.polygon,view.position[0],view.position[2])?[view.position[0],view.position[2]]:room.point;
    return {id:room.id,label:view?.label||room.label,position:[point[0],.16,point[1]],polygon:room.polygon.map(p=>[...p] as BotaniquePlanPoint),primary:!!room.primary,
      ...(view?{camera:{position:[...view.position] as BotaniquePlanVector,target:[...view.target] as BotaniquePlanVector}}:{})};
  });

  const floorBatch=batches();
  units.forEach(unit=>{
    prism(floorBatch,slabMaterial,unit.polygon,-.24,.2);
    if(unit.active)return; // The actual Final 1 GLB supplies every room, wall and finish.
    prism(floorBatch,floorMaterial,unit.polygon,-.035,.06);
    outline(floorBatch,wallMaterial,unit.polygon,.025,.92,.15);
  });
  outline(floorBatch,highlightMaterial,unitFootprint,-.13,.09,.12);

  // The four lateral and four transverse wings have independent traced silhouettes.
  // Low partitions preserve their different topologies without inventing detailed interiors.
  const partitions: [BotaniquePlanPoint,BotaniquePlanPoint][] = [
    [[62,249],[205,249]],[[165,137],[165,219]],[[207,139],[207,217]],[[144,255],[144,339]],[[207,246],[207,335]],
    [[1114,139],[1114,217]],[[1157,137],[1157,219]],[[1114,249],[1258,249]],[[1175,255],[1175,339]],[[1114,246],[1114,335]],
    [[390,115],[390,210]],[[465,115],[465,215]],[[525,215],[568,215]],[[529,215],[529,273]],
    [[922,115],[922,210]],[[846,115],[846,215]],[[747,215],[790,215]],[[786,215],[786,273]],
    [[399,510],[399,602]],[[470,508],[470,602]],[[529,444],[529,490]],[[533,490],[578,490]],
    [[910,510],[910,602]],[[839,508],[839,602]],[[781,444],[781,490]],[[733,490],[776,490]],
    [[1109,379],[1109,443]],[[1109,492],[1109,576]],[[1149,502],[1254,502]],[[1113,580],[1149,580]],[[1149,582],[1149,613]],
    [[1110,468],[1254,468]],[[1174,379],[1174,465]],
  ];
  partitions.forEach(([a,b])=>pixelWall(floorBatch,a,b));
  // Balcony strips, lowered parapets and simple wet/service-room tones are contextual only.
  const balconies=[[207,99,294,136],[307,75,393,112],[921,75,1007,112],[1027,99,1112,136],[316,608,400,645],[910,608,994,645],[1027,580,1110,618]];
  balconies.forEach(([x0,y0,x1,y1])=>prism(floorBatch,insetMaterial,rasterRect(x0+4,y0+4,x1-4,y1-4),.029,.015));

  const corridor=rasterPolygon([[331,318],[377,318],[377,337],[593,337],[593,318],[717,318],[717,337],[932,337],[932,318],[978,318],[978,405],[933,405],[933,384],[377,384],[377,403],[331,403]]);
  prism(floorBatch,slabMaterial,corridor,-.24,.2);prism(floorBatch,floorMaterial,corridor,-.035,.06);
  // Short entry landings close the presentation drawing's visual separation. Their
  // exact widths are estimates and never become navigation or selectable apartments.
  const landings=[[286,343,342,387],[964,343,1035,387],[553,288,587,340],[725,288,759,340],[553,382,587,428],[722,382,756,428]];
  landings.forEach(([x0,y0,x1,y1])=>prism(floorBatch,slabMaterial,rasterRect(x0,y0,x1,y1),-.24,.25));
  const corridorWalls:[BotaniquePlanPoint,BotaniquePlanPoint][]=[[[377,337],[548,337]],[[758,337],[930,337]],[[377,384],[548,384]],[[758,384],[930,384]]];
  corridorWalls.forEach(([a,b])=>pixelWall(floorBatch,a,b,.68));

  // Two lift shafts to the south, stair enclosure to the north of the corridor.
  for(const [x0,x1] of [[594,653],[660,719]]){
    const shaft=rasterRect(x0,384,x1,449);prism(floorBatch,coreMaterial,shaft,-.24,.26);outline(floorBatch,wallMaterial,shaft,.025,1.05,.18);
    const a=rasterPoint(x0+7,387),b=rasterPoint(x1-7,387);wall(floorBatch,railMaterial,a,b,.02,.76,.035);
    const [mx,mz]=rasterPoint((x0+x1)/2,388);box(floorBatch,slabMaterial,mx,.42,mz,.018,.76,.03);
  }
  const stairs=rasterRect(593,155,718,318);prism(floorBatch,slabMaterial,stairs,-.24,.22);
  const stairWalls:[[number,number],[number,number]][]=[[[593,318],[593,155]],[[593,155],[718,155]],[[718,155],[718,318]]];
  stairWalls.forEach(([a,b])=>pixelWall(floorBatch,a,b,1.02));
  for(let i=0;i<11;i++){
    const [lx,lz]=rasterPoint(615,306-i*11.6),[rx,rz]=rasterPoint(693,178+i*11.6);
    box(floorBatch,floorMaterial,lx,.018+i*.043,lz,1.13,.08,.35);
    box(floorBatch,floorMaterial,rx,.49+i*.043,rz,1.13,.08,.35);
  }
  prism(floorBatch,floorMaterial,rasterRect(602,160,709,176),.49,.08);
  wall(floorBatch,railMaterial,rasterPoint(642,202),rasterPoint(642,291),.06,.66,.025);
  wall(floorBatch,railMaterial,rasterPoint(670,202),rasterPoint(670,291),.06,.66,.025);
  flush(floorBatch,top);

  // Primary room markers can be paired with HTML labels. They are batched, so the
  // root viewer picks actual model surfaces and calls pickRoom rather than raycasting these.
  const hotspotBatch=batches();
  roomHotspots.filter(room=>room.primary).forEach(room=>{
    const ring=new T.RingGeometry(.14,.22,28).rotateX(-Math.PI/2).translate(...room.position);
    add(hotspotBatch,ring,highlightMaterial);
  });
  flush(hotspotBatch,top);

  let floorContext:Required<BotaniquePlanFloor>={id:'typical',label:'Pavimento-tipo',levelsBelow:0};
  const lowerFacade=(batch:Batches,polygon:readonly BotaniquePlanPoint[],y:number)=>{
    outline(batch,wallMaterial,polygon,y+.025,.91,.16);
    outline(batch,wallMaterial,polygon,y+2.19,.44,.16);
    polygon.forEach((a,index)=>{
      const b=polygon[(index+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<1.65){wall(batch,wallMaterial,a,b,y+.935,1.255,.16);return;}
      const cells=Math.max(1,Math.floor(length/2.12)),cellWidth=length/cells;
      const windowWidth=Math.min(1.32,cellWidth*.58);
      const at=(distance:number):BotaniquePlanPoint=>[a[0]+dx*distance/length,a[1]+dz*distance/length];
      let previous=0;
      for(let cell=0;cell<cells;cell++){
        const midpoint=(cell+.5)*cellWidth,start=midpoint-windowWidth/2,end=midpoint+windowWidth/2;
        // Separate recessed glazing, solid piers and pale frames read as a facade
        // instead of the previous uninterrupted dark ribbon. Layout remains illustrative.
        wall(batch,wallMaterial,at(previous),at(start),y+.935,1.255,.16);
        wall(batch,windowMaterial,at(start),at(end),y+.98,1.16,.025);
        wall(batch,wallMaterial,at(start),at(end),y+.935,.045,.18);
        wall(batch,wallMaterial,at(start),at(end),y+2.14,.05,.18);
        wall(batch,wallMaterial,at(midpoint-.022),at(midpoint+.022),y+.98,1.16,.065);
        previous=end;
      }
      wall(batch,wallMaterial,at(previous),b,y+.935,1.255,.16);
    });
  };
  function setFloorContext(floor:BotaniquePlanFloor={}) {
    if(disposed)return;
    const levels=Number.isFinite(floor.levelsBelow)?Math.max(0,Math.min(24,Math.floor(floor.levelsBelow!))):0;
    floorContext={id:floor.id||'typical',label:floor.label||'Pavimento-tipo',levelsBelow:levels};
    clear(below);clear(landscape);
    const batch=batches();
    for(let level=1;level<=levels;level++){
      const y=-level*FLOOR_HEIGHT;
      for(const unit of units){
        prism(batch,slabMaterial,unit.polygon,y-.24,.2);
        lowerFacade(batch,unit.polygon,y);
      }
      prism(batch,slabMaterial,corridor,y-.24,.2);
    }
    flush(batch,below);
    const ground=-levels*FLOOR_HEIGHT-.62;
    const garden=batches();
    box(garden,soilMaterial,center.x,ground-.12,center.z,58,.2,40);
    box(garden,streetMaterial,center.x,ground+.005,8.7,58,.035,6.3);
    box(garden,pathMaterial,center.x,ground+.025,4.83,48,.045,1.42);
    box(garden,pathMaterial,-3.2,ground+.025,-8.1,1.5,.045,27.2);
    box(garden,pathMaterial,40.3,ground+.025,-8.1,1.5,.045,27.2);
    box(garden,pathMaterial,center.x,ground+.025,-21,43.5,.045,1.15);
    // Clustered, smoothly shaded crowns have an irregular broadleaf silhouette.
    // All lobes still merge into three foliage draw calls; there are no alpha cards,
    // textures, external models or shadow-casting trees in this overview context.
    const crownTemplate=new T.SphereGeometry(1,10,7);
    const crown=(x:number,y:number,z:number,sx:number,sy:number,sz:number,seed:number,mat:T.Material)=>{
      const geometry=crownTemplate.clone(),position=geometry.getAttribute('position'),colors=new Float32Array(position.count*3);
      for(let v=0;v<position.count;v++){
        const px=position.getX(v),py=position.getY(v),pz=position.getZ(v);
        const ripple=Math.sin(px*6.1+py*3.7+seed)*Math.cos(pz*5.9-py*2.6+seed*.73);
        const radial=1+.09*ripple+.035*Math.sin(px*12.1+pz*8.4+seed*1.7);
        position.setXYZ(v,px*radial*sx+x,py*radial*sy+y,pz*radial*sz+z);
        const shade=.91+.055*(py+1)+ripple*.035;
        colors.set([shade,shade,shade*.985],v*3);
      }
      geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();add(garden,geometry,mat);
    };
    const branch=(from:T.Vector3,to:T.Vector3,radius:number)=>{
      const direction=to.clone().sub(from),geometry=new T.CylinderGeometry(radius*.6,radius,direction.length(),5);
      geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));
      const midpoint=from.clone().add(to).multiplyScalar(.5);geometry.translate(midpoint.x,midpoint.y,midpoint.z);add(garden,geometry,barkMaterial);
    };
    for(let i=0;i<29;i++){
      const side=i<13?-1:1, index=i<13?i:i-13;
      let x=side<0?-6.3:44.0,z=-21+index*2.08;
      if(i>=23){x=-1+(i-23)*7.1;z=-24;}
      x+=Math.sin(i*2.37)*.43;z+=Math.cos(i*1.91)*.51;
      const height=2.45+(i%4)*.28,radius=1.02+(i%3)*.18;
      const leanX=Math.sin(i*1.7)*.18,leanZ=Math.cos(i*2.1)*.14;
      const trunkTop=new T.Vector3(x+leanX,ground+height,z+leanZ);
      branch(new T.Vector3(x,ground,z),trunkTop,.12);
      crown(trunkTop.x,ground+height+.28,trunkTop.z,radius*.81,radius*.86,radius*.76,i*.93,foliageMaterials[i%3]);
      for(let lobe=0;lobe<4;lobe++){
        const angle=lobe*Math.PI*.5+i*1.73,reach=radius*(.58+.06*Math.sin(i+lobe));
        const cx=trunkTop.x+Math.cos(angle)*reach,cz=trunkTop.z+Math.sin(angle)*reach,cy=ground+height+.10+Math.sin(i+lobe*2.3)*.17;
        crown(cx,cy,cz,radius*(.6+.06*Math.sin(lobe+i)),radius*(.63+.06*Math.cos(i)),radius*.62,i*1.31+lobe*2.7,foliageMaterials[(i+(lobe===2?1:0))%3]);
        if(lobe<3)branch(new T.Vector3(x,ground+height*.65,z),new T.Vector3(cx,cy-.12,cz),.05);
      }
      crown(trunkTop.x+radius*.12,ground+height+radius*.82,trunkTop.z-radius*.08,radius*.56,radius*.67,radius*.57,i*2.17+9,foliageMaterials[(i+1)%3]);
    }
    crownTemplate.dispose();
    flush(garden,landscape);
    bounds.copy(floorBounds);bounds.min.y=ground-.22;
    group.userData.floorContext={...floorContext};
  }
  setFloorContext(options.floor);

  return {
    group,bounds,floorBounds,unitBounds,unitFootprint,units,camera,unitCamera,roomHotspots,
    sourceLabel:group.userData.sourceLabel as string,
    get floorContext(){return {...floorContext};},
    setFloorContext,
    setVisible(visible:boolean){if(!disposed)group.visible=visible;},
    /** Only Final 1 is enterable. x/z can come from a floor, wall or furniture raycast. */
    pickRoom(point:{x:number;y?:number;z:number}):BotaniquePlanHotspot|undefined{
      if(disposed||!group.visible||!Number.isFinite(point.x)||!Number.isFinite(point.z))return undefined;
      if(point.y!==undefined&&(!Number.isFinite(point.y)||point.y<-.08||point.y>2.9))return undefined;
      return roomHotspots.find(room=>contains(room.polygon,point.x,point.z));
    },
    dispose(){
      if(disposed)return;disposed=true;group.visible=false;group.removeFromParent();
      geometries.forEach(geometry=>geometry.dispose());geometries.clear();
      materials.forEach(mat=>mat.dispose());materials.clear();group.clear();
    },
  };
}

export type BotaniquePlanContext = ReturnType<typeof createBotaniquePlanContext>;
