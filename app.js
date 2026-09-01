const DB_KEY='kpisEcoV3';
let db=JSON.parse(localStorage.getItem(DB_KEY)||'null')||{
  projects:[], roles:[], templates:[], tasks:[], employees:[], evaluations:[]
};
let generatedKpis=[];
let currentFilter='all';

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
}));

function projectName(id){return db.projects.find(p=>p.id==id)?.name||'غير محدد'}
function roleName(id){return db.roles.find(r=>r.id==id)?.title||'غير محدد'}

function refreshProjectSelects(){
  const selects=['globalProjectSelect','roleProject','generatorProject','taskProject'];
  selects.forEach(id=>{
    const el=$(id); if(!el)return;
    const current=el.value;
    el.innerHTML='<option value="">كل المشاريع / اختر مشروع</option>'+
      db.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    if([...el.options].some(o=>o.value===current))el.value=current;
  });
  refreshGeneratorRoles();
}
function refreshGeneratorRoles(){
  const projectId=$('generatorProject')?.value||'';
  const el=$('generatorRole'); if(!el)return;
  const roles=db.roles.filter(r=>!projectId||String(r.projectId)===String(projectId));
  el.innerHTML='<option value="">اختر مسمى وظيفي</option>'+roles.map(r=>`<option value="${r.id}">${r.title}</option>`).join('');
}
$('generatorProject').addEventListener('change',()=>{refreshGeneratorRoles();$('generatorResponsibilities').value='';});

$('globalProjectSelect').addEventListener('change',renderAll);

/* Projects */
$('showProjectForm').onclick=()=>$('projectForm').classList.remove('hidden');
$('cancelProject').onclick=()=>$('projectForm').classList.add('hidden');
$('projectForm').addEventListener('submit',e=>{
  e.preventDefault();
  db.projects.unshift({id:uid(),name:$('projectName').value.trim(),industry:$('projectIndustry').value.trim(),createdAt:new Date().toISOString()});
  save();e.target.reset();$('projectForm').classList.add('hidden');renderAll();
});
function deleteProject(id){
  if(!confirm('حذف المشروع وكل البيانات المحلية المرتبطة به؟'))return;
  db.projects=db.projects.filter(p=>p.id!==id);
  const roleIds=db.roles.filter(r=>r.projectId===id).map(r=>r.id);
  db.roles=db.roles.filter(r=>r.projectId!==id);
  db.templates=db.templates.filter(t=>t.projectId!==id&&!roleIds.includes(t.roleId));
  db.tasks=db.tasks.filter(t=>t.projectId!==id);
  save();renderAll();
}

/* Roles */
$('showRoleForm').onclick=()=>$('roleForm').classList.remove('hidden');
$('cancelRole').onclick=()=>$('roleForm').classList.add('hidden');
$('roleForm').addEventListener('submit',e=>{
  e.preventDefault();
  const projectId=+$('roleProject').value;
  if(!projectId){alert('اختار المشروع الأول');return}
  db.roles.unshift({id:uid(),projectId,title:$('roleTitle').value.trim(),responsibilities:$('roleResponsibilities').value.trim(),createdAt:new Date().toISOString()});
  save();e.target.reset();$('roleForm').classList.add('hidden');renderAll();
});
function useRoleInGenerator(id){
  const r=db.roles.find(x=>x.id===id);if(!r)return;
  $('generatorProject').value=r.projectId;refreshGeneratorRoles();$('generatorRole').value=r.id;$('generatorResponsibilities').value=r.responsibilities;
  document.querySelector('[data-view="generator"]').click();
}
function deleteRole(id){
  if(!confirm('حذف المسمى الوظيفي؟'))return;
  db.roles=db.roles.filter(r=>r.id!==id);db.templates=db.templates.filter(t=>t.roleId!==id);save();renderAll();
}
$('generatorRole').addEventListener('change',()=>{
  const r=db.roles.find(x=>String(x.id)===$('generatorRole').value);
  $('generatorResponsibilities').value=r?.responsibilities||'';
});

