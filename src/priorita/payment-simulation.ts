export type PaymentInputs={downPercent:number;months:number;interest:number;correction:number;index:'none'|'cub'|'custom';balloon:number;frequency:number};
export const defaultPayment:PaymentInputs={downPercent:20,months:60,interest:0,correction:0,index:'none',balloon:0,frequency:12};
export type PaymentRow={month:number;installment:number;balloon:number;total:number;balance:number};
const cents=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
/** Price in base-date currency, less the present value of scheduled balloons.
 * A hypothetical constant index adjusts all future flows from month one.
 * No real CUB series, fees, taxes, insurance or contractual rules are assumed. */
export function simulatePayment(price:number,input:PaymentInputs){
 const {downPercent,months,interest,balloon,frequency}=input;
 const correction=input.index==='none'?0:input.correction;
 if(![price,downPercent,months,interest,correction,balloon,frequency].every(Number.isFinite)||price<=0||downPercent<0||downPercent>100||!Number.isInteger(months)||months<1||months>240||interest<0||interest>5||correction<0||correction>3||balloon<0||!Number.isInteger(frequency)||frequency<1)return {error:'Revise os campos. Use entrada de 0 a 100%, prazo de 1 a 240 meses e taxas dentro dos limites indicados.'};
 const down=cents(price*downPercent/100),principal=cents(price-down),j=interest/100,c=correction/100;
 if(principal===0&&balloon>0)return {error:'Para pagamento à vista, remova os reforços.'};
 const count=Math.floor(months/frequency);
 let presentBalloons=0;
 for(let k=frequency;k<=months;k+=frequency)presentBalloons+=balloon/Math.pow(1+j,k);
 if(presentBalloons>principal+.001)return {error:'Os reforços ultrapassam o saldo financiado. Reduza o valor dos reforços ou a entrada.'};
 const annuity=j===0?months:-Math.expm1(-months*Math.log1p(j))/j;
 const regular=cents(Math.max(0,principal-presentBalloons)/annuity);
 let balance=principal;
 const rows:PaymentRow[]=[];
 for(let month=1;month<=months;month++){
  const extra=month%frequency===0?balloon:0;
  const due=cents(balance*(1+j));
  const installment=month===months?cents(Math.max(0,due-extra)):regular;
  balance=cents(due-installment-extra);
  if(balance<-.05)return {error:'Essa combinação antecipa a quitação antes do último reforço. Reduza os reforços.'};
  const factor=Math.pow(1+c,month),monthly=cents(installment*factor),additional=cents(extra*factor);
  rows.push({month,installment:monthly,balloon:additional,total:cents(monthly+additional),balance:cents(Math.max(0,balance)*factor)});
 }
 const total=cents(down+rows.reduce((sum,r)=>sum+r.total,0));
 return {down,principal,regular,rows,total,first:rows[0].installment,last:rows[rows.length-1].installment,balloonCount:count,balloonTotal:cents(rows.reduce((sum,r)=>sum+r.balloon,0)),cost:cents(total-price)};
}
