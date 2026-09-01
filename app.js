const DB_KEY='kpisEcoV4';
let db=JSON.parse(localStorage.getItem(DB_KEY)||'null')||{
  projects:[], roles:[], templates:[], tasks:[], employees:[], evaluations:[]
};
let generatedKpis=[];
let currentFilter='all';
let editingTemplateId=null;
let editorKpis=[];
let activeEvaluation=null;

const $=id=>document.getElementById(id);
const save=()=>localStorage.setItem(DB_KEY,JSON.stringify(db));
const uid=()=>Date.now()+Math.floor(Math.random()*99999);

const titles={
  dashboard:'لوحة التحكم',projects:'المشاريع',roles:'المسميات الوظيفية',
  generator:'KPI Generator',templates:'KPI Templates',tasks:'المهام',
  employees:'الموظفون',evaluations:'التقييمات',reports:'التقارير'
};

document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  item.classList.add('active');
  $(item.dataset.view).classList.add('active');
  $('pageTitle').textContent=titles[item.dataset.view];
  renderAll();
}));

function projectName(id){return db.projects.find(p=>p.id==id)?.name||'غير محدد'}
function roleName(id){return db.roles.find(r=>r.id==id)?.title||'غير محدد'}
function templateName(id){return db.templates.find(t=>t.id==id)?.name||'بدون Template'}
function employeeName(id){return db.employees.find(e=>e.id==id)?.name||'غير محدد'}

function refreshProjectSelects(){
  const selects=['globalProjectSelect','roleProject','generatorProject','taskProject','employeeProject','evaluationProject'];
  selects.forEach(id=>{
    const el=$(id);if(!el)return;
    const current=el.value;
    el.innerHTML='<option value="">كل المشاريع / اختر مشروع</option>'+db.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    if([...el.options].some(o=>o.value===current))el.value=current;
  });
  refreshGeneratorRoles();
  refreshEmployeeRoleTemplateOptions();
  refreshEvaluationEmployees();
}
function refreshGeneratorRoles(){
  const pid=$('generatorProject')?.value||'';
  const el=$('generatorRole');if(!el)return;
  const roles=db.roles.filter(r=>!pid||String(r.projectId)===String(pid));
  el.innerHTML='<option value="">اختر مسمى وظيفي</option>'+roles.map(r=>`<option value="${r.id}">${r.title}</option>`).join('');
}
function refreshEmployeeRoleTemplateOptions(){
  const pid=$('employeeProject')?.value||'';
  const roleEl=$('employeeRole'), templateEl=$('employeeTemplate');
  if(!roleEl||!templateEl)return;
  const currentRole=roleEl.value,currentTemplate=templateEl.value;
  const roles=db.roles.filter(r=>!pid||String(r.projectId)===String(pid));
  roleEl.innerHTML='<option value="">اختر المسمى</option>'+roles.map(r=>`<option value="${r.id}">${r.title}</option>`).join('');
  if([...roleEl.options].some(o=>o.value===currentRole))roleEl.value=currentRole;
  refreshEmployeeTemplateOptions(currentTemplate);
}
function refreshEmployeeTemplateOptions(forceValue){
  const pid=$('employeeProject')?.value||'';
  const roleId=$('employeeRole')?.value||'';
  const templates=db.templates.filter(t=>(!pid||String(t.projectId)===String(pid))&&(!roleId||String(t.roleId)===String(roleId)));
  $('employeeTemplate').innerHTML='<option value="">اختر Template</option>'+templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  if(forceValue&&[...$('employeeTemplate').options].some(o=>o.value===forceValue))$('employeeTemplate').value=forceValue;
}
function refreshEvaluationEmployees(){
  const pid=$('evaluationProject')?.value||'';
  const employees=db.employees.filter(e=>!pid||String(e.projectId)===String(pid));
  $('evaluationEmployee').innerHTML='<option value="">اختر الموظف</option>'+employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
}

$('generatorProject').addEventListener('change',()=>{refreshGeneratorRoles();$('generatorResponsibilities').value='';});
$('globalProjectSelect').addEventListener('change',renderAll);
$('employeeProject').addEventListener('change',refreshEmployeeRoleTemplateOptions);
$('employeeRole').addEventListener('change',()=>refreshEmployeeTemplateOptions());
$('evaluationProject').addEventListener('change',refreshEvaluationEmployees);

