function multiChoice(id,label,options,selected,applyFn,allLabel='Todos'){
  const values=(selected||[]).map(String),chosen=new Set(values),summary=!values.length?allLabel:values.length===1?(options.find(option=>String(option.value)===values[0])?.label||'1 selecionado'):`${values.length} selecionados`;
  return `<details class="multi-choice" id="${esc(id)}"><summary aria-label="${esc(label)}: ${esc(summary)}"><span class="multi-choice-label">${esc(label)}</span><b>${esc(summary)}</b></summary><div class="multi-choice-menu" role="group" aria-label="${esc(label)}"><label class="multi-choice-option all"><input type="checkbox" value="" aria-label="${esc(allLabel)}" ${values.length?'':'checked'} onchange="updateMultiChoice(event,this,'${esc(id)}','${esc(applyFn)}')"><span>${esc(allLabel)}</span></label>${options.map(option=>`<label class="multi-choice-option"><input type="checkbox" value="${esc(String(option.value))}" aria-label="${esc(option.label)}" ${chosen.has(String(option.value))?'checked':''} onchange="updateMultiChoice(event,this,'${esc(id)}','${esc(applyFn)}')"><span>${esc(option.label)}</span></label>`).join('')}</div></details>`;
}

function updateMultiChoice(event,input,id,applyFn){
  event.stopPropagation();
  const root=document.getElementById(id);if(!root)return;
  const boxes=[...root.querySelectorAll('input[type="checkbox"]')],all=boxes.find(box=>box.value===''),choices=boxes.filter(box=>box.value!=='');
  if(input.value===''&&input.checked)choices.forEach(box=>box.checked=false);
  if(input.value!==''&&input.checked)all.checked=false;
  if(!choices.some(box=>box.checked))all.checked=true;
  const values=choices.filter(box=>box.checked).map(box=>box.value);
  const handler=globalThis[applyFn];if(typeof handler==='function')handler(values);
  setTimeout(()=>document.getElementById(id)?.setAttribute('open',''),0);
}

document.addEventListener('click',event=>{
  document.querySelectorAll('details.multi-choice[open]').forEach(item=>{if(!item.contains(event.target))item.removeAttribute('open')});
});
