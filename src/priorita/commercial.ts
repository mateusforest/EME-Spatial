import data from './commercial-data.json';

export type CommercialTerms={price:number|null;paymentConditions:string;illustrative?:boolean;pricePerSquareMeter?:number;downPaymentPercent?:number;installments?:number};
const overrides=data.lots as Record<string,Partial<CommercialTerms>>;
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
export const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export function commercialTerms(id:string,area:number):CommercialTerms{
  const terms:CommercialTerms={...data.defaults,...overrides[id]};
  if(terms.price===null&&terms.illustrative&&terms.pricePerSquareMeter)terms.price=Math.round(area*terms.pricePerSquareMeter/1000)*1000;
  return terms;
}
export function paymentExample(terms:CommercialTerms){
  if(terms.price===null||!terms.downPaymentPercent||!terms.installments)return null;
  const downPayment=terms.price*terms.downPaymentPercent/100;
  return {downPayment,installments:terms.installments,installment:(terms.price-downPayment)/terms.installments};
}
export function priceLabel(terms:CommercialTerms){
  return terms.price===null?'Sob consulta':currency.format(terms.price);
}