/* Projects */
$('showProjectForm').onclick=()=>$('projectForm').classList.remove('hidden');
$('cancelProject').onclick=()=>$('projectForm').classList.add('hidden');
$('projectForm').addEventListener('submit',e=>{
  e.preventDefault();
  db.projects.unshift({id:uid(),name:$('projectName').value.trim(),industry:$('projectIndustry').value.trim(),createdAt:new Date().toISOString()});
  save();e.target.reset();$('projectForm').classList.add('hidden');renderAll();
});
window.deleteProject=id=>{
  if(!confirm('حذف المشروع وكل البيانات المحلية المرتبطة به؟'))return;
  const roleIds=db.roles.filter(r=>r.projectId===id).map(r=>r.id);
  const empIds=db.employees.filter(e=>e.projectId===id).map(e=>e.id);
  db.projects=db.projects.filter(p=>p.id!==id);
  db.roles=db.roles.filter(r=>r.projectId!==id);
  db.templates=db.templates.filter(t=>t.projectId!==id&&!roleIds.includes(t.roleId));
  db.tasks=db.tasks.filter(t=>t.projectId!==id);
  db.employees=db.employees.filter(e=>e.projectId!==id);
  db.evaluations=db.evaluations.filter(ev=>!empIds.includes(ev.employeeId));
  save();renderAll();
};

/* Roles */
$('showRoleForm').onclick=()=>$('roleForm').classList.remove('hidden');
$('cancelRole').onclick=()=>$('roleForm').classList.add('hidden');
$('roleForm').addEventListener('submit',e=>{
  e.preventDefault();
  const projectId=+$('roleProject').value;if(!projectId){alert('اختار المشروع');return}
  db.roles.unshift({id:uid(),projectId,title:$('roleTitle').value.trim(),responsibilities:$('roleResponsibilities').value.trim(),createdAt:new Date().toISOString()});
  save();e.target.reset();$('roleForm').classList.add('hidden');renderAll();
});
window.useRoleInGenerator=id=>{
  const r=db.roles.find(x=>x.id===id);if(!r)return;
  $('generatorProject').value=r.projectId;refreshGeneratorRoles();$('generatorRole').value=r.id;$('generatorResponsibilities').value=r.responsibilities;
  document.querySelector('[data-view="generator"]').click();
};
window.deleteRole=id=>{
  if(!confirm('حذف المسمى الوظيفي؟'))return;
  db.roles=db.roles.filter(r=>r.id!==id);
  db.templates=db.templates.filter(t=>t.roleId!==id);
  db.employees=db.employees.map(e=>e.roleId===id?{...e,roleId:null,templateId:null}:e);
  save();renderAll();
};
$('generatorRole').addEventListener('change',()=>{
  const r=db.roles.find(x=>String(x.id)===$('generatorRole').value);
  $('generatorResponsibilities').value=r?.responsibilities||'';
});

