function statusColorClass(value){
  if(Number.isInteger(value))return ['status-todo','status-doing','status-review','status-done'][value]||'status-todo';
  const status=String(value||'').toLowerCase();
  if(status.includes('conclu'))return 'status-done';
  if(status.includes('suspens')||status.includes('inviável')||status.includes('inviavel')||status.includes('rejeit'))return 'status-blocked';
  if(status.includes('andamento')||status.includes('execução')||status.includes('execucao')||status.includes('prova de conceito'))return 'status-doing';
  if(status.includes('validação')||status.includes('validacao')||status.includes('viabilidade')||status.includes('aprova'))return 'status-review';
  return 'status-todo';
}
function statusLegend(includeBlocked=false){return `<div class="status-legend"><b>Status</b><span class="status-todo">A fazer / Backlog</span><span class="status-doing">Em andamento</span><span class="status-review">Em validação</span><span class="status-done">Concluído</span>${includeBlocked?'<span class="status-blocked">Suspenso / Inviável</span>':''}</div>`}

const deadlineReference=String((typeof externalPortfolioData!=='undefined'&&externalPortfolioData.queriedAt)||new Date().toISOString()).slice(0,10);
function deadlineHealth(item){
  const completed=item?.state===3||['Concluído','Inviável Financeiramente'].includes(item?.status);
  if(completed)return 'Dentro do Prazo';
  if(item?.status==='Suspenso')return 'Atenção';
  const due=item?.endDate||item?.plannedEnd;
  if(!due)return 'Atenção';
  const days=Math.ceil((Date.parse(due+'T12:00:00')-Date.parse(deadlineReference+'T12:00:00'))/86400000);
  return days<0?'Atrasado':days<=14?'Atenção':'Dentro do Prazo';
}
function deadlineClass(value){return value==='Atrasado'?'deadline-late':value==='Atenção'?'deadline-warning':'deadline-on-time'}
function deadlineBadge(item){const value=deadlineHealth(item);return `<span class="deadline-badge ${deadlineClass(value)}">${value}</span>`}
function worstDeadline(items){const values=items.map(deadlineHealth);return values.includes('Atrasado')?'Atrasado':values.includes('Atenção')?'Atenção':'Dentro do Prazo'}
function deadlineLegend(){return `<div class="deadline-legend"><b>Prazo</b><span class="deadline-on-time">Dentro do Prazo</span><span class="deadline-warning">Atenção</span><span class="deadline-late">Atrasado</span></div>`}

