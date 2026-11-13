import * as T from 'three';
import {areaById,lotById,solarPosition,terrainHeight,timeLabel} from './model';

/** Spatial guide uses the very same solar calculation as the directional light.
 * It illustrates direction, not a certified insolation/heat-map analysis. */
export function createSolarGuide(scene:T.Scene,host:HTMLElement){
 const group=new T.Group();group.visible=false;scene.add(group);
 const path=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#e9c87b',dashSize:.7,gapSize:.7,transparent:true,opacity:.7,depthTest:false}));path.renderOrder=8;group.add(path);
 const ray=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#f3d58b',transparent:true,opacity:.65,depthTest:false}));ray.renderOrder=8;group.add(ray);
 const sun=new T.Mesh(new T.SphereGeometry(.42,12,8),new T.MeshBasicMaterial({color:'#ffe0a1',depthTest:false}));sun.renderOrder=9;group.add(sun);
 const marker=document.createElement('div');marker.className='pr-sun-marker';marker.hidden=true;
 marker.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg><span></span>';
 host.append(marker);const caption=marker.querySelector('span')!;
 let enabled=false,currentHour=15.5,currentDate='',key='';
 const anchor=new T.Vector3(),projected=new T.Vector3();let radius=34;
 function update(hour:number,date:string,id:string,areaId:string){
  currentHour=hour;currentDate=date;
  const lot=lotById.get(id),area=areaById.get(areaId),subject=lot||area;
  if(subject){const [x,z]=subject.center;anchor.set(x,terrainHeight(x,z)+.1,z);radius=T.MathUtils.clamp(Math.max(...subject.polygon.map(([px,pz])=>Math.hypot(px-x,pz-z)))*.72,12,45);}else {anchor.set(0,terrainHeight(0,0),0);radius=72;}
  const nextKey=`${date}:${id}:${areaId}`;
  if(nextKey!==key){key=nextKey;const points:T.Vector3[]=[];for(let h=6;h<=20;h+=.1){const solar=solarPosition(h,date);if(solar.elevation>=0)points.push(anchor.clone().addScaledVector(new T.Vector3(...solar.direction),radius));}path.geometry.dispose();path.geometry=new T.BufferGeometry().setFromPoints(points);path.computeLineDistances();}
  const solar=solarPosition(hour,date);sun.position.copy(anchor).addScaledVector(new T.Vector3(...solar.direction),radius);sun.visible=solar.elevation>=0;ray.visible=sun.visible;
  ray.geometry.dispose();ray.geometry=new T.BufferGeometry().setFromPoints([sun.position,anchor]);caption.textContent=timeLabel(hour);
 }
 function project(camera:T.PerspectiveCamera){
  marker.hidden=true;if(!enabled||!sun.visible)return;
  projected.copy(sun.position).project(camera);if(projected.z<-1||projected.z>1)return;
  const x=(projected.x+1)*host.clientWidth/2,y=(1-projected.y)*host.clientHeight/2;
  if(x<40||x>host.clientWidth-50||y<45||y>host.clientHeight-45)return;
  const base=host.getBoundingClientRect();
  for(const panel of host.parentElement!.querySelectorAll<HTMLElement>('.pr-sheet,.pr-solar-sheet,.pr-search-pill,.pr-settings')){const r=panel.getBoundingClientRect();if(x>r.left-base.left-40&&x<r.right-base.left+40&&y>r.top-base.top-15&&y<r.bottom-base.top+15)return;}
  marker.hidden=false;marker.style.left=`${x}px`;marker.style.top=`${y}px`;
 }
 return {update,project,selection(id:string,areaId:string){if(currentDate)update(currentHour,currentDate,id,areaId);},show(value:boolean){enabled=value;group.visible=value;if(!value)marker.hidden=true;},dispose(){marker.remove();group.removeFromParent();for(const object of [path,ray,sun]){object.geometry.dispose();object.material.dispose();}}};
}
