import {createBotaniqueNavigator} from '../botaniqueNavigation';
import type {BotaniqueNavigator,BotaniqueNavigationData,BotaniqueNavPoint} from '../botaniqueNavigation';

let navigator:BotaniqueNavigator|undefined;
self.onmessage=(event:MessageEvent<{data?:BotaniqueNavigationData;id:number;from:BotaniqueNavPoint;to:BotaniqueNavPoint}>)=>{
 const {data,id,from,to}=event.data;
 if(data){navigator=createBotaniqueNavigator(data,{radius:.18,eyeHeight:1.65,bodyHeight:1.78,gridSize:.15,maxStep:.19,maxSlopeDegrees:38,maxExpandedNodes:40000,maxSearchMs:2500});return;}
 if(!navigator)return;
 const result=navigator.planRoute(from,to);
 self.postMessage({id,result});
};