/* KPI Generator Rules */
const rules=[
  {keys:['تحصيل','اشتراك','دفع','revenue','collection'],name:'نسبة التحصيل',type:'مالي',weight:25,target:95,formula:'المبلغ المحصل ÷ المبلغ المستحق × 100',freq:'شهري'},
  {keys:['متأخر','متأخرات','overdue'],name:'متابعة المتأخرات',type:'متابعة',weight:10,target:95,formula:'الحالات التي تمت متابعتها ÷ إجمالي الحالات المتأخرة × 100',freq:'أسبوعي'},
  {keys:['تقرير','تقارير','report'],name:'الالتزام بالتقارير',type:'SLA',weight:10,target:95,formula:'التقارير المسلمة صحيحة وفي الموعد ÷ التقارير المطلوبة × 100',freq:'شهري'},
  {keys:['حضور','موعد','انضباط','تأخير','punctual'],name:'الالتزام بالمواعيد والانضباط',type:'SLA',weight:15,target:95,formula:'الحالات الملتزمة بالموعد ÷ إجمالي الحالات المطلوبة × 100',freq:'شهري'},
  {keys:['رد','استفسار','تواصل','رسائل','بوت','response'],name:'سرعة وجودة الاستجابة',type:'خدمة',weight:15,target:90,formula:'الحالات التي تم التعامل معها داخل SLA ÷ إجمالي الحالات × 100',freq:'أسبوعي'},
  {keys:['جودة','تقييم','تقويم','quality','audit'],name:'جودة الأداء',type:'جودة',weight:15,target:90,formula:'متوسط نتيجة التقييم المعياري بعد التطبيع إلى 100',freq:'شهري'},
  {keys:['طلاب','عملاء','customer','student','متابعة'],name:'متابعة المستفيدين',type:'متابعة',weight:10,target:95,formula:'الحالات التي تمت متابعتها وتوثيقها ÷ إجمالي الحالات المستحقة × 100',freq:'أسبوعي'},
  {keys:['خطة','تنفيذ','إنجاز','plan','execute'],name:'تنفيذ الخطة والمهام',type:'نتائج',weight:15,target:90,formula:'المهام المنفذة في الموعد ÷ المهام المستحقة × 100',freq:'شهري'},
  {keys:['قيادة','فريق','توجيه','leadership','team'],name:'قيادة وتوجيه الفريق',type:'قيادة',weight:15,target:90,formula:'متوسط تقييم القيادة + نسبة إنجاز الفريق بعد التطبيع',freq:'شهري'},
  {keys:['اجتماع','اجتماعات','meeting'],name:'الالتزام بالاجتماعات',type:'امتثال',weight:10,target:95,formula:'الاجتماعات المنفذة ÷ الاجتماعات المخطط لها × 100',freq:'شهري'},
  {keys:['تطوير','تحسين','اقتراح','development','improvement'],name:'المساهمة في التطوير والتحسين',type:'تحسين',weight:10,target:90,formula:'مبادرات التحسين المنفذة أو المعتمدة ÷ المستهدف × 100',freq:'شهري'},
  {keys:['شيت','بيانات','تسجيل','data','sheet','سجل'],name:'دقة واكتمال البيانات',type:'جودة',weight:15,target:98,formula:'السجلات الصحيحة والمكتملة ÷ السجلات التي تمت مراجعتها × 100',freq:'أسبوعي'},
  {keys:['اختبار','قبول','تقديم','admission','application'],name:'كفاءة إجراءات القبول/المعالجة',type:'تشغيل',weight:10,target:95,formula:'الإجراءات المكتملة في الوقت المحدد ÷ الإجراءات المستحقة × 100',freq:'حسب الدورة'},
  {keys:['تسويق','marketing','جذب','مبيعات','sales'],name:'تنفيذ أنشطة النمو',type:'نمو',weight:10,target:90,formula:'الأنشطة المنفذة في موعدها ÷ الأنشطة المخططة × 100',freq:'شهري'},
  {keys:['شكوى','مشكلة','حل','issue','complaint'],name:'إغلاق المشكلات',type:'حوكمة',weight:15,target:90,formula:'المشكلات المغلقة داخل SLA ÷ إجمالي المشكلات المستحقة × 100',freq:'شهري'}
];