/* KPI rules */
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
  const clean=text.toLowerCase();
  let found=[];
  rules.forEach(r=>{
    const matches=r.keys.filter(k=>clean.includes(k.toLowerCase())).length;
    if(matches>0)found.push({...r,score:matches});
  });
  found.sort((a,b)=>b.score-a.score);
  if(found.length<4){
    const fallbacks=[
      {name:'تنفيذ المهام الأساسية',type:'نتائج',weight:20,target:90,formula:'المهام المكتملة بالجودة وفي الموعد ÷ المهام المستحقة × 100',freq:'شهري'},
      {name:'جودة التنفيذ',type:'جودة',weight:20,target:90,formula:'متوسط تقييم جودة المخرجات وفق نموذج معتمد',freq:'شهري'},
      {name:'الالتزام الزمني',type:'SLA',weight:15,target:95,formula:'المهام المنجزة داخل المدة المحددة ÷ إجمالي المهام × 100',freq:'شهري'},
      {name:'التواصل والمتابعة',type:'متابعة',weight:15,target:90,formula:'المتابعات المنفذة والموثقة ÷ المتابعات المستحقة × 100',freq:'شهري'}
    ];
    fallbacks.forEach(f=>{if(!found.some(x=>x.name===f.name)&&found.length<6)found.push(f)});
  }
  found=found.slice(0,8);
  const sum=found.reduce((a,k)=>a+k.weight,0)||1;
  found=found.map((k,i)=>({...k,id:uid()+i,weight:Math.round(k.weight/sum*100)}));
  let diff=100-found.reduce((a,k)=>a+k.weight,0);
  if(found.length)found[0].weight+=diff;
  return found;
}

$('generateBtn').onclick=()=>{
  const txt=$('generatorResponsibilities').value.trim();
  if(!txt){alert('اكتب أو اختر مهام الوظيفة الأول');return}
  generatedKpis=generateKPIs(txt);
  const role=db.roles.find(r=>String(r.id)===$('generatorRole').value);
  $('templateName').value=role?`KPI - ${role.title}`:'KPI Template جديد';
  renderGenerated();
};
$('resetGenerated').onclick=()=>{generatedKpis=[];renderGenerated()};
function renderGenerated(){
  const box=$('generatedKpis');box.innerHTML='';
  $('generatedSummary').classList.toggle('hidden',generatedKpis.length===0);
  $('templateSaveBox').classList.toggle('hidden',generatedKpis.length===0);
  if(generatedKpis.length){
    $('generatedSummary').textContent=`تم توليد ${generatedKpis.length} KPIs | إجمالي الأوزان: ${generatedKpis.reduce((a,k)=>a+(+k.weight||0),0)}%`;
  }
  generatedKpis.forEach((k,i)=>{
    const el=document.createElement('div');el.className='kpi-card';el.draggable=true;
    el.innerHTML=`<div class="drag">☷</div>
      <div><div class="kpi-name">${k.name}</div><span class="tag">${k.type}</span><span class="tag">${k.freq}</span></div>
      <div><label>الوزن %</label><input type="number" value="${k.weight}" onchange="updateGenerated(${i},'weight',this.value)"></div>
      <div><label>Target %</label><input type="number" value="${k.target}" onchange="updateGenerated(${i},'target',this.value)"></div>
      <div><label>النوع</label><input value="${k.type}" onchange="updateGenerated(${i},'type',this.value)"></div>
      <div class="formula"><b>طريقة القياس:</b><br>${k.formula}</div>
      <button class="danger" onclick="removeGenerated(${i})">×</button>`;
    el.addEventListener('dragstart',e=>{el.classList.add('dragging');e.dataTransfer.setData('text/plain',i)});
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));
    el.addEventListener('dragover',e=>e.preventDefault());
    el.addEventListener('drop',e=>{e.preventDefault();const from=+e.dataTransfer.getData('text/plain');if(from===i)return;const item=generatedKpis.splice(from,1)[0];generatedKpis.splice(i,0,item);renderGenerated()});
    box.appendChild(el);
  });
}
window.updateGenerated=(i,f,v)=>{generatedKpis[i][f]=(f==='weight'||f==='target')?+v:v;renderGenerated()};
window.removeGenerated=i=>{generatedKpis.splice(i,1);renderGenerated()};