let kanbanLevel='projects',kanbanProjects=[],kanbanMilestones=[],kanbanSprints=[],kanbanResources=[],kanbanTypes=[],kanbanTaskQuery='';
function setKanbanProjects(values){kanbanProjects=values.map(String);kanbanProject=kanbanProjects.length===1?kanbanProjects[0]:'0';kanbanMilestones=[];kanbanSprints=[];render()}
function setKanbanMilestones(values){kanbanMilestones=values.map(String);render()}
function setKanbanSprints(values){kanbanSprints=values.map(String);render()}
function setKanbanResources(values){kanbanResources=values.map(String);render()}
function setKanbanTypes(values){kanbanTypes=values.map(String);render()}
function setKanbanProject(value){setKanbanProjects(String(value)==='0'?[]:[String(value)])}
function setKanbanLevel(level){kanbanLevel=level;render()}
function drillKanban(level,projectId,milestoneId=0,sprintId=0){kanbanProjects=projectId?[String(projectId)]:[];kanbanProject=projectId?String(projectId):'0';kanbanMilestones=milestoneId?[String(milestoneId)]:[];kanbanSprints=sprintId&&projectId?[`${projectId}:${sprintId}`]:[];kanbanLevel=level;render()}
function projectFlowState(p){const s=String(p.status||'').toLowerCase();if(s.includes('conclu'))return 3;if(s.includes('suspens')||s.includes('inviável')||s.includes('inviavel')||s.includes('rejeit'))return 4;if(s.includes('andamento')||s.includes('execução'))return 1;if(s.includes('viabilidade')||s.includes('conceito')||s.includes('validação')||s.includes('aprova'))return 2;return 0}
function sprintFlowState(s){const value=String(s.status||'').toLowerCase();return value.includes('conclu')?3:value.includes('ativ')?1:value.includes('valid')?2:0}
function sprintDeadlineItem(s){return {...s,state:sprintFlowState(s),endDate:s.end}}
function projectHasMatchingTask(p,taskPool){return taskPool.some(t=>t.p===p.id)}
let hierarchyDragItem=null;
function hierarchyDragAttrs(level,id,projectId=0){return `draggable="true" ondragstart="startHierarchyDrag(event,'${level}',${id},${projectId})" ondragend="endHierarchyDrag(event)"`}
function startHierarchyDrag(event,level,id,projectId=0){
  hierarchyDragItem={level,id:Number(id),projectId:Number(projectId)||0};
  event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',JSON.stringify(hierarchyDragItem));
  requestAnimationFrame(()=>event.currentTarget?.classList.add('dragging'));
}
function allowHierarchyDrop(event,level){if(!hierarchyDragItem||hierarchyDragItem.level!==level)return;event.preventDefault();event.dataTransfer.dropEffect='move';event.currentTarget.classList.add('drop-target')}
function leaveHierarchyDrop(event){if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.classList.remove('drop-target')}
function dropHierarchyItem(event,level,state){
  event.preventDefault();event.currentTarget.classList.remove('drop-target');
  let item=hierarchyDragItem;try{item=item||JSON.parse(event.dataTransfer.getData('text/plain')||'null')}catch{}
  if(!item||item.level!==level)return endHierarchyDrag();
  updateHierarchyItemStatus(item,state);endHierarchyDrag();
}
function endHierarchyDrag(event){document.querySelectorAll('.kanban-dropzone.drop-target').forEach(node=>node.classList.remove('drop-target'));event?.currentTarget?.classList.remove('dragging');hierarchyDragItem=null}
function updateHierarchyItemStatus(item,state){
  let label='Item';
  if(item.level==='projects'){
    const project=projects.find(p=>p.id===item.id);if(!project||projectFlowState(project)===state)return;
    project.status=['Backlog','Em andamento','Em avaliação','Concluído','Suspenso'][state];label='Projeto';
  }else if(item.level==='sprints'){
    const sprint=projectSprints.find(s=>s.id===item.id&&s.p===item.projectId);if(!sprint||sprintFlowState(sprint)===state)return;
    sprint.status=['Planejada','Ativa','Em validação','Concluída'][state];label='Sprint';
  }else{
    const task=tasks.find(t=>t.id===item.id);if(!task||task.state===state)return;
    task.state=state;label=item.level==='milestones'?'Marco':'Tarefa';
  }
  render();toast(`${label} movido para ${item.level==='projects'?['Backlog','Em andamento','Em avaliação','Concluído','Suspenso'][state]:states[state]}. Status atualizado nas demais visões.`);
}
function hierarchyFilters(fixedProjectId=null){
  const projectIds=fixedProjectId?[String(fixedProjectId)]:kanbanProjects;
  const projectSet=new Set(projectIds.map(Number));
  const milestones=tasks.filter(t=>t.type==='milestone'&&(!projectSet.size||projectSet.has(t.p)));
  const sprints=projectSprints.filter(s=>!projectSet.size||projectSet.has(s.p));
  const directoryResourceIds=activeProjectResources.map(resource=>people.indexOf(resource.displayName)).filter(id=>id>=0),assignedResourceIds=tasks.filter(t=>!projectSet.size||projectSet.has(t.p)).map(t=>t.person).filter(v=>v!==undefined);
  const resourceIds=[...new Set([...directoryResourceIds,...assignedResourceIds])].sort((a,b)=>String(people[a]).localeCompare(String(people[b]),'pt-BR'));
  const projectFilter=fixedProjectId?`<div class="fixed-filter"><span>Projeto</span><b>${esc(projects.find(p=>p.id===fixedProjectId)?.name||'Projeto')}</b></div>`:multiChoice('kanban-project-filter','Projeto',projects.map(p=>({value:p.id,label:p.name})),kanbanProjects,'setKanbanProjects','Todos os projetos');
  const typeOptions=[...new Map(projects.map(p=>[String(p.projectTypeId||p.type),projectTypeName(p.projectTypeId,p.type)])).entries()].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
  return `<section class="kanban-filters" aria-label="Filtros do acompanhamento">${projectFilter}${multiChoice('kanban-type-filter','Tipo de projeto',typeOptions,kanbanTypes,'setKanbanTypes','Todos os tipos')}${multiChoice('kanban-milestone-filter','Marco',milestones.map(m=>({value:m.id,label:m.name})),kanbanMilestones,'setKanbanMilestones','Todos os marcos')}${multiChoice('kanban-sprint-filter','Sprint',sprints.map(item=>({value:`${item.p}:${item.id}`,label:item.name})),kanbanSprints,'setKanbanSprints','Todas as sprints')}<label>Tarefa<input aria-label="Filtrar por tarefa" placeholder="Nome da tarefa" value="${esc(kanbanTaskQuery)}" onchange="kanbanTaskQuery=this.value;render()"></label>${multiChoice('kanban-resource-filter','Recurso',resourceIds.map(id=>({value:id,label:people[id]||'Não informado'})),kanbanResources,'setKanbanResources','Todos os recursos')}</section>`;
}
function hierarchyTabs(counts){const levels=[['projects','Projetos'],['milestones','Marcos'],['sprints','Sprints'],['tasks','Tarefas']];return `<div class="hierarchy-tabs" aria-label="Níveis do Kanban">${levels.map(([id,label],index)=>`<button class="${kanbanLevel===id?'active':''}" onclick="setKanbanLevel('${id}')"><span>${index?'Subnível '+index:'Nível'}</span>${label}<b>${counts[id]}</b></button>`).join('<i>›</i>')}</div>`}
function filteredHierarchyData(fixedProjectId=null){
  const projectIds=fixedProjectId?[Number(fixedProjectId)]:kanbanProjects.map(Number),projectSet=new Set(projectIds),resourceSet=new Set(kanbanResources),typeSet=new Set(kanbanTypes),sprintSet=new Set(kanbanSprints),milestoneSet=new Set(kanbanMilestones),selectedMilestones=tasks.filter(t=>milestoneSet.has(String(t.id))),query=kanbanTaskQuery.trim().toLowerCase(),projectMatchesType=id=>{const p=projects.find(item=>item.id===id);return !typeSet.size||typeSet.has(String(p?.projectTypeId||p?.type))};
  const matchesMilestone=t=>!selectedMilestones.length||(t.type==='milestone'?milestoneSet.has(String(t.id)):selectedMilestones.some(m=>t.p===m.p&&(!m.sprint||t.sprint===m.sprint)));
  let taskPool=tasks.filter(t=>(!projectSet.size||projectSet.has(t.p))&&projectMatchesType(t.p)&&(!resourceSet.size||resourceSet.has(String(t.person)))&&(!sprintSet.size||sprintSet.has(`${t.p}:${t.sprint}`))&&matchesMilestone(t)&&(!query||t.name.toLowerCase().includes(query)));
  const taskItems=taskPool.filter(t=>t.type!=='milestone'),milestoneItems=taskPool.filter(t=>t.type==='milestone');
  const sprintItems=projectSprints.filter(item=>(!projectSet.size||projectSet.has(item.p))&&projectMatchesType(item.p)&&(!sprintSet.size||sprintSet.has(`${item.p}:${item.id}`))&&(!selectedMilestones.length||selectedMilestones.some(m=>m.p===item.p&&(!m.sprint||m.sprint===item.id)))&&(!resourceSet.size||taskPool.some(t=>t.p===item.p&&t.sprint===item.id))&&(!query||taskPool.some(t=>t.p===item.p&&t.sprint===item.id)));
  const itemFiltersActive=resourceSet.size||sprintSet.size||selectedMilestones.length||query;
  const projectItems=projects.filter(item=>(!projectSet.size||projectSet.has(item.id))&&projectMatchesType(item.id)&&(!itemFiltersActive||projectHasMatchingTask(item,taskPool)||sprintItems.some(s=>s.p===item.id)||milestoneItems.some(m=>m.p===item.id)));
  return {projects:projectItems,milestones:milestoneItems,sprints:sprintItems,tasks:taskItems};
}
function projectHierarchyCard(p){const its=tasks.filter(t=>t.p===p.id),milestones=its.filter(t=>t.type==='milestone').length,sprints=projectSprints.filter(s=>s.p===p.id).length,resources=new Set(its.map(t=>t.person)).size;return `<article class="task hierarchy-card draggable-task ${statusColorClass(p.status)} ${deadlineClass(deadlineHealth(p))}" ${hierarchyDragAttrs('projects',p.id)}><span class="drag-handle" aria-hidden="true">⋮⋮</span><div class="card-tags"><span class="type-pill projecttype">Projeto</span>${projectTypeBadge(p)}${deadlineBadge(p)}</div><h3><button class="projecttitle" onclick="openProject(${p.id})">${esc(p.name)}</button></h3><p class="muted">${esc(p.area)} · ${esc(p.status)}</p>${projectPrioritizationMarkup(p,true)}<div class="hierarchy-counts"><span><b>${milestones}</b> marcos</span><span><b>${sprints}</b> sprints</span><span><b>${its.filter(t=>t.type!=='milestone').length}</b> tarefas</span><span><b>${resources}</b> recursos</span></div><button class="drill-button" onclick="drillKanban('milestones',${p.id})">Ver marcos →</button></article>`}
function milestoneHierarchyCard(m){const relatedSprints=projectSprints.filter(s=>s.p===m.p&&(!m.sprint||s.id===m.sprint)),relatedTasks=tasks.filter(t=>t.p===m.p&&t.type!=='milestone'&&(!m.sprint||t.sprint===m.sprint));return `<article class="task hierarchy-card draggable-task ${statusColorClass(m.state)} ${deadlineClass(deadlineHealth(m))}" ${hierarchyDragAttrs('milestones',m.id,m.p)}><span class="drag-handle" aria-hidden="true">⋮⋮</span><div class="card-tags"><span class="type-pill milestone">Marco</span>${deadlineBadge(m)}</div><h3><button class="projecttitle" onclick="editProjectItem(${m.id})">◆ ${esc(m.name)}</button></h3><p class="muted">${esc(projects.find(p=>p.id===m.p)?.name||'Projeto')} · ${states[m.state]}</p><div class="hierarchy-counts"><span><b>${relatedSprints.length}</b> sprints</span><span><b>${relatedTasks.length}</b> tarefas</span></div><button class="drill-button" onclick="drillKanban('sprints',${m.p},${m.id},${m.sprint||0})">Ver sprints →</button></article>`}
function sprintHierarchyCard(s){const its=tasks.filter(t=>t.p===s.p&&t.type!=='milestone'&&t.sprint===s.id),resources=new Set(its.map(t=>t.person)).size,item=sprintDeadlineItem(s);return `<article class="task hierarchy-card draggable-task ${statusColorClass(sprintFlowState(s))} ${deadlineClass(deadlineHealth(item))}" ${hierarchyDragAttrs('sprints',s.id,s.p)}><span class="drag-handle" aria-hidden="true">⋮⋮</span><div class="card-tags"><span class="type-pill sprinttype">Sprint</span>${deadlineBadge(item)}</div><h3>${esc(s.name)}</h3><p class="muted">${esc(projects.find(p=>p.id===s.p)?.name||'Projeto')} · ${esc(s.status)}</p><div class="hierarchy-counts"><span><b>${its.length}</b> tarefas</span><span><b>${resources}</b> recursos</span></div><button class="drill-button" onclick="drillKanban('tasks',${s.p},0,${s.id})">Ver tarefas →</button></article>`}
function hierarchyBoard(data){
  const isProject=kanbanLevel==='projects',columns=isProject?[{label:'Backlog',key:0,cls:'status-todo'},{label:'Em andamento',key:1,cls:'status-doing'},{label:'Em avaliação',key:2,cls:'status-review'},{label:'Concluído',key:3,cls:'status-done'},{label:'Suspenso / Inviável',key:4,cls:'status-blocked'}]:states.map((label,key)=>({label,key,cls:statusColorClass(key)}));
  const items=data[kanbanLevel],stateOf=item=>kanbanLevel==='projects'?projectFlowState(item):kanbanLevel==='sprints'?sprintFlowState(item):item.state,card=item=>kanbanLevel==='projects'?projectHierarchyCard(item):kanbanLevel==='milestones'?milestoneHierarchyCard(item):kanbanLevel==='sprints'?sprintHierarchyCard(item):kanbanCard(item,true);
  return `<div class="kanban level-${kanbanLevel}">${columns.map(col=>{const matches=items.filter(item=>stateOf(item)===col.key);return `<section class="column kanban-dropzone ${col.cls}" data-state="${col.key}" ondragover="allowHierarchyDrop(event,'${kanbanLevel}')" ondragleave="leaveHierarchyDrop(event)" ondrop="dropHierarchyItem(event,'${kanbanLevel}',${col.key})"><h3>${col.label}<span class="muted">${matches.length}</span></h3>${matches.map(card).join('')||'<p class="muted">Arraste um item para esta coluna.</p>'}</section>`}).join('')}</div>`;
}
function kanbanHierarchy(fixedProjectId=null){const data=filteredHierarchyData(fixedProjectId),counts={projects:data.projects.length,milestones:data.milestones.length,sprints:data.sprints.length,tasks:data.tasks.length};return `${hierarchyTabs(counts)}${hierarchyFilters(fixedProjectId)}${statusLegend(true)}${deadlineLegend()}${hierarchyBoard(data)}`}