function generateKPIs(text){
  const clean=text.toLowerCase();let found=[];
  rules.forEach(r=>{const matches=r.keys.filter(k=>clean.includes(k.toLowerCase())).length;if(matches>0)found.push({...r,score:matches})});
  found.sort((a,b)=>b.score-a.score);
  const fallbacks=[
    {name:'تنفيذ المهام الأساسية',type:'نتائج',weight:20,target:90,formula:'المهام المكتملة بالجودة وفي الموعد ÷ المهام المستحقة × 100',freq:'شهري'},
    {name:'جودة التنفيذ',type:'جودة',weight:20,target:90,formula:'متوسط تقييم جودة المخرجات وفق نموذج معتمد',freq:'شهري'},
    {name:'الالتزام الزمني',type:'SLA',weight:15,target:95,formula:'المهام المنجزة داخل المدة المحددة ÷ إجمالي المهام × 100',freq:'شهري'},
    {name:'التواصل والمتابعة',type:'متابعة',weight:15,target:90,formula:'المتابعات المنفذة والموثقة ÷ المتابعات المستحقة × 100',freq:'شهري'}
  ];
  fallbacks.forEach(f=>{if(found.length<6&&!found.some(x=>x.name===f.name))found.push(f)});
  found=found.slice(0,8);
  const sum=found.reduce((a,k)=>a+k.weight,0)||1;
  found=found.map((k,i)=>({...k,id:uid()+i,weight:Math.round(k.weight/sum*100)}));
  const diff=100-found.reduce((a,k)=>a+k.weight,0);if(found.length)found[0].weight+=diff;
  return found;
}
$('generateBtn').onclick=()=>{
  const txt=$('generatorResponsibilities').value.trim();if(!txt){alert('اكتب أو اختر مهام الوظيفة');return}
  generatedKpis=generateKPIs(txt);
  const role=db.roles.find(r=>String(r.id)===$('generatorRole').value);
  $('templateName').value=role?`KPI - ${role.title}`:'KPI Template جديد';renderGenerated();
};
$('resetGenerated').onclick=()=>{generatedKpis=[];renderGenerated()};
function renderGenerated(){
  const box=$('generatedKpis');box.innerHTML='';
  $('generatedSummary').classList.toggle('hidden',!generatedKpis.length);
  $('templateSaveBox').classList.toggle('hidden',!generatedKpis.length);
  if(generatedKpis.length)$('generatedSummary').textContent=`تم توليد ${generatedKpis.length} KPIs | إجمالي الأوزان: ${generatedKpis.reduce((a,k)=>a+(+k.weight||0),0)}%`;
  generatedKpis.forEach((k,i)=>box.appendChild(buildEditableKpiCard(k,i,'generated')));
}
function buildEditableKpiCard(k,i,mode){
  const el=document.createElement('div');el.className='kpi-card';el.draggable=true;
  el.innerHTML=`<div class="drag">☷</div>
    <div><div class="kpi-name">${k.name}</div><span class="tag">${k.type}</span><span class="tag">${k.freq}</span></div>
    <div><label>الوزن %</label><input type="number" value="${k.weight}" onchange="${mode==='generated'?'updateGenerated':'updateEditor'}(${i},'weight',this.value)"></div>
    <div><label>Target %</label><input type="number" value="${k.target}" onchange="${mode==='generated'?'updateGenerated':'updateEditor'}(${i},'target',this.value)"></div>
    <div><label>النوع</label><input value="${k.type}" onchange="${mode==='generated'?'updateGenerated':'updateEditor'}(${i},'type',this.value)"></div>
    <div class="formula"><label>طريقة القياس</label><textarea rows="3" onchange="${mode==='generated'?'updateGenerated':'updateEditor'}(${i},'formula',this.value)">${k.formula}</textarea></div>
    <button class="danger" onclick="${mode==='generated'?'removeGenerated':'removeEditor'}(${i})">×</button>`;
  el.addEventListener('dragstart',e=>{el.classList.add('dragging');e.dataTransfer.setData('text/plain',i)});
  el.addEventListener('dragend',()=>el.classList.remove('dragging'));
  el.addEventListener('dragover',e=>e.preventDefault());
  el.addEventListener('drop',e=>{
    e.preventDefault();const from=+e.dataTransfer.getData('text/plain');if(from===i)return;
    const arr=mode==='generated'?generatedKpis:editorKpis;const item=arr.splice(from,1)[0];arr.splice(i,0,item);
    mode==='generated'?renderGenerated():renderTemplateEditor();
  });
  return el;
}
window.updateGenerated=(i,f,v)=>{generatedKpis[i][f]=(f==='weight'||f==='target')?+v:v;renderGenerated()};
window.removeGenerated=i=>{generatedKpis.splice(i,1);renderGenerated()};
$('saveTemplate').onclick=()=>{
  if(!generatedKpis.length)return;
  const projectId=+$('generatorProject').value||null,roleId=+$('generatorRole').value||null;
  db.templates.unshift({id:uid(),projectId,roleId,name:$('templateName').value.trim()||'KPI Template',kpis:JSON.parse(JSON.stringify(generatedKpis)),createdAt:new Date().toISOString()});
  save();renderAll();alert('تم حفظ الـTemplate');
};

