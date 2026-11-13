import {calculateBudget,mediaItems,tiers,validateBudget} from './commercial-budget.ts';
import {newOperation,validateOperation} from './lot-operation.ts';
import type {Operation} from './lot-operation.ts';

export function operationFromBudget(input:unknown,id:string,revision:number,current:Operation=newOperation()):Operation{
 const b=validateBudget(input);
 if(current.receipts.length||current.stages.some(s=>s.authorized||Number(s.progress)>0||Number(s.spent)>0)||current.cloud.activated)throw Error('Este acompanhamento já tem execução ou repasses. Crie outro acompanhamento para usar uma nova proposta.');
 if(b.commercial.mode!=='lot'||b.commercial.installments!=='1')throw Error('O acompanhamento exige valor fixo por lote e remuneração em parcela única após a entrada do comprador.');
 if(!b.commercial.price||Number(b.commercial.price)<=0)throw Error('Defina um valor positivo por lote no orçamento antes de preparar o acompanhamento.');
 const costs=calculateBudget(b);
 const known=b.cloud.mode==='local'||(['desktop','streams'].includes(b.cloud.mode)&&['rate','fixed','fx','extra',...(b.cloud.mode==='streams'?['sessions','minutes']:['hours'])].every(k=>b.cloud[k as 'rate']!==''));
 return validateOperation({...current,name:b.name,units:b.units,fee:b.commercial.price,cloud:{...current.cloud,monthly:known?costs.cloudMonthly.toFixed(2):''},sourceBudget:{id,revision,name:b.name,scope:b.scope,package:b.include3d?tiers.find(t=>t.id===b.tier)!.name:'Sem experiência 3D',revisions:b.revisions,deliveryWeeks:b.deliveryWeeks,units:b.units,fee:b.commercial.price,media:mediaItems.map(m=>({name:m.name,quantity:b.media[m.id].quantity}))}});
}
export function copyOperationPlan(value:Operation):Operation{
 const v=validateOperation(value);
 return {...newOperation(),name:v.name.slice(0,165)+' · cópia',units:v.units,fee:v.fee,base:v.base,sourceBudget:v.sourceBudget?structuredClone(v.sourceBudget):undefined,cloud:{...newOperation().cloud,monthly:v.cloud.monthly,minutes:v.cloud.minutes}};
}
