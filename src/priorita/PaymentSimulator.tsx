import {Download,RotateCcw} from 'lucide-react';
import {commercialTerms,money} from './commercial';
import {lotById,lots,number,statusInfo} from './model';
import type {LotStatus} from './model';
import {defaultPayment,simulatePayment} from './payment-simulation';
import type {PaymentInputs} from './payment-simulation';
import LotMiniPlan from './LotMiniPlan';
import ReferenceFinance from './ReferenceFinance';

export default function PaymentSimulator({selected,stock,onSelect,saved,onSave}:{selected:string;stock:Record<string,LotStatus>;onSelect:(id:string)=>void;saved:Record<string,PaymentInputs>;onSave:(id:string,input:PaymentInputs)=>void}){
 const lot=lotById.get(selected)!,offer=commercialTerms(lot.id,lot.area),price=offer.price||0;
 const defaults={...defaultPayment,downPercent:offer.downPaymentPercent??20,months:offer.installments??60};
 const input=saved[selected]||defaults,result=simulatePayment(price,input);
 const update=(patch:Partial<PaymentInputs>)=>onSave(selected,{...input,...patch});
 function download(){
  if('error'in result)return;
  const f=(v:number)=>v.toFixed(2).replace('.',',');
  const csv=['SIMULAÇÃO ILUSTRATIVA - SEM VALIDADE DE OFERTA',`Lote;${selected}`,`Valor;${f(price)}`,`Entrada;${f(result.down)}`,`Juros ao mês (%);${f(input.interest)}`,`Correção ${input.index==='none'?'Sem correção':input.index==='cub'?'CUB hipotético':'Índice personalizado'} ao mês (%);${f(input.index==='none'?0:input.correction)}`,`Reforço base;${f(input.balloon)}`,`Intervalo dos reforços (meses);${input.frequency}`,'Mês;Parcela;Reforço;Pagamento total;Saldo projetado',...result.rows.map(r=>[r.month,f(r.installment),f(r.balloon),f(r.total),f(r.balance)].join(';')),`Total com entrada;${f(result.total)}`].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`priorita-${selected}-simulacao.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <>
  <div className="pr-section-intro"><div><span className="pr-eyebrow">PLANEJE SUA POSSIBILIDADE · SIMULAÇÃO</span><h3>Seu lote. Suas condições.</h3></div><label className="pr-material-lot">Lote<select aria-label="Lote da simulação" value={selected} onChange={e=>onSelect(e.target.value)}>{lots.map(l=><option key={l.id} value={l.id}>{l.id} · {statusInfo[stock[l.id]].label}</option>)}</select></label></div>
  <div className="pr-simulator-layout"><div className="pr-simulator-main">
   <section className="pr-sim-price"><div><span className="pr-eyebrow">VALOR ILUSTRATIVO DO LOTE {selected}</span><strong>{money(price)}</strong><span>{number(lot.area)} m² · Quadra {lot.block} · {lot.street}</span></div><span className="pr-sim-status" style={{color:statusInfo[stock[selected]].color}}><i/>{statusInfo[stock[selected]].label}</span></section>
   <ReferenceFinance price={price} lotId={selected}/>
   <section className="pr-sim-controls" aria-label="Ajustar condições de pagamento"><header><h4>Simulação personalizada</h4><button onClick={()=>onSave(selected,defaults)}><RotateCcw size={13}/>Restaurar</button></header>
    <div className="pr-sim-fields">
     <label>Entrada (%)<input type="number" min="0" max="100" step="1" value={Number.isFinite(input.downPercent)?input.downPercent:''} onChange={e=>update({downPercent:e.target.valueAsNumber})}/></label>
     <label>Parcelas mensais<input type="number" min="1" max="240" step="1" value={Number.isFinite(input.months)?input.months:''} onChange={e=>update({months:e.target.valueAsNumber})}/></label>
     <label>Juros (% ao mês)<input type="number" min="0" max="5" step=".05" value={Number.isFinite(input.interest)?input.interest:''} onChange={e=>update({interest:e.target.valueAsNumber})}/></label>
     <label>Correção monetária<select aria-label="Correção monetária" value={input.index} onChange={e=>update({index:e.target.value as PaymentInputs['index']})}><option value="none">Sem correção</option><option value="cub">CUB · hipótese</option><option value="custom">Índice personalizado</option></select></label>
     {input.index!=='none'&&<label className="pr-index-input">{input.index==='cub'?'Variação hipotética do CUB':'Correção hipotética'} (% ao mês)<input type="number" min="0" max="3" step=".05" aria-label="Correção hipotética mensal (%)" value={Number.isFinite(input.correction)?input.correction:''} onChange={e=>update({correction:e.target.valueAsNumber})}/><small>Taxa definida por você. Não consultamos o índice oficial.</small></label>}
     <label>Valor de cada reforço (R$)<input type="number" min="0" step="500" value={Number.isFinite(input.balloon)?input.balloon:''} onChange={e=>update({balloon:e.target.valueAsNumber})}/></label>
     <label>Reforços a cada<select aria-label="Intervalo dos reforços" value={input.frequency} onChange={e=>update({frequency:+e.target.value})}><option value="6">6 meses</option><option value="12">12 meses</option><option value="24">24 meses</option></select></label>
    </div>
   </section>
   {'error'in result?<p className="pr-sim-error" role="alert">{result.error}</p>:<>
    <section className="pr-sim-results" aria-label="Resultado da simulação" aria-live="polite"><div><span>Entrada · {input.downPercent}%</span><strong>{money(result.down)}</strong><small>No início</small></div><div className="pr-sim-monthly"><span>{input.months} parcelas · primeira</span><strong>{money(result.first)}</strong><small>{input.index!=='none'&&input.correction>0?`Última: ${money(result.last)}`:'Mensais, com ajuste de centavos na última'}</small></div><div><span>Reforços {input.balloon>0?`· ${result.balloonCount}`:''}</span><strong>{input.balloon>0?money(input.balloon):'Sem reforços'}</strong><small>{input.balloon>0?`Valor base a cada ${input.frequency} meses`:'Você pode incluir acima'}</small></div></section>
    <div className="pr-sim-total"><span>Total projetado, incluindo entrada<small>Parcelas + reforços + juros e correção simulados</small></span><strong>{money(result.total)}</strong></div>
    <details className="pr-sim-schedule"><summary>Ver cronograma de pagamentos <span>{input.months} meses</span></summary><div className="pr-schedule-scroll"><table><caption>Valores projetados · lote {selected}</caption><thead><tr><th>Mês</th><th>Parcela</th><th>Reforço</th><th>Total</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.month}><td>{r.month}</td><td>{money(r.installment)}</td><td>{r.balloon?money(r.balloon):'—'}</td><td>{money(r.total)}</td></tr>)}</tbody></table></div><button className="pr-add-material" onClick={download}><Download size={14}/>Baixar simulação</button></details>
   </>}
   <p className="pr-material-note">Simulação sem validade de oferta, inclusive para lotes reservados ou indisponíveis. Não altera reservas. Entrada no início; parcelas a partir do mês 1; reforços nos meses múltiplos do intervalo escolhido. As condições ficam guardadas por lote enquanto esta apresentação estiver aberta.</p>
   <details className="pr-sim-method"><summary>Como calculamos</summary><p>Parcelas pelo sistema Price, descontando do saldo o valor presente dos reforços. A correção hipotética, quando escolhida, incide mensalmente sobre os pagamentos futuros e o saldo, desde o primeiro mês. Não inclui taxas, seguros, tributos ou regras de contrato. A hipótese de CUB não é uma previsão nem um índice oficial.</p><a href="https://www3.bcb.gov.br/CALCIDADAO/publico/exibirMetodologiaFinanciamentoPrestacoesFixas.do?method=exibirMetodologiaFinanciamentoPrestacoesFixas" target="_blank" rel="noreferrer">Referência da fórmula de prestações · Banco Central</a></details>
  </div><LotMiniPlan selected={selected} stock={stock} onSelect={onSelect}/></div>
 </>;
}
