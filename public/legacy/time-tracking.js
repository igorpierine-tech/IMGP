let timeFilterPeople=[],timeFilterProjects=[];
function setTimeFilterPeople(values){timeFilterPeople=values;render()}
function setTimeFilterProjects(values){timeFilterProjects=values;render()}
const timeStorageKey='rr-project-time-entries-v1';
const timerStorageKey='rr-project-task-timers-v2';
const timeBaseActuals=new Map(tasks.map(t=>[t.id,Number(t.actual)||0]));
let timeEntries=loadTimeEntries();
let taskTimers=loadTaskTimers();

function loadTimeEntries(){
  try{const saved=JSON.parse(localStorage.getItem(timeStorageKey)||'[]');return Array.isArray(saved)?saved:[]}
  catch{return []}
}
function persistTimeEntries(){try{localStorage.setItem(timeStorageKey,JSON.stringify(timeEntries))}catch{}}
function loadTaskTimers(){
  try{const saved=JSON.parse(localStorage.getItem(timerStorageKey)||'{}');return saved&&typeof saved==='object'?saved:{}}
  catch{return {}}
}
function persistTaskTimers(){try{localStorage.setItem(timerStorageKey,JSON.stringify(taskTimers))}catch{}}
function timerElapsed(timer,now=Date.now()){return Math.max(0,(timer?.accumulatedMs||0)+(timer?.status==='running'?now-timer.lastStartedAt:0))}
function timerDurationLabel(ms){
  const totalSeconds=Math.floor(Math.max(0,ms)/1000),hours=Math.floor(totalSeconds/3600),minutes=Math.floor(totalSeconds%3600/60),seconds=totalSeconds%60;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function workedTimeLabel(hours){return timerDurationLabel(Math.round((Number(hours)||0)*3600000))}
function entriesDurationMs(entries){return entries.reduce((sum,e)=>sum+(Number.isFinite(+e.durationMs)?+e.durationMs:(Number(e.hours)||0)*3600000),0)}
function projectTrackedTimeLabel(projectId){return timerDurationLabel(entriesDurationMs(timeEntries.filter(e=>e.projectId===projectId)))}
function timerDateTime(value){return value?new Date(value).toLocaleString('pt-BR'):'—'}
function timerStatusLabel(timer){return !timer?'Não iniciado':timer.status==='running'?'Em andamento':timer.status==='paused'?'Pausado':'Encerrado'}
function taskTimerControls(task){
  if(task.type==='milestone')return '<span class="muted">Não se aplica</span>';
  const timer=taskTimers[task.id],status=timer?.status||'idle',elapsed=timerElapsed(timer);
  return `<div class="timer-box"><div class="timer-readout"><b data-timer-id="${task.id}">${timerDurationLabel(elapsed)}</b><span class="timer-state ${status}">${timerStatusLabel(timer)}</span></div><div class="timer-actions"><button class="timer-start" onclick="taskTimerAction(${task.id},'start')" ${status==='running'?'disabled':''}>▶ Iniciar</button><button class="timer-pause" onclick="taskTimerAction(${task.id},'pause')" ${status!=='running'?'disabled':''}>Ⅱ Pausar</button><button class="timer-end" onclick="taskTimerAction(${task.id},'end')" ${!['running','paused'].includes(status)?'disabled':''}>■ Encerrar</button></div>${timer?`<span class="timer-meta">Início: ${timerDateTime(timer.startedAt)}${timer.pausedAt?` · Pausa: ${timerDateTime(timer.pausedAt)}`:''}${timer.endedAt?` · Fim: ${timerDateTime(timer.endedAt)}`:''}</span>`:''}</div>`;
}
function taskTimerAction(taskId,action,nowOverride){
  const task=tasks.find(t=>t.id===taskId);if(!task||task.type==='milestone')return;
  const now=nowOverride??Date.now();let timer=taskTimers[taskId];
  if(action==='start'){
    if(!timer||timer.status==='ended')timer={status:'running',startedAt:now,lastStartedAt:now,accumulatedMs:0,pausedAt:null,endedAt:null};
    else if(timer.status==='paused'){timer.status='running';timer.lastStartedAt=now;timer.pausedAt=null}
    else return;
    taskTimers[taskId]=timer;if(task.state===0)task.state=1;persistTaskTimers();render();toast('Cronômetro iniciado para a tarefa.');return;
  }
  if(!timer)return;
  if(action==='pause'&&timer.status==='running'){
    timer.accumulatedMs=timerElapsed(timer,now);timer.status='paused';timer.pausedAt=now;persistTaskTimers();render();toast('Cronômetro pausado. O período de pausa não será contabilizado.');return;
  }
  if(action==='end'&&['running','paused'].includes(timer.status)){
    timer.accumulatedMs=timerElapsed(timer,now);timer.status='ended';timer.endedAt=now;timer.pausedAt=null;persistTaskTimers();
    const person=Number.isInteger(task.person)&&task.person>=0&&task.person<timeTeam().length?task.person:0;
    timeEntries.unshift({id:now,projectId:task.p,taskId:task.id,person,date:new Date(timer.startedAt).toISOString().slice(0,10),hours:timer.accumulatedMs/3600000,kind:'Cronômetro',description:'Tempo capturado automaticamente ao encerrar a tarefa.',startAt:timer.startedAt,endAt:timer.endedAt,durationMs:timer.accumulatedMs});
    task.state=3;persistTimeEntries();syncTrackedHours();render();toast('Tarefa encerrada. O tempo trabalhado foi apontado automaticamente.');
  }
}
function projectTrackedHours(projectId){return timeEntries.filter(e=>e.projectId===projectId).reduce((sum,e)=>sum+e.hours,0)}
function syncTrackedHours(){
  tasks.forEach(t=>{t.actual=(timeBaseActuals.get(t.id)||0)+timeEntries.filter(e=>e.taskId===t.id).reduce((sum,e)=>sum+e.hours,0)});
}
function timeDate(value){if(!value)return '—';return new Date(value+'T12:00:00').toLocaleDateString('pt-BR')}
function timeNumber(value){return Number(value).toLocaleString('pt-BR',{minimumFractionDigits:Number(value)%1?1:0,maximumFractionDigits:2})}
function timeTeam(){return people.slice(0,8)}
function timeTaskOptions(projectId,selectedTask){
  return tasks.filter(t=>t.p===+projectId&&t.type!=='milestone').map(t=>`<option value="${t.id}" ${t.id===+selectedTask?'selected':''}>${esc(t.name)}</option>`).join('');
}
function refreshTimeTaskOptions(projectId){
  const select=document.querySelector('#time-entry-task');if(!select)return;
  select.innerHTML=timeTaskOptions(projectId);select.disabled=!select.options.length;
}
function openTimeEntry(projectId=selected,taskId=0){
  const validProject=projects.some(p=>p.id===+projectId)?+projectId:(projects.find(p=>tasks.some(t=>t.p===p.id))?.id||projects[0].id);
  const taskOptions=timeTaskOptions(validProject,taskId);
  modal('Novo apontamento de atividade',`<form onsubmit="saveTimeEntry(event)"><div class="formgrid"><label>Técnico / responsável<select name="person" required>${timeTeam().map((name,i)=>`<option value="${i}">${esc(name)}</option>`).join('')}</select></label><label>Data<input name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><label class="wide">Projeto<select name="projectId" required onchange="refreshTimeTaskOptions(this.value)">${projects.map(p=>`<option value="${p.id}" ${p.id===validProject?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="wide">Tarefa / atividade<select id="time-entry-task" name="taskId" required ${taskOptions?'':'disabled'}>${taskOptions}</select></label><label>Horas realizadas<input name="hours" type="number" min="0.25" max="24" step="0.25" required placeholder="Ex.: 2,5"></label><label>Tipo<select name="kind"><option>Execução</option><option>Reunião</option><option>Análise</option><option>Teste</option><option>Documentação</option><option>Implantação</option></select></label><label class="wide">Atividade realizada<textarea name="description" required maxlength="500" placeholder="Descreva objetivamente o que foi realizado e o resultado obtido."></textarea></label></div><div class="notice mini">Este apontamento pertence ao projeto. Horas de chamados de sustentação são registradas na origem externa.</div><div class="toolbar"><button type="button" onclick="this.closest('dialog').close()">Cancelar</button><button class="primary" type="submit" ${taskOptions?'':'disabled'}>Salvar apontamento</button></div></form>`);
}
function saveTimeEntry(event){
  event.preventDefault();const f=Object.fromEntries(new FormData(event.target));
  const projectId=+f.projectId,taskId=+f.taskId,person=+f.person,hoursValue=Number(String(f.hours).replace(',','.'));
  const task=tasks.find(t=>t.id===taskId&&t.p===projectId);
  if(!task||!Number.isFinite(hoursValue)||hoursValue<=0||hoursValue>24)return toast('Revise a tarefa e a quantidade de horas.');
  timeEntries.unshift({id:Date.now(),projectId,taskId,person,date:f.date,hours:hoursValue,kind:f.kind,description:String(f.description||'').trim()});
  persistTimeEntries();syncTrackedHours();document.querySelector('dialog')?.close();view='recursos';render();toast('Apontamento salvo e refletido no projeto e nos indicadores.');
}
function removeTimeEntry(id){
  timeEntries=timeEntries.filter(e=>e.id!==id);persistTimeEntries();syncTrackedHours();render();toast('Apontamento removido.');
}
function filteredTimeEntries(){return timeEntries.filter(e=>(!timeFilterPeople.length||timeFilterPeople.includes(String(e.person)))&&(!timeFilterProjects.length||timeFilterProjects.includes(String(e.projectId))))}
function timeEntryRows(){
  const rows=filteredTimeEntries();
  if(!rows.length)return '<tr><td colspan="8" class="empty">Nenhum apontamento registrado para os filtros selecionados.</td></tr>';
  return rows.map(e=>{const project=projects.find(p=>p.id===e.projectId),task=tasks.find(t=>t.id===e.taskId),period=e.startAt?`${timerDateTime(e.startAt)}<span class="sub">até ${timerDateTime(e.endAt)}</span>`:'Apontamento manual';return `<tr><td>${timeDate(e.date)}</td><td><b>${esc(timeTeam()[e.person]||'Não informado')}</b></td><td><button class="projecttitle" onclick="openProject(${e.projectId})">${esc(project?.name||'Projeto')}</button></td><td>${esc(task?.name||'Atividade')}</td><td>${esc(e.kind)}</td><td>${period}</td><td><b>${e.durationMs?timerDurationLabel(e.durationMs):timeNumber(e.hours)+'h'}</b><span class="sub">${esc(e.description)}</span></td><td><button aria-label="Excluir apontamento" onclick="removeTimeEntry(${e.id})">Excluir</button></td></tr>`}).join('');
}
function recursos(){
  const total=timeEntries.reduce((sum,e)=>sum+e.hours,0),activePeople=new Set(timeEntries.map(e=>e.person)).size,activeTasks=new Set(timeEntries.map(e=>e.taskId)).size,all=allocations.reduce((sum,r)=>sum+r.project+r.support,0);
  return heading('Tempo e recursos','Apontamento das atividades de projeto e acompanhamento da capacidade da equipe.',`<button class="primary" onclick="openTimeEntry()">+ Novo apontamento</button>`)+`<div class="notice"><b>Onde o técnico aponta:</b> em cada tarefa, pelos botões <b>Iniciar</b>, <b>Pausar</b> e <b>Encerrar</b>. Ao encerrar, a plataforma cria o apontamento automaticamente. O botão <b>Novo apontamento</b> continua disponível para ajustes manuais. Chamados de sustentação permanecem na origem externa.</div><div class="stats">${stat('Horas apontadas',timerDurationLabel(entriesDurationMs(timeEntries)),'Registros de projeto nesta sessão · hh:mm:ss')}${stat('Profissionais ativos',activePeople,'Com ao menos um apontamento')}${stat('Atividades trabalhadas',activeTasks,'Tarefas com horas registradas')}${stat('Capacidade semanal','320h','1 coordenador · 2 analistas · 5 keyusers')}</div><section class="panel"><div class="panelhead"><div><h2>Apontamentos de atividades</h2><span class="sub">As horas salvas atualizam a tarefa, o projeto e Planejado × Realizado.</span></div><div class="toolbar">${multiChoice('time-person-filter','Técnico',timeTeam().map((name,i)=>({value:i,label:name})),timeFilterPeople,'setTimeFilterPeople','Todos os técnicos')}${multiChoice('time-project-filter','Projeto',projects.map(p=>({value:p.id,label:p.name})),timeFilterProjects,'setTimeFilterProjects','Todos os projetos')}</div></div><div class="tablewrap"><table class="time-table"><thead><tr><th>Data</th><th>Técnico</th><th>Projeto</th><th>Tarefa</th><th>Tipo</th><th>Início / fim</th><th>Tempo / atividade realizada</th><th></th></tr></thead><tbody>${timeEntryRows()}</tbody></table></div></section><section class="panel"><div class="panelhead"><div><h2>Distribuição planejada da capacidade</h2><span class="sub">Projetos e reserva para sustentação na mesma visão.</span></div><span class="badge">Premissa semanal</span></div><div class="tablewrap"><table class="responsive-table"><thead><tr><th>Profissional</th><th>Distribuição prevista</th><th>Projetos</th><th>Reserva sustentação</th><th>Apontado em projetos</th><th>Saldo semanal</th></tr></thead><tbody>${timeTeam().map((name,i)=>{const a=allocations[i],sum=a.project+a.support,trackedEntries=timeEntries.filter(e=>e.person===i);return `<tr><td><b>${esc(name)}</b><span class="sub">Capacidade: 40h / semana</span></td><td style="min-width:180px"><div class="capacity"><i style="width:${a.project/Math.max(40,sum)*100}%"></i><b style="width:${a.support/Math.max(40,sum)*100}%"></b></div></td><td>${a.project}h</td><td>${a.support}h</td><td>${timerDurationLabel(entriesDurationMs(trackedEntries))}</td><td>${sum>40?'<span class="badge red">Sobrecarga: '+(sum-40)+'h</span>':(40-sum)+'h disponíveis'}</td></tr>`}).join('')}</tbody></table></div><div class="pad"><div class="legend"><span>Projetos</span><span>Sustentação</span><span>Disponível</span></div><p class="muted">A reserva de sustentação apoia o planejamento. O realizado dos chamados será recebido da origem externa, evitando lançamento duplicado.</p></div></section>`;
}

function kanban(){
  const ts=tasks.filter(t=>t.type!=='milestone'&&(kanbanProject==='0'||t.p===+kanbanProject));
  return heading('Kanban de execução','Atividades compartilhadas com o Gantt, os apontamentos e os indicadores.',`<button class="primary" onclick="editTask()">+ Nova atividade</button>`)+`<div class="toolbar" style="margin-bottom:22px">${projectSelect(kanbanProject,'kanbanProject=this.value;render()',true)}<span class="muted">${ts.length} atividades · use o cronômetro em cada cartão</span></div><div class="kanban">${states.map((state,i)=>`<section class="column"><h3>${state}<span class="muted">${ts.filter(t=>t.state===i).length}</span></h3>${ts.filter(t=>t.state===i).map(t=>`<article class="task"><div class="card-tags"><span class="badge">${esc(projectSprintName(t.p,t.sprint))}</span></div><h3><button class="projecttitle" onclick="editTask(${t.id})">${esc(t.name)}</button></h3><p class="muted">${esc(projects.find(p=>p.id===t.p)?.name||'Projeto')}</p><span class="sub">${esc(people[t.person]||'Não informado')} · ${taskHours(t)}</span>${taskTimerControls(t)}<div class="row">${statusSelect(t)}<button aria-label="Editar atividade" onclick="editTask(${t.id})">↗</button></div></article>`).join('')||'<p class="muted">Sem atividades nesta etapa.</p>'}</section>`).join('')}</div>`;
}

syncTrackedHours();
render();
if(typeof setInterval==='function')setInterval(()=>{document.querySelectorAll('[data-timer-id]').forEach(node=>{const timer=taskTimers[node.dataset.timerId];if(timer?.status==='running')node.textContent=timerDurationLabel(timerElapsed(timer))})},1000);
