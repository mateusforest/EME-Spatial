import * as T from 'three';
import {lotById, lots, number, plan, terrainHeight} from './model';
import type {ViewMode} from './model';

type Kind='lot'|'block'|'road'|'area'|'measure';
type Marker={element:HTMLElement;point:T.Vector3;kind:Kind;id:string;block?:string;width:number;height:number};
type Rect={left:number;top:number;right:number;bottom:number};
export const overlaps=(a:Rect,b:Rect,gap=6)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const panelSelector='.pr-intro,.pr-lot-list,.pr-detail,.pr-top-actions,.pr-solar,.pr-legend,.pr-dock,.pr-view-controls,.pr-pan-controls';

/** Screen-space labels: constant typography, priority placement and no terrain clipping. */
export function createAnnotations(host:HTMLDivElement,select:(id:string)=>void,focusBlock:(block:string)=>void){
  const layer=document.createElement('div');layer.className='pr-annotations';layer.setAttribute('aria-label','Identificações do loteamento');host.append(layer);
  const markers:Marker[]=[];let dimensions:Marker[]=[];let currentLot='';
  const point=(x:number,z:number,lift=.3)=>new T.Vector3(x,terrainHeight(x,z)+lift,z);
  function add(text:string,kind:Kind,id:string,position:T.Vector3,block?:string,action?:()=>void){
    const element=document.createElement(action?'button':'span');element.className=`pr-map-label pr-map-${kind}`;element.textContent=text;
    if(action){element.setAttribute('type','button');element.setAttribute('aria-label',kind==='block'?`Enquadrar quadra ${id}`:`Selecionar lote ${id}`);element.addEventListener('click',action);}
    element.hidden=true;layer.append(element);
    const width=kind==='lot'?48:kind==='block'?84:kind==='road'?64:kind==='measure'?Math.max(92,text.length*5.5+18):Math.max(106,text.length*6+24);
    element.style.width=`${width}px`;
    const marker={element,point:position,kind,id,block,width,height:kind==='measure'?26:kind==='block'||kind==='area'?28:24};
    markers.push(marker);return marker;
  }
  for(const lot of lots)add(lot.id,'lot',lot.id,point(...lot.center as [number,number]),lot.block,()=>select(lot.id));
  for(const block of 'ABCDEFGH'){
    const members=lots.filter(l=>l.block===block),x=members.reduce((n,l)=>n+l.center[0],0)/members.length,z=members.reduce((n,l)=>n+l.center[1],0)/members.length;
    add(`Quadra ${block}`,'block',block,point(x,z),block,()=>focusBlock(block));
  }
  for(const road of plan.roads)add(road.name,'road',road.name,point(...road.label as [number,number]));
  for(const [i,area] of plan.otherPolygons.entries())add(['Recreação 01','Institucional','Recreação 02'][i],'area',String(i),point(...area.center as [number,number]));
  const projected=new T.Vector3(),view=new T.Vector3();
  function update(camera:T.PerspectiveCamera,mode:ViewMode,selected:string,block:string,visible:boolean){
    if(currentLot!==selected){
      dimensions.forEach(m=>{m.element.remove();markers.splice(markers.indexOf(m),1);});dimensions=[];currentLot=selected;
      const lot=lotById.get(selected);
      if(lot)for(const [i,edge] of [lot.front,lot.back,...lot.sides].entries()){
        const x=(edge.a[0]+edge.b[0])/2,z=(edge.a[1]+edge.b[1])/2;
        // A small inward offset ties each dimension to its actual boundary.
        const dx=lot.center[0]-x,dz=lot.center[1]-z,len=Math.hypot(dx,dz)||1;
        const text=`${i===0?'Frente':i===1?'Fundos':`Lateral ${i-1}`} ${edge.source==='scaled'?'≈ ':''}${number(edge.value)} m`;
        dimensions.push(add(text,'measure',`${selected}-${i}`,point(x+dx/len*.5,z+dz/len*.5,.45),lot.block));
      }
    }
    const aerial=mode==='aerial'||mode==='plan';layer.hidden=!aerial||!visible;
    if(layer.hidden)return;
    const bounds=host.getBoundingClientRect(),w=bounds.width,h=bounds.height;
    const occupied:Rect[]=Array.from(host.parentElement!.querySelectorAll<HTMLElement>(panelSelector)).filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>{
      const r=e.getBoundingClientRect();return {left:r.left-bounds.left,top:r.top-bounds.top,right:r.right-bounds.left,bottom:r.bottom-bounds.top};
    });
    camera.getWorldDirection(view);
    const candidates=markers.map(marker=>{
      const distance=camera.position.distanceTo(marker.point);
      const active=marker.kind==='lot'&&marker.id===selected;
      const priority=marker.kind==='measure'?0:active?1:marker.kind==='block'&&marker.id===block?2:marker.kind==='block'?3:marker.kind==='area'?4:marker.kind==='lot'?5:6;
      return {marker,distance,priority,active};
    }).sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
    let count=0;
    for(const {marker:m,distance,active} of candidates){
      m.element.hidden=true;
      const isBlock=m.kind==='block',near=distance<155;
      if(m.kind==='lot'&&!active&&((!near&&m.block!==block)||(block&&m.block!==block)))continue;
      if(isBlock&&near&&m.id!==block)continue;
      if(m.kind==='road'&&(distance<35||distance>380))continue;
      if(m.kind==='measure'&&distance>175)continue;
      if(count>(w<600?12:30)&&m.kind!=='measure'&&!active)continue;
      projected.copy(m.point).project(camera);
      if(projected.z<-1||projected.z>1||m.point.clone().sub(camera.position).dot(view)<=0)continue;
      const x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;
      const rect={left:x-m.width/2,right:x+m.width/2,top:y-m.height/2,bottom:y+m.height/2};
      if(rect.left<8||rect.right>w-8||rect.top<10||rect.bottom>h-12||occupied.some(r=>overlaps(rect,r,m.kind==='measure'?3:7)))continue;
      m.element.hidden=false;m.element.style.transform=`translate(${Math.round(rect.left)}px,${Math.round(rect.top)}px)`;
      m.element.classList.toggle('is-selected',active||isBlock&&m.id===block);occupied.push(rect);count++;
    }
  }
  function draw(ctx:CanvasRenderingContext2D){
    if(layer.hidden)return;
    const origin=host.getBoundingClientRect();
    for(const {element} of markers){
      if(element.hidden)continue;
      const r=element.getBoundingClientRect(),style=getComputedStyle(element),x=r.left-origin.left,y=r.top-origin.top;
      ctx.beginPath();ctx.roundRect(x,y,r.width,r.height,parseFloat(style.borderRadius)||6);
      ctx.fillStyle=style.backgroundColor;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=style.borderColor;ctx.stroke();
      ctx.fillStyle=style.color;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(element.textContent||'',x+r.width/2,y+r.height/2);
    }
  }
  return {update,draw,dispose(){layer.remove();}};
}
