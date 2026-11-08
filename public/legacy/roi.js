const roiBlocks=[
  ['preCash','Pré-projeto','Recursos de infra / Licenciamento / perdas / custos','cash'],
  ['preLabor','Pré-projeto','Custo operacional mensal','labor'],
  ['postCash','Pós-projeto','Recursos de infra / Licenciamento / perdas / custos','cash'],
  ['postLabor','Pós-projeto','Custo operacional mensal','labor'],
  ['investmentCash','Investimento','Implementação / Compra de equipamento / Terceirização','cash'],
  ['investmentLabor','Investimento','Custo de implementação interna','investmentLabor']
];

function blankROI(){return {monthlyHours:220,targetYears:1,preCash:[],preLabor:[],postCash:[],postLabor:[],investmentCash:[],investmentLabor:[]};}

function calcROI(r){
  const total=(key,fn)=>r[key].reduce((sum,item)=>sum+fn(item),0);
  const cash=key=>total(key,item=>item.value);
  const labor=key=>total(key,item=>item.salary*item.hours/item.basis);
  const pre=cash('preCash')+labor('preLabor');
  const post=cash('postCash')+labor('postLabor');
  const investment=cash('investmentCash')+total('investmentLabor',item=>item.salary/r.monthlyHours*item.hours*item.months);
  const saving=pre-post;
  const roundedMonths=saving>0?Math.round(investment/saving):null;
  return {pre,preAnnual:pre*12,investment,post,postAnnual:post*12,saving,annual:saving*12,economyPercent:pre+post!==0?saving/(pre+post):null,paymentTime:roundedMonths===null?null:roundedMonths>=12?roundedMonths/12:roundedMonths,paymentUnit:roundedMonths!==null&&roundedMonths>=12?'anos':'meses',hours:total('investmentLabor',item=>item.hours*item.months)};
}