/* Template Editor */
window.openTemplateEditor=id=>{
  const t=db.templates.find(x=>x.id===id);if(!t)return;
  editingTemplateId=id;editorKpis=JSON.parse(JSON.stringify(t.kpis));
  $('editorTemplateName').value=t.name;$('editorTemplateProject').value=projectName(t.projectId);$('editorTemplateRole').value=roleName(t.roleId);
  $('editorTemplateTitle').textContent=`تعديل: ${t.name}`;
  $('templateEditorPanel').classList.remove('hidden');renderTemplateEditor();$('templateEditorPanel').scrollIntoView({behavior:'smooth'});
};
$('closeTemplateEditor').onclick=()=>{$('templateEditorPanel').classList.add('hidden');editingTemplateId=null;editorKpis=[]};
$('addManualKpi').onclick=()=>{
  editorKpis.push({id:uid(),name:'KPI جديد',type:'مخصص',weight:0,target:90,formula:'اكتب طريقة القياس هنا',freq:'شهري'});
  renderTemplateEditor();
};
function renderTemplateEditor(){
  $('editorKpis').innerHTML='';
  editorKpis.forEach((k,i)=>{
    const el=buildEditableKpiCard(k,i,'editor');
    el.querySelector('.kpi-name').innerHTML=`<input value="${k.name}" onchange="updateEditor(${i},'name',this.value)">`;
    $('editorKpis').appendChild(el);
  });
  const total=editorKpis.reduce((a,k)=>a+(+k.weight||0),0);
  $('editorWeightSummary').textContent=`إجمالي الأوزان: ${total}% ${total===100?'✅':'⚠️'}`;
}
window.updateEditor=(i,f,v)=>{editorKpis[i][f]=(f==='weight'||f==='target')?+v:v;renderTemplateEditor()};
window.removeEditor=i=>{editorKpis.splice(i,1);renderTemplateEditor()};
$('saveTemplateChanges').onclick=()=>{
  const t=db.templates.find(x=>x.id===editingTemplateId);if(!t)return;
  t.name=$('editorTemplateName').value.trim()||t.name;t.kpis=JSON.parse(JSON.stringify(editorKpis));t.updatedAt=new Date().toISOString();
  save();renderAll();alert('تم حفظ تعديلات الـTemplate');
};

/* Tasks */
$('showTaskForm').onclick=()=>$('taskForm').classList.remove('hidden');
$('cancelTask').onclick=()=>$('taskForm').classList.add('hidden');
$('taskForm').addEventListener('submit',e=>{
  e.preventDefault();
  db.tasks.unshift({id:uid(),projectId:+$('taskProject').value||null,title:$('taskTitle').value.trim(),owner:$('taskOwner').value.trim(),priority:$('taskPriority').value,due:$('taskDue').value,status:'open'});
  save();e.target.reset();$('taskForm').classList.add('hidden');renderAll();
});
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentFilter=btn.dataset.filter;renderTasks();
}));
window.toggleTask=id=>{db.tasks=db.tasks.map(t=>t.id===id?{...t,status:t.status==='done'?'open':'done'}:t);save();renderAll()};
window.deleteTask=id=>{if(confirm('حذف المهمة؟')){db.tasks=db.tasks.filter(t=>t.id!==id);save();renderAll()}};

/* Employees */
$('showEmployeeForm').onclick=()=>$('employeeForm').classList.remove('hidden');
$('cancelEmployee').onclick=()=>$('employeeForm').classList.add('hidden');
$('employeeForm').addEventListener('submit',e=>{
  e.preventDefault();
  const projectId=+$('employeeProject').value,roleId=+$('employeeRole').value,templateId=+$('employeeTemplate').value;
  if(!projectId||!roleId||!templateId){alert('اختار المشروع والمسمى والـTemplate');return}
  db.employees.unshift({id:uid(),projectId,roleId,templateId,name:$('employeeName').value.trim(),email:$('employeeEmail').value.trim(),phone:$('employeePhone').value.trim(),createdAt:new Date().toISOString()});
  save();e.target.reset();$('employeeForm').classList.add('hidden');renderAll();
});
window.deleteEmployee=id=>{
  if(!confirm('حذف الموظف؟'))return;
  db.employees=db.employees.filter(e=>e.id!==id);db.evaluations=db.evaluations.filter(ev=>ev.employeeId!==id);save();renderAll();
};

