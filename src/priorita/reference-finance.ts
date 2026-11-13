export type ReferencePlan='direct'|'investor'|'cash';
const cents=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function referenceFinance(price:number,plan:ReferencePlan){
 const discount=plan==='investor'?25:plan==='cash'?40:0;
 const total=cents(price*(1-discount/100));
 const downPercent=plan==='direct'?10:plan==='investor'?20:100;
 const down=cents(total*downPercent/100),balance=cents(total-down);
 const downMonths=plan==='direct'?6:1,months=plan==='direct'?140:plan==='investor'?24:0;
 const installment=months?cents(balance/months):0;
 return {discount,total,downPercent,down,downMonths,downInstallment:cents(down/downMonths),months,installment,last:months?cents(balance-installment*(months-1)):0};
}