const roiMoney=value=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const roiNumber=value=>value===null?'Não calculável':value.toLocaleString('pt-BR',{maximumFractionDigits:2});
const roiPercent=value=>value===null?'Não calculável':(value*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';

function roiSummary(r){const x=calcROI(r);return `<div class="tablewrap"><table class="roi-summary"><thead><tr><th>Estudo final</th><th>Valor</th></tr></thead><tbody>
  <tr><td>Custo operacional pré-projeto/mês</td><td>${roiMoney(x.pre)}</td></tr><tr><td>Custo operacional pré-projeto/ano</td><td>${roiMoney(x.preAnnual)}</td></tr><tr><td>Investimento</td><td>${roiMoney(x.investment)}</td></tr><tr><td>Custo operacional pós-projeto/mês</td><td>${roiMoney(x.post)}</td></tr><tr><td>Custo operacional pós-projeto/ano</td><td>${roiMoney(x.postAnnual)}</td></tr><tr><td>Economia operacional/mensal</td><td>${roiMoney(x.saving)}</td></tr><tr><td>Economia operacional/ano</td><td>${roiMoney(x.annual)}</td></tr><tr><td>Economia% operacional</td><td>${roiPercent(x.economyPercent)}</td></tr><tr><td>Tempo de pagamento do projeto (${x.paymentUnit})</td><td>${roiNumber(x.paymentTime)}</td></tr>
  </tbody></table></div>`;}

function roiSection(d){const locked=['Aprovações','Aprovada','Convertida','Rejeitada'].includes(d.stage);return `<section class="panel pad"><div class="heading"><div><div class="eyebrow">ESTUDO DE VIABILIDADE</div><h2>Cálculo de ROI</h2><p class="muted">Estrutura da aba “Template ROI” da planilha 35031 - Cálculo de ROI - Posto.xlsx</p></div></div>${d.roi?roiSummary(d.roi):'<p class="muted">O cálculo ainda não foi preenchido para esta demanda.</p>'}<div class="toolbar"><button class="primary" onclick="editROI(${d.id})" ${locked?'disabled':''}>${d.roi?'Editar cálculo de ROI':'Preencher cálculo de ROI'}</button></div>${locked?'<p class="muted">Os dados enviados para aprovação ficam bloqueados.</p>':''}<details style="margin-top:20px"><summary>Fórmulas utilizadas</summary><p class="mini">Custo de recurso humano/mês = salário médio mensal × horas/mês ÷ horas trabalhadas/mês.<br>Custo de mão de obra no projeto = salário médio mensal ÷ horas trabalhadas/mês × horas/mês × meses de projeto.<br>Economia operacional/mensal = custo pré-projeto/mês − custo pós-projeto/mês.<br>Economia% operacional = economia mensal ÷ (custo pré-projeto/mês + custo pós-projeto/mês).<br>Tempo de pagamento = investimento ÷ economia mensal, arredondado conforme a planilha.</p></details></section>`;}

let roiDraft=null;
function editROI(id){const d=demands.find(item=>item.id===id);if(['Aprovações','Aprovada','Convertida','Rejeitada'].includes(d.stage))return;roiDraft=structuredClone(d.roi||blankROI());drawROI(id);}
function cashRow(key,row,index,id){return `<div class="roi-item roi-cash-row"><label>Itens<input name="${key}.${index}.name" required value="${esc(row.name)}"></label><label>Valor<input type="number" min="0" step="any" name="${key}.${index}.value" required value="${row.value}"></label><label>Descrição<input name="${key}.${index}.description" value="${esc(row.description||'')}"></label><label>Observação<input name="${key}.${index}.note" value="${esc(row.note||'')}"></label><button type="button" onclick="changeROIRow('${key}',${index},${id})">Remover</button></div>`;}
function laborRow(key,row,index,id,type){const implementation=type==='investmentLabor';return `<div class="roi-item roi-labor-row"><label>Itens<input name="${key}.${index}.name" required value="${esc(row.name)}"></label><label>Horas/mês<input type="number" min="0" step="any" name="${key}.${index}.hours" required value="${row.hours}"></label><label>Salário médio mensal<input type="number" min="0" step="any" name="${key}.${index}.salary" required value="${row.salary}"></label>${implementation?`<label>Meses de projeto<input type="number" min="0" step="any" name="${key}.${index}.months" required value="${row.months}"></label><label>Custo de mão de obra no projeto<input readonly value="${roiMoney(row.salary/roiDraft.monthlyHours*row.hours*row.months)}"></label>`:`<label>Horas trabalhadas/mês<input type="number" min="0.01" step="any" name="${key}.${index}.basis" required value="${row.basis}"></label><label>Custo hora/mês<input readonly value="${roiMoney(row.salary*row.hours/row.basis)}"></label>`}<label>Observação<input name="${key}.${index}.note" value="${esc(row.note||'')}"></label><button type="button" onclick="changeROIRow('${key}',${index},${id})">Remover</button></div>`;}

function drawROI(id){modal('Cálculo de ROI',`<form id="roi-form" onsubmit="saveROI(event,${id})"><div class="formgrid roi-assumptions"><label>Horas trabalhadas/mês<input type="number" name="monthlyHours" min="0.01" step="any" required value="${roiDraft.monthlyHours}"></label><label>Payback aceitável (anos)<input type="number" name="targetYears" min="0.01" step="any" required value="${roiDraft.targetYears}"></label></div>${roiBlocks.map(([key,phase,title,type])=>`<section class="roi-block"><div class="roi-block-head"><div><span class="eyebrow">${phase}</span><h3>${title}</h3></div><button type="button" onclick="changeROIRow('${key}',-1,${id})">+ Adicionar item</button></div><div class="roi-inputs">${roiDraft[key].map((row,index)=>type==='cash'?cashRow(key,row,index,id):laborRow(key,row,index,id,type)).join('')||'<p class="muted">Nenhum item informado.</p>'}</div></section>`).join('')}<div class="toolbar roi-actions"><button class="primary" type="submit">Salvar e calcular</button></div></form>`);$('dialog').style.width='min(1280px,97vw)';}

function readROIDraft(){const form=new FormData($('#roi-form'));roiDraft.monthlyHours=Number(form.get('monthlyHours'));roiDraft.targetYears=Number(form.get('targetYears'));for(const [key,,,type] of roiBlocks){roiDraft[key].forEach((row,index)=>{const fields=type==='cash'?['name','value','description','note']:type==='investmentLabor'?['name','hours','salary','months','note']:['name','hours','salary','basis','note'];for(const field of fields){const value=form.get(`${key}.${index}.${field}`);row[field]=['name','description','note'].includes(field)?value:Number(value);}});}}
function changeROIRow(key,index,id){readROIDraft();if(index>=0)roiDraft[key].splice(index,1);else if(key.endsWith('Cash'))roiDraft[key].push({name:'',value:0,description:'',note:''});else if(key==='investmentLabor')roiDraft[key].push({name:'',hours:0,salary:0,months:1,note:''});else roiDraft[key].push({name:'',hours:0,salary:0,basis:roiDraft.monthlyHours,note:''});drawROI(id);}
function saveROI(event,id){event.preventDefault();readROIDraft();const invalid=!(roiDraft.monthlyHours>0&&roiDraft.targetYears>0)||roiBlocks.some(([key,,,type])=>roiDraft[key].some(row=>!row.name.trim()||(type==='cash'?row.value<0:type==='investmentLabor'?row.hours<0||row.salary<0||row.months<0:row.hours<0||row.salary<0||!(row.basis>0))));if(invalid){toast('Revise os campos do cálculo antes de salvar.');return;}const d=demands.find(item=>item.id===id);d.roi=structuredClone(roiDraft);const result=calcROI(d.roi);d.cost=result.investment;d.hours=result.hours;$('dialog').close();render();toast('Cálculo de ROI salvo no estudo de viabilidade.');}

const baseDemandas=demandas;
demandas=function(){const d=demands.find(item=>item.id===activeDemand);const form=d.roi?baseDemandas().replace('name="cost"','name="cost" readonly title="Calculado pelo ROI"').replace('name="hours"','name="hours" readonly title="Calculado pelo ROI"'):baseDemandas();return form+roiSection(d);};
const baseApproval=aprovacoes;
aprovacoes=function(){return baseApproval()+demands.filter(d=>d.roi).map(d=>`<section class="panel pad"><h2>Cálculo de ROI · ${typeof demandReference==='function'?demandReference(d):'#'+d.id}</h2>${roiSummary((d.stage==='Aprovações'||d.stage==='Aprovada'||d.stage==='Convertida')?(d.roiSnapshot||d.roi):d.roi)}</section>`).join('');};
const baseSendApproval=sendApproval;
sendApproval=function(id){const d=demands.find(item=>item.id===id);if(d.roi)d.roiSnapshot=structuredClone(d.roi);baseSendApproval(id);};
render();