/* Evaluations */
$('showEvaluationForm').onclick=()=>$('evaluationForm').classList.remove('hidden');
$('cancelEvaluation').onclick=()=>$('evaluationForm').classList.add('hidden');
$('startEvaluation').onclick=()=>{
  const employeeId=+$('evaluationEmployee').value;const period=$('evaluationPeriod').value;
  if(!employeeId||!period){alert('اختار الموظف والفترة');return}
  const emp=db.employees.find(e=>e.id===employeeId),template=db.templates.find(t=>t.id===emp.templateId);
  if(!template){alert('الموظف مش مربوط بـTemplate');return}
  activeEvaluation={
    id:null,employeeId,projectId:emp.projectId,templateId:template.id,period,
    items:template.kpis.map(k=>({...JSON.parse(JSON.stringify(k)),actual:'',score:0,weightedScore:0,evidence:''})),
    comment:''
  };
  renderEvaluationWorkspace();
};
$('closeEvaluationWorkspace').onclick=()=>{$('evaluationWorkspace').classList.add('hidden');activeEvaluation=null};
function calculateEval(){
  if(!activeEvaluation)return 0;
  let total=0;
  activeEvaluation.items.forEach(k=>{
    const actual=parseFloat(k.actual),target=parseFloat(k.target)||100,weight=parseFloat(k.weight)||0;
    if(isNaN(actual)){k.score=0;k.weightedScore=0;return}
    k.score=Math.min(Math.max(actual/Math.max(target,1)*100,0),100);
    k.weightedScore=k.score/100*weight;total+=k.weightedScore;
  });
  return Math.round(total*10)/10;
}
function renderEvaluationWorkspace(){
  const emp=db.employees.find(e=>e.id===activeEvaluation.employeeId);
  $('evaluationWorkspace').classList.remove('hidden');
  $('evaluationEmployeeName').textContent=emp.name;
  $('evaluationMeta').textContent=`${projectName(emp.projectId)} • ${roleName(emp.roleId)} • ${activeEvaluation.period} • ${templateName(emp.templateId)}`;
  const box=$('evaluationKpis');box.innerHTML='';
  activeEvaluation.items.forEach((k,i)=>{
    const row=document.createElement('div');row.className='eval-row';
    row.innerHTML=`<div><div class="name">${k.name}</div><small>${k.type} • Weight ${k.weight}% • Target ${k.target}%</small></div>
    <div><label>Actual %</label><input type="number" min="0" max="200" value="${k.actual}" onchange="updateEvalItem(${i},'actual',this.value)"></div>
    <div><label>Score</label><input disabled value="${k.score.toFixed(1)}"></div>
    <div><label>Weighted</label><input disabled value="${k.weightedScore.toFixed(1)}"></div>
    <div><label>النوع</label><input disabled value="${k.type}"></div>
    <div><label>Evidence / ملاحظة</label><input value="${k.evidence||''}" onchange="updateEvalItem(${i},'evidence',this.value)"></div>`;
    box.appendChild(row);
  });
  $('evaluationFinalScore').textContent=calculateEval().toFixed(1);
  $('evaluationComment').value=activeEvaluation.comment||'';
}
window.updateEvalItem=(i,f,v)=>{activeEvaluation.items[i][f]=f==='actual'?(v===''?'':+v):v;calculateEval();renderEvaluationWorkspace()};
$('saveEvaluation').onclick=()=>{
  if(!activeEvaluation)return;
  activeEvaluation.comment=$('evaluationComment').value.trim();
  activeEvaluation.finalScore=calculateEval();
  activeEvaluation.savedAt=new Date().toISOString();
  db.evaluations.unshift({...activeEvaluation,id:uid()});
  save();$('evaluationWorkspace').classList.add('hidden');$('evaluationForm').classList.add('hidden');activeEvaluation=null;renderAll();alert('تم حفظ التقييم');
};
window.deleteEvaluation=id=>{if(confirm('حذف التقييم؟')){db.evaluations=db.evaluations.filter(e=>e.id!==id);save();renderAll()}};