$('saveTemplate').onclick=()=>{
  if(!generatedKpis.length)return;
  const projectId=+$('generatorProject').value||null;
  const roleId=+$('generatorRole').value||null;
  db.templates.unshift({id:uid(),projectId,roleId,name:$('templateName').value.trim()||'KPI Template',kpis:JSON.parse(JSON.stringify(generatedKpis)),createdAt:new Date().toISOString()});
  save();renderAll();alert('تم حفظ الـTemplate');
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

/* Renderers */
function selectedProjectFilter(){return +$('globalProjectSelect').value||null}
function renderProjects(){
  const el=$('projectsList');el.innerHTML='';
  db.projects.forEach(p=>{
    const roles=db.roles.filter(r=>r.projectId===p.id).length;
    const templates=db.templates.filter(t=>t.projectId===p.id).length;
    const c=document.createElement('div');c.className='project-card';
    c.innerHTML=`<h4>${p.name}</h4><div class="meta">${p.industry||'بدون مجال محدد'}<br>${roles} وظائف • ${templates} Templates</div>
    <div class="card-actions"><button class="danger" onclick="deleteProject(${p.id})">حذف</button></div>`;
    el.appendChild(c);
  });
  $('emptyProjects').style.display=db.projects.length?'none':'block';
}
function renderRoles(){
  const pid=selectedProjectFilter();
  const roles=db.roles.filter(r=>!pid||r.projectId===pid);
  $('rolesList').innerHTML='';
  roles.forEach(r=>{
    const lines=(r.responsibilities||'').split('\n').filter(Boolean).length;
    const c=document.createElement('div');c.className='role-card';
    c.innerHTML=`<h4>${r.title}</h4><div class="meta">${projectName(r.projectId)}<br>${lines} مهام/مسؤوليات</div>
    <div class="card-actions"><button class="mini" onclick="useRoleInGenerator(${r.id})">Generate KPIs</button><button class="danger" onclick="deleteRole(${r.id})">حذف</button></div>`;
    $('rolesList').appendChild(c);
  });
  $('emptyRoles').style.display=roles.length?'none':'block';
}
function renderTemplates(){
  const pid=selectedProjectFilter();
  const list=db.templates.filter(t=>!pid||t.projectId===pid);
  $('templatesList').innerHTML='';
  list.forEach(t=>{
    const c=document.createElement('div');c.className='template-card';
    c.innerHTML=`<h4>${t.name}</h4><div class="meta">${projectName(t.projectId)} • ${roleName(t.roleId)}<br>${t.kpis.length} KPIs • ${t.kpis.reduce((a,k)=>a+(+k.weight||0),0)}%</div>
    <div class="card-actions"><button class="mini" onclick="loadTemplate(${t.id})">فتح</button><button class="danger" onclick="deleteTemplate(${t.id})">حذف</button></div>`;
    $('templatesList').appendChild(c);
  });
  $('emptyTemplates').style.display=list.length?'none':'block';
}
window.deleteTemplate=id=>{if(confirm('حذف الـTemplate؟')){db.templates=db.templates.filter(t=>t.id!==id);save();renderAll()}};
window.loadTemplate=id=>{
  const t=db.templates.find(x=>x.id===id);if(!t)return;
  $('generatorProject').value=t.projectId||'';refreshGeneratorRoles();$('generatorRole').value=t.roleId||'';
  const r=db.roles.find(x=>x.id===t.roleId);$('generatorResponsibilities').value=r?.responsibilities||'';
  generatedKpis=JSON.parse(JSON.stringify(t.kpis));$('templateName').value=t.name;document.querySelector('[data-view="generator"]').click();renderGenerated();
};
function renderTasks(){
  const pid=selectedProjectFilter();
  let list=db.tasks.filter(t=>(!pid||t.projectId===pid)&&(currentFilter==='all'||t.status===currentFilter));
  $('tasksList').innerHTML='';
  $('emptyTasks').style.display=list.length?'none':'block';
  list.forEach(t=>{
    const el=document.createElement('div');el.className='task-item '+(t.status==='done'?'done':'');
    el.innerHTML=`<div><div class="task-title">${t.title}</div><div class="task-meta">
      <span class="chip">${projectName(t.projectId)}</span>${t.owner?`<span class="chip">👤 ${t.owner}</span>`:''}
      <span class="chip ${t.priority==='عاجل'?'urgent':''}">⚑ ${t.priority}</span>${t.due?`<span class="chip">📅 ${t.due}</span>`:''}
      </div></div><div class="task-actions"><button class="done-btn" onclick="toggleTask(${t.id})">${t.status==='done'?'إعادة فتح':'تمت'}</button><button class="delete-btn" onclick="deleteTask(${t.id})">حذف</button></div>`;
    $('tasksList').appendChild(el);
  });
}
function renderDashboard(){
  const pid=selectedProjectFilter();
  $('dashboardProjects').textContent=pid?1:db.projects.length;
  $('dashboardRoles').textContent=db.roles.filter(r=>!pid||r.projectId===pid).length;
  $('dashboardTemplates').textContent=db.templates.filter(t=>!pid||t.projectId===pid).length;
  $('dashboardTasks').textContent=db.tasks.filter(t=>(!pid||t.projectId===pid)&&t.status==='open').length;
}
function renderAll(){
  refreshProjectSelects();renderProjects();renderRoles();renderTemplates();renderTasks();renderDashboard();
}
renderAll();