function ganttRow(label,start,end,pct=0,type='',baseEnd=end,statusClass='',deadline='Dentro do Prazo'){
  const deadlineCls=deadlineClass(deadline),classes=[type,statusClass,deadlineCls].filter(Boolean).join(' ');
  return `<div class="grow ${deadlineCls}"><div class="glabel">${label}</div><div class="track">${type==='milestone'?`<span class="diamond ${statusClass} ${deadlineCls}" style="left:${start}%" title="Marco · ${deadline}"></span>`:`<div class="bar ${classes}" style="left:${start}%;width:${Math.max(1,end-start)}%" title="${deadline} · Progresso: ${pct}%"><i style="width:${pct}%"></i><span>${pct}%</span></div><div class="baseline" style="left:${start}%;width:${Math.max(1,baseEnd-start)}%" title="Linha de base"></div>`}</div></div>`;
}
function gantt(){
  const p=projects.find(project=>project.id===selected)||projects[0],ts=tasks.filter(t=>t.p===p.id);let rows='';
  if(ganttMode==='global')rows=projects.map(project=>{const deadline=deadlineHealth(project);return ganttRow(`<button class="projecttitle" onclick="openProject(${project.id})">${esc(project.name)}</button><span class="sub">${esc(project.area)} · ${esc(project.status)}</span>${deadlineBadge(project)}`,project.start,project.end,progress(project.id),'',deadline==='Atrasado'?project.end-8:project.end,statusColorClass(project.status),deadline)}).join('');
  else{
    rows=ganttRow(`<b>${esc(p.name)}</b><span class="sub">${esc(p.status)}</span>${deadlineBadge(p)}`,p.start,p.end,progress(p.id),'',p.end,statusColorClass(p.status),deadlineHealth(p));
    const groups=[...new Set(ts.map(t=>groupMode==='sprints'?projectSprintName(t.p,t.sprint):t.delivery))];
    groups.forEach(group=>{const children=ts.filter(t=>(groupMode==='sprints'?projectSprintName(t.p,t.sprint):t.delivery)===group),key=p.id+group;if(!children.length)return;const groupDeadline=worstDeadline(children);rows+=ganttRow(`<button class="projecttitle" onclick="toggleGroup('${key}')">${collapsed.has(key)?'▸':'▾'} ${esc(group)}</button><span class="sub">${groupMode==='sprints'?'Ciclo de execução':'Fase / entrega'} · ${children.length} atividades</span>`,Math.min(...children.map(t=>t.start)),Math.max(...children.map(t=>t.end)),Math.round(children.reduce((sum,t)=>sum+t.state/3,0)/children.length*100),'sprint',Math.max(...children.map(t=>t.end)),'',groupDeadline);if(!collapsed.has(key))rows+=children.map(t=>ganttRow(`<button class="projecttitle" style="padding-left:15px;font-weight:400" onclick="editTask(${t.id})">${esc(t.name)}</button><span class="sub" style="padding-left:15px">${esc(people[t.person]||'Não informado')} · ${states[t.state]}</span>${deadlineBadge(t)}`,t.start,t.end,Math.round(t.state/3*100),t.type==='milestone'?'milestone':'',t.end,statusColorClass(t.state),deadlineHealth(t))).join('')});
  }
  return heading('Cronograma de projetos','Projetos, marcos e tarefas mostram o status da execução e a situação do prazo.')+`<div class="tabs"><button class="${ganttMode==='global'?'active':''}" onclick="ganttMode='global';render()">Gantt Global</button><button class="${ganttMode==='individual'?'active':''}" onclick="ganttMode='individual';render()">Gantt Individual</button></div>${statusLegend(true)}${deadlineLegend()}<section class="panel"><div class="panelhead"><h2>${ganttMode==='global'?'Todos os projetos':'Estrutura do projeto'}</h2><div class="toolbar">${ganttMode==='individual'?projectSelect(selected,'selected=+this.value;render()')+`<select aria-label="Agrupar cronograma" onchange="groupMode=this.value;render()"><option value="estrutura" ${groupMode==='estrutura'?'selected':''}>Por fases e entregas</option><option value="sprints" ${groupMode==='sprints'?'selected':''}>Por sprints</option></select>`:''}<span class="badge">Status e prazo</span></div></div><div class="gantt"><div class="ganttgrid"><div class="ghead"><div>PROJETO / ESTRUTURA</div><div class="months">${['JUL','AGO','SET','OUT','NOV','DEZ'].map(month=>`<span>${month}</span>`).join('')}</div></div>${rows}</div></div><div class="gfoot">O preenchimento representa o status · O contorno e o selo representam o prazo · A linha cinza é o planejamento original · ◆ representa um marco.</div></section>`;
}
function projectGantt(p){
  const ts=projectItems(p.id).filter(t=>!t.parentId),groups=[...new Set(ts.map(t=>t.delivery))];
  let rows=ganttRow(`<b>${esc(p.name)}</b><span class="sub">${esc(p.status)}</span>${deadlineBadge(p)}`,p.start,p.end,progress(p.id),'',p.end,statusColorClass(p.status),deadlineHealth(p));
  groups.forEach(group=>{const children=ts.filter(t=>t.delivery===group);if(!children.length)return;const groupDeadline=worstDeadline(children);rows+=ganttRow(`<b>${esc(group)}</b><span class="sub">Fase · ${children.length} itens</span>`,Math.min(...children.map(t=>t.start)),Math.max(...children.map(t=>t.end)),Math.round(children.reduce((sum,t)=>sum+t.state/3,0)/Math.max(1,children.length)*100),'sprint',Math.max(...children.map(t=>t.end)),'',groupDeadline);rows+=children.map(t=>ganttRow(`<button class="projecttitle" style="padding-left:15px;font-weight:400" onclick="editProjectItem(${t.id})">${t.type==='milestone'?'◆ ':''}${esc(t.name)}</button><span class="sub" style="padding-left:15px">${itemTypeLabel(t)} · ${states[t.state]}</span>${deadlineBadge(t)}`,t.start,t.end,Math.round(t.state/3*100),t.type==='milestone'?'milestone':'',t.end,statusColorClass(t.state),deadlineHealth(t))).join('')});
  return `${statusLegend(true)}${deadlineLegend()}<section class="panel"><div class="panelhead"><div><h2>Gantt individual</h2><span class="sub">Projetos, tarefas e marcos exibem status e situação do prazo.</span></div><button onclick="ganttMode='global';nav('gantt')">Abrir Gantt global</button></div><div class="gantt"><div class="ganttgrid"><div class="ghead"><div>PROJETO / ESTRUTURA</div><div class="months">${['JUL','AGO','SET','OUT','NOV','DEZ'].map(month=>`<span>${month}</span>`).join('')}</div></div>${rows}</div></div><div class="gfoot">O preenchimento representa o status · O contorno e o selo representam o prazo.</div></section>`;
}
function kanbanCard(t,projectContext=false){
  const deadline=deadlineHealth(t);
  return `<article class="task draggable-task ${statusColorClass(t.state)} ${deadlineClass(deadline)}" ${hierarchyDragAttrs('tasks',t.id,t.p)}><span class="drag-handle" aria-hidden="true">⋮⋮</span><div class="card-tags"><span class="type-pill ${itemTypeClass(t)}">${itemTypeLabel(t)}</span>${deadlineBadge(t)}</div><h3><button class="projecttitle" onclick="${projectContext?'editProjectItem':'editTask'}(${t.id})">${esc(t.name)}</button></h3><p class="muted">${projectContext?esc(t.delivery):esc(projects.find(p=>p.id===t.p)?.name||'Projeto')}</p><span class="sub">${esc(people[t.person]||'Não informado')} · ${taskHours(t)}</span>${taskTimerControls(t)}<div class="row">${statusSelect(t)}<button aria-label="Editar atividade" onclick="${projectContext?'editProjectItem':'editTask'}(${t.id})">↗</button></div></article>`;
}
function kanban(){
  return heading('Kanban de acompanhamento','Navegue de projetos até tarefas e filtre a execução por marco, sprint e recurso.',`<button class="primary" onclick="editTask()">+ Nova atividade</button>`)+kanbanHierarchy();
}
function projectKanban(p){
  kanbanProject=String(p.id);
  return `<div class="board-actions"><div><b>Kanban de acompanhamento do projeto</b><span class="sub">Projetos → marcos → sprints → tarefas → recursos.</span></div><div class="toolbar"><button onclick="editProjectItem(null,'milestone')">◆ Novo marco</button><button class="primary" onclick="editProjectItem(null,'task')">+ Nova tarefa</button></div></div>${kanbanHierarchy(p.id)}`;
}

render();