/* Rendering */
function selectedProjectFilter(){return +$('globalProjectSelect').value||null}
function scoreClass(s){return s>=80?'score-good':s>=70?'score-mid':'score-low'}
function renderProjects(){
  $('projectsList').innerHTML='';
  db.projects.forEach(p=>{
    const c=document.createElement('div');c.className='project-card';
    c.innerHTML=`<h4>${p.name}</h4><div class="meta">${p.industry||'بدون مجال'}<br>${db.roles.filter(r=>r.projectId===p.id).length} وظائف • ${db.employees.filter(e=>e.projectId===p.id).length} موظفين</div>
    <div class="card-actions"><button class="danger" onclick="deleteProject(${p.id})">حذف</button></div>`;
    $('projectsList').appendChild(c);
  });
  $('emptyProjects').style.display=db.projects.length?'none':'block';
}
function renderRoles(){
  const pid=selectedProjectFilter();const roles=db.roles.filter(r=>!pid||r.projectId===pid);$('rolesList').innerHTML='';
  roles.forEach(r=>{
    const c=document.createElement('div');c.className='role-card';
    c.innerHTML=`<h4>${r.title}</h4><div class="meta">${projectName(r.projectId)}<br>${(r.responsibilities||'').split('\n').filter(Boolean).length} مهام</div>
    <div class="card-actions"><button class="mini" onclick="useRoleInGenerator(${r.id})">Generate KPIs</button><button class="danger" onclick="deleteRole(${r.id})">حذف</button></div>`;
    $('rolesList').appendChild(c);
  });$('emptyRoles').style.display=roles.length?'none':'block';
}
function renderTemplates(){
  const pid=selectedProjectFilter();const list=db.templates.filter(t=>!pid||t.projectId===pid);$('templatesList').innerHTML='';
  list.forEach(t=>{
    const c=document.createElement('div');c.className='template-card';
    c.innerHTML=`<h4>${t.name}</h4><div class="meta">${projectName(t.projectId)} • ${roleName(t.roleId)}<br>${t.kpis.length} KPIs • ${t.kpis.reduce((a,k)=>a+(+k.weight||0),0)}%</div>
    <div class="card-actions"><button class="mini" onclick="openTemplateEditor(${t.id})">تعديل كامل</button><button class="danger" onclick="deleteTemplate(${t.id})">حذف</button></div>`;
    $('templatesList').appendChild(c);
  });$('emptyTemplates').style.display=list.length?'none':'block';
}
window.deleteTemplate=id=>{
  if(!confirm('حذف الـTemplate؟'))return;
  db.templates=db.templates.filter(t=>t.id!==id);db.employees=db.employees.map(e=>e.templateId===id?{...e,templateId:null}:e);save();renderAll();
};
function renderTasks(){
  const pid=selectedProjectFilter();let list=db.tasks.filter(t=>(!pid||t.projectId===pid)&&(currentFilter==='all'||t.status===currentFilter));
  $('tasksList').innerHTML='';$('emptyTasks').style.display=list.length?'none':'block';
  list.forEach(t=>{
    const el=document.createElement('div');el.className='task-item '+(t.status==='done'?'done':'');
    el.innerHTML=`<div><div class="task-title">${t.title}</div><div class="task-meta"><span class="chip">${projectName(t.projectId)}</span>${t.owner?`<span class="chip">👤 ${t.owner}</span>`:''}<span class="chip ${t.priority==='عاجل'?'urgent':''}">⚑ ${t.priority}</span>${t.due?`<span class="chip">📅 ${t.due}</span>`:''}</div></div>
    <div class="task-actions"><button class="done-btn" onclick="toggleTask(${t.id})">${t.status==='done'?'إعادة فتح':'تمت'}</button><button class="delete-btn" onclick="deleteTask(${t.id})">حذف</button></div>`;
    $('tasksList').appendChild(el);
  });
}
function renderEmployees(){
  const pid=selectedProjectFilter();const list=db.employees.filter(e=>!pid||e.projectId===pid);$('employeesList').innerHTML='';
  list.forEach(e=>{
    const evals=db.evaluations.filter(v=>v.employeeId===e.id);const latest=evals[0];
    const c=document.createElement('div');c.className='employee-card';
    c.innerHTML=`<h4>${e.name}</h4><div class="meta">${projectName(e.projectId)} • ${roleName(e.roleId)}<br>${templateName(e.templateId)}<br>${latest?`آخر تقييم: <span class="${scoreClass(latest.finalScore)}">${latest.finalScore.toFixed(1)}%</span>`:'بدون تقييمات'}</div>
    <div class="card-actions"><button class="danger" onclick="deleteEmployee(${e.id})">حذف</button></div>`;
    $('employeesList').appendChild(c);
  });$('emptyEmployees').style.display=list.length?'none':'block';
}
function renderEvaluations(){
  const pid=selectedProjectFilter();const list=db.evaluations.filter(e=>!pid||e.projectId===pid);
  $('emptyEvaluations').style.display=list.length?'none':'block';
  if(!list.length){$('evaluationsList').innerHTML='';return}
  $('evaluationsList').innerHTML=`<table class="data-table"><thead><tr><th>الموظف</th><th>المشروع</th><th>الفترة</th><th>النتيجة</th><th>Template</th><th></th></tr></thead><tbody>${list.map(e=>`<tr><td>${employeeName(e.employeeId)}</td><td>${projectName(e.projectId)}</td><td>${e.period}</td><td class="${scoreClass(e.finalScore)}">${e.finalScore.toFixed(1)}%</td><td>${templateName(e.templateId)}</td><td><button class="danger" onclick="deleteEvaluation(${e.id})">حذف</button></td></tr>`).join('')}</tbody></table>`;
}
function renderReports(){
  const pid=selectedProjectFilter();const list=db.evaluations.filter(e=>!pid||e.projectId===pid);
  const scores=list.map(e=>e.finalScore);
  const avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
  $('reportEvalCount').textContent=list.length;$('reportAvgScore').textContent=avg===null?'—':avg.toFixed(1)+'%';$('reportTopScore').textContent=scores.length?Math.max(...scores).toFixed(1)+'%':'—';$('reportLowScore').textContent=scores.length?Math.min(...scores).toFixed(1)+'%':'—';
  const sorted=[...list].sort((a,b)=>b.finalScore-a.finalScore);
  $('topPerformers').innerHTML=sorted.slice(0,5).map(e=>`<div class="performer"><span>${employeeName(e.employeeId)}</span><b class="${scoreClass(e.finalScore)}">${e.finalScore.toFixed(1)}%</b></div>`).join('')||'<div class="meta">لا توجد بيانات</div>';
  $('needsAttention').innerHTML=sorted.filter(e=>e.finalScore<70).slice(0,5).map(e=>`<div class="performer"><span>${employeeName(e.employeeId)}</span><b class="score-low">${e.finalScore.toFixed(1)}%</b></div>`).join('')||'<div class="meta">لا توجد حالات تحت 70%</div>';
  $('reportsTable').innerHTML=list.length?`<table class="data-table"><thead><tr><th>الموظف</th><th>المشروع</th><th>الوظيفة</th><th>الفترة</th><th>النتيجة</th></tr></thead><tbody>${sorted.map(e=>{const emp=db.employees.find(x=>x.id===e.employeeId);return `<tr><td>${employeeName(e.employeeId)}</td><td>${projectName(e.projectId)}</td><td>${roleName(emp?.roleId)}</td><td>${e.period}</td><td class="${scoreClass(e.finalScore)}">${e.finalScore.toFixed(1)}%</td></tr>`}).join('')}</tbody></table>`:'<div class="meta">لا توجد بيانات بعد</div>';
}
function renderDashboard(){
  const pid=selectedProjectFilter();const evals=db.evaluations.filter(e=>!pid||e.projectId===pid);const avg=evals.length?evals.reduce((a,e)=>a+e.finalScore,0)/evals.length:null;
  $('dashboardProjects').textContent=pid?1:db.projects.length;$('dashboardEmployees').textContent=db.employees.filter(e=>!pid||e.projectId===pid).length;$('dashboardTemplates').textContent=db.templates.filter(t=>!pid||t.projectId===pid).length;$('dashboardAvg').textContent=avg===null?'—':avg.toFixed(1)+'%';
}
function renderAll(){
  refreshProjectSelects();renderProjects();renderRoles();renderTemplates();renderTasks();renderEmployees();renderEvaluations();renderReports();renderDashboard();
}
renderAll();
