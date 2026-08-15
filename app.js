let sb, session, me, settings={}, students=[], staff=[], packages=[], classes=[], attendance=[], progress=[], invoices=[], payments=[], payroll=[], reminders=[], availability=[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toISOString().slice(0,10);
const monthBounds=()=>{const d=new Date();return [new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10)]};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const initials=n=>String(n||"U").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const money=n=>`${settings.currency||"RM"} ${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const role=()=>me?.role||"teacher";
const can=(...r)=>r.includes(role());
const st=s=>String(s||"").toLowerCase().replace(/\s+/g,"-");
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2400)}
function fail(error){console.error(error);toast(error?.message||"Something went wrong")}
function cleanPhone(p){return String(p||"").replace(/[^\d]/g,"").replace(/^0/,"60")}
function student(id){return students.find(x=>x.id===id)} function person(id){return staff.find(x=>x.id===id)}
function formObj(form){return Object.fromEntries(new FormData(form).entries())}

async function init(){
  const cfg=window.ACADEMY_CONFIG;
  if(!cfg||!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes("YOUR_PROJECT")){
    $("#setupScreen").classList.remove("hidden");return;
  }
  sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  const {data:{session:s}}=await sb.auth.getSession(); session=s;
  if(session) await enterApp(); else $("#authScreen").classList.remove("hidden");
  sb.auth.onAuthStateChange(async(_,s)=>{session=s;if(s&&!me)await enterApp();if(!s){me=null;$("#app").classList.add("hidden");$("#authScreen").classList.remove("hidden")}});
}
async function enterApp(){
  const {data,error}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
  if(error){$("#authScreen").classList.remove("hidden");$("#loginError").textContent="Login works, but this user has no staff profile yet. Ask an admin to add the profile in the profiles table.";return}
  me=data; $("#authScreen").classList.add("hidden");$("#app").classList.remove("hidden");
  applyRole(); await loadAll(); renderAll();
}
function applyRole(){
  $("#sideName").textContent=me.full_name;$("#sideRole").textContent=me.role;
  $("#sideAvatar").textContent=$("#topAvatar").textContent=initials(me.full_name);
  $$("[data-roles]").forEach(el=>{const roles=el.dataset.roles.split(",");el.classList.toggle("hidden",!roles.includes(role()))});
}
async function loadAll(){
  const queries=[
    sb.from("settings").select("*").limit(1).single(),
    sb.from("profiles").select("*").order("full_name"),
    can("admin","teacher","reception","accountant")?sb.from("students").select("*,class_packages(*)").order("created_at",{ascending:false}):Promise.resolve({data:[]}),
    sb.from("class_packages").select("*").eq("active",true).order("name"),
    can("admin","teacher","reception","accountant")?sb.from("classes").select("*").order("class_date",{ascending:false}).order("start_time",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","teacher","reception","accountant")?sb.from("attendance").select("*"):Promise.resolve({data:[]}),
    can("admin","teacher")?sb.from("progress_reports").select("*").order("report_date",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","reception","accountant")?sb.from("invoices").select("*").order("issue_date",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","reception","accountant")?sb.from("payments").select("*").order("payment_date",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","accountant")?sb.from("payroll").select("*").order("period_start",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","reception","accountant")?sb.from("reminders").select("*").order("created_at",{ascending:false}):Promise.resolve({data:[]}),
    can("admin","teacher","reception")?sb.from("teacher_availability").select("*"):Promise.resolve({data:[]})
  ];
  const r=await Promise.all(queries);
  if(r[0].error) fail(r[0].error);
  settings=r[0].data||{}; staff=r[1].data||[]; students=r[2].data||[]; packages=r[3].data||[]; classes=r[4].data||[]; attendance=r[5].data||[]; progress=r[6].data||[]; invoices=r[7].data||[]; payments=r[8].data||[]; payroll=r[9].data||[]; reminders=r[10].data||[];availability=r[11].data||[];
}
function goView(v){
  const nav=$(`.nav-btn[data-view="${v}"]`);if(nav?.classList.contains("hidden"))return;
  $$(".view").forEach(x=>x.classList.toggle("active",x.id===v));$$(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
  const names={dashboard:["Academy overview","Dashboard"],students:["CRM","Students"],schedule:["Timetable","Schedule"],attendance:["Class tracking","Attendance"],progress:["Academic records","Progress"],billing:["Finance","Billing"],payroll:["Compensation","Payroll"],staff:["Access control","Staff"],reminders:["Communication","Reminders"],reports:["Management","Reports"],settings:["Configuration","Settings"]};
  $("#pageEyebrow").textContent=names[v][0];$("#pageTitle").textContent=names[v][1];$("#sidebar").classList.remove("open");renderAll();
}
window.goView=goView;
$$(".nav-btn").forEach(b=>b.onclick=()=>goView(b.dataset.view));
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#refreshBtn").onclick=async()=>{await loadAll();renderAll();toast("Data refreshed")};
$("#globalAddBtn").onclick=()=>openModal("studentModal");

function openModal(id){
  populate(); const m=$("#"+id);if(!m)return;
  $("#overlay").classList.remove("hidden");m.classList.remove("hidden");
  if(id==="classModal")m.querySelector('[name="class_date"]').value=today();
  if(id==="progressModal")m.querySelector('[name="report_date"]').value=today();
  if(id==="paymentModal")m.querySelector('[name="payment_date"]').value=today();
}
window.openModal=openModal; window.closeModals=()=>{$("#overlay").classList.add("hidden");$$(".modal").forEach(m=>m.classList.add("hidden"))}

function populate(){
 const teachers=staff.filter(x=>["teacher","admin"].includes(x.role)&&x.status==="Active").map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join("");
 const studs=students.filter(x=>x.status==="Active").map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join("");
 ["classTeacher","availabilityTeacher"].forEach(id=>{if($("#"+id))$("#"+id).innerHTML=teachers});
 ["classStudent","progressStudent","invoiceStudent"].forEach(id=>{if($("#"+id))$("#"+id).innerHTML=studs});
 if($("#studentPackage"))$("#studentPackage").innerHTML=`<option value="">No package</option>`+packages.map(p=>`<option value="${p.id}">${esc(p.name)} — ${p.total_credits}h / ${money(p.price)}</option>`).join("");
 if($("#scheduleTeacher")){const old=$("#scheduleTeacher").value;$("#scheduleTeacher").innerHTML=`<option value="">All teachers</option>${teachers}`;$("#scheduleTeacher").value=old}
 const openInv=invoices.filter(i=>!["Paid","Cancelled"].includes(i.status));
 if($("#paymentInvoice"))$("#paymentInvoice").innerHTML=openInv.map(i=>`<option value="${i.id}">${esc(i.invoice_no)} — ${esc(student(i.student_id)?.full_name||"Student")} — ${money(balanceInvoice(i))} due</option>`).join("");
}
function paidForInvoice(id){return payments.filter(p=>p.invoice_id===id).reduce((a,p)=>a+Number(p.amount),0)}
function balanceInvoice(i){return Math.max(0,Number(i.total)-paidForInvoice(i.id))}
function invoiceStatus(i){const p=paidForInvoice(i.id);if(p>=Number(i.total))return"Paid";if(p>0)return"Partial";if(new Date(i.due_date+"T23:59:59")<new Date())return"Overdue";return i.status==="Draft"?"Draft":"Issued"}

function renderAll(){populate();renderDashboard();renderStudents();renderSchedule();renderAttendance();renderProgress();renderBilling();renderPayroll();renderStaff();renderReminders();renderReports();renderSettings()}
function renderDashboard(){
 $("#academyNameSide").textContent=settings.academy_name||"English Academy"; const h=new Date().getHours();$("#welcomeText").textContent=`Good ${h<12?"morning":h<18?"afternoon":"evening"}, ${me.full_name.split(" ")[0]} 👋`;
 $("#kpiStudents").textContent=students.filter(s=>s.status==="Active").length;
 const [a,b]=monthBounds(),mc=classes.filter(c=>c.class_date>=a&&c.class_date<=b);$("#kpiClasses").textContent=mc.length;
 const mp=payments.filter(p=>p.payment_date>=a&&p.payment_date<=b).reduce((x,p)=>x+Number(p.amount),0);$("#kpiRevenue").textContent=money(mp);
 const due=invoices.reduce((x,i)=>x+balanceInvoice(i),0);$("#kpiOutstanding").textContent=money(due);
 const dc=classes.filter(c=>c.class_date===today()).sort((x,y)=>x.start_time.localeCompare(y.start_time));
 $("#dashClasses").innerHTML=dc.length?dc.map(c=>`<div class="list-row"><div><strong>${c.start_time.slice(0,5)} · ${esc(c.title)}</strong><small>${esc(student(c.student_id)?.full_name||"Student")} · ${esc(person(c.teacher_id)?.full_name||"Teacher")}</small></div><span class="status ${st(c.status)}">${c.status}</span></div>`).join(""):`<div class="empty">No classes today.</div>`;
 const over=invoices.filter(i=>invoiceStatus(i)==="Overdue"),low=students.filter(s=>Number(s.credits_remaining)>0&&Number(s.credits_remaining)<=2);
 const alerts=[];if(over.length)alerts.push(`${over.length} overdue invoice${over.length>1?"s":""}`);if(low.length)alerts.push(`${low.length} student package${low.length>1?"s are":" is"} nearly finished`);if(!dc.length)alerts.push("No classes are scheduled today");if(!alerts.length)alerts.push("Everything looks up to date");
 $("#dashAlerts").innerHTML=alerts.map(x=>`<div class="list-row"><div><strong>${esc(x)}</strong><small>Review when convenient</small></div></div>`).join("");
 $("#dashStudents").innerHTML=students.slice(0,4).map(s=>`<div class="student-mini"><strong>${esc(s.full_name)}</strong><small>${esc(s.course)} · ${esc(s.level||"—")}</small></div>`).join("")||`<div class="empty">No student records.</div>`;
}
function renderStudents(){
 if(!$("#studentsBody"))return;const q=($("#studentSearch").value||"").toLowerCase(),fs=$("#studentStatus").value;
 const list=students.filter(s=>(!q||`${s.full_name} ${s.phone} ${s.email}`.toLowerCase().includes(q))&&(!fs||s.status===fs));
 $("#studentsBody").innerHTML=list.map(s=>`<tr><td><div class="person"><div class="mini-avatar">${initials(s.full_name)}</div><div><b>${esc(s.full_name)}</b><br><small>${esc(s.phone||"")}</small></div></div></td><td>${esc(s.course)}</td><td>${esc(s.level||"—")}</td><td>${esc(s.class_packages?.name||"—")}</td><td>${Number(s.credits_remaining||0).toFixed(1)}h</td><td><span class="status ${st(s.status)}">${s.status}</span></td><td>${new Date(s.created_at).toLocaleDateString()}</td><td>${can("admin","reception")?`<div class="action-group"><button class="action-btn" onclick="editStudent('${s.id}')">Edit</button><button class="delete-btn" onclick="deleteStudent('${s.id}')">Delete</button></div>`:"—"}</td></tr>`).join("")||`<tr><td colspan="8"><div class="empty">No students found.</div></td></tr>`;
}
$("#studentSearch").oninput=$("#studentStatus").onchange=renderStudents;

function renderSchedule(){
 if(!$("#scheduleGrid"))return;const d=$("#scheduleDate").value,t=$("#scheduleTeacher").value,ty=$("#scheduleType").value;
 const list=classes.filter(c=>(!d||c.class_date===d)&&(!t||c.teacher_id===t)&&(!ty||c.class_type===ty)).slice(0,120);
 $("#scheduleGrid").innerHTML=list.map(c=>`<article class="item-card"><div class="card-head"><span class="status ${st(c.class_type)}">${c.class_type}</span><span class="status ${st(c.status)}">${c.status}</span></div><h4>${esc(c.title)}</h4><p>${esc(student(c.student_id)?.full_name||"Student")}</p><div class="meta"><div><span>Date</span><b>${c.class_date}</b></div><div><span>Time</span><b>${c.start_time.slice(0,5)}</b></div><div><span>Teacher</span><b>${esc(person(c.teacher_id)?.full_name||"—")}</b></div><div><span>Duration</span><b>${c.duration_hours}h</b></div></div><div class="card-foot"><small>${esc(c.room||"Room TBA")}</small>${can("admin","reception","teacher")?`<button class="text-btn" onclick="changeClassStatus('${c.id}')">Change status</button>`:""}</div></article>`).join("")||`<div class="panel empty">No classes match this filter.</div>`;
}
["scheduleDate","scheduleTeacher","scheduleType"].forEach(id=>$("#"+id).onchange=renderSchedule);
window.changeClassStatus=async id=>{const c=classes.find(x=>x.id===id);let next=c.status==="Scheduled"?"Completed":c.status==="Completed"?"Cancelled":"Scheduled";const{error}=await sb.from("classes").update({status:next}).eq("id",id);if(error)return fail(error);await loadAll();renderAll();toast("Class updated")};

function renderAttendance(){
 const d=$("#attendanceDate").value||today(); if(!$("#attendanceDate").value)$("#attendanceDate").value=d;
 const list=classes.filter(c=>c.class_date===d&&c.status!=="Cancelled");
 $("#attendanceGrid").innerHTML=list.map(c=>{const a=attendance.find(x=>x.class_id===c.id&&x.student_id===c.student_id);return`<article class="item-card"><div class="card-head"><span class="status ${st(c.status)}">${c.status}</span><small>${c.start_time.slice(0,5)}</small></div><h4>${esc(c.title)}</h4><p>${esc(student(c.student_id)?.full_name||"Student")} · ${esc(person(c.teacher_id)?.full_name||"Teacher")}</p><div class="attendance-buttons">${["Present","Late","Absent","Excused"].map(x=>`<button class="${a?.status===x?"selected":""}" onclick="markAttendance('${c.id}','${c.student_id}','${x}')">${x}</button>`).join("")}</div></article>`}).join("")||`<div class="panel empty">No classes on this date.</div>`;
}
$("#attendanceDate").onchange=renderAttendance;
window.markAttendance=async(classId,studentId,status)=>{
 const existing=attendance.find(a=>a.class_id===classId&&a.student_id===studentId), payload={class_id:classId,student_id:studentId,status,marked_by:me.id,marked_at:new Date().toISOString()};
 const r=existing?await sb.from("attendance").update(payload).eq("id",existing.id):await sb.from("attendance").insert(payload);if(r.error)return fail(r.error);
 const c=classes.find(x=>x.id===classId),s=student(studentId);
 if(!existing&&["Present","Late"].includes(status)&&Number(s?.credits_remaining)>0){await sb.from("students").update({credits_remaining:Math.max(0,Number(s.credits_remaining)-Number(c.duration_hours))}).eq("id",studentId)}
 await sb.from("classes").update({status:"Completed"}).eq("id",classId);await loadAll();renderAll();toast("Attendance saved");
}

function renderProgress(){
 $("#progressGrid").innerHTML=progress.map(p=>`<article class="item-card"><div class="card-head"><b>${esc(student(p.student_id)?.full_name||"Student")}</b><small>${p.report_date}</small></div><div class="progress-scores">${["speaking","listening","reading","writing"].map(k=>`<div class="score"><b>${p[k]??"—"}</b><small>${k}</small></div>`).join("")}</div><p><b>Feedback:</b> ${esc(p.feedback)}</p><p><b>Next:</b> ${esc(p.goals||"—")}</p></article>`).join("")||`<div class="panel empty">No progress reports yet.</div>`;
}
function renderBilling(){
 const total=invoices.reduce((a,i)=>a+Number(i.total),0),paid=payments.reduce((a,p)=>a+Number(p.amount),0);$("#billInvoiced").textContent=money(total);$("#billPaid").textContent=money(paid);$("#billDue").textContent=money(Math.max(0,total-paid));
 $("#invoiceBody").innerHTML=invoices.map(i=>{const p=paidForInvoice(i.id),status=invoiceStatus(i);return`<tr><td><b>${esc(i.invoice_no)}</b></td><td>${esc(student(i.student_id)?.full_name||"Student")}</td><td>${i.issue_date}</td><td>${i.due_date}</td><td>${money(i.total)}</td><td>${money(p)}</td><td><span class="status ${st(status)}">${status}</span></td><td><button class="text-btn" onclick="invoicePDF('${i.id}')">Invoice</button>${p>0?` · <button class="text-btn" onclick="receiptPDF('${i.id}')">Receipt</button>`:""}</td></tr>`}).join("")||`<tr><td colspan="8"><div class="empty">No invoices yet.</div></td></tr>`;
}
function renderPayroll(){
 $("#payrollBody").innerHTML=payroll.map(p=>{const u=person(p.staff_id);return`<tr><td>${esc(u?.full_name||"Staff")}</td><td>${p.period_start} → ${p.period_end}</td><td>${p.teaching_hours}h</td><td>${money(p.hourly_rate)}</td><td>${money(p.adjustments)}</td><td><b>${money(p.net_pay)}</b></td><td><span class="status ${st(p.status)}">${p.status}</span></td><td><button class="text-btn" onclick="payslipPDF('${p.id}')">PDF</button></td></tr>`}).join("")||`<tr><td colspan="8"><div class="empty">No payroll runs yet.</div></td></tr>`;
}
function renderStaff(){
 $("#staffGrid").innerHTML=staff.map(u=>`<article class="item-card"><div class="card-head"><div class="mini-avatar">${initials(u.full_name)}</div><span class="status ${st(u.status)}">${u.status}</span></div><h4>${esc(u.full_name)}</h4><p>${esc(u.role)} · ${esc(u.email||"")}</p><div class="meta"><div><span>Hourly rate</span><b>${money(u.hourly_rate)}</b></div><div><span>Classes</span><b>${classes.filter(c=>c.teacher_id===u.id).length}</b></div></div><div class="card-foot"><span></span>${can("admin")?`<div class="action-group"><button class="action-btn" onclick="editStaff('${u.id}')">Edit</button>${u.id!==me.id&&u.role!=="admin"?`<button class="delete-btn" onclick="deleteStaff('${u.id}')">Delete</button>`:""}</div>`:""}</div></article>`).join("");
}
function renderReminders(){
 $("#reminderGrid").innerHTML=reminders.map(r=>`<article class="item-card"><div class="card-head"><span class="status ${st(r.status)}">${r.status}</span><small>${r.reminder_type}</small></div><h4>${esc(student(r.student_id)?.full_name||"Student")}</h4><p>${esc(r.message)}</p><div class="card-foot"><small>${esc(r.phone||"")}</small><button class="primary-btn" onclick="openWhatsApp('${r.id}')">Open WhatsApp</button></div></article>`).join("")||`<div class="panel empty">No reminders queued.</div>`;
}
\nwindow.editStudent=id=>{const s=student(id);if(!s)return;const f=$("#editStudentForm");["id","full_name","phone","email","course","level","status","guardian_name","guardian_phone","notes"].forEach(k=>{if(f.elements[k])f.elements[k].value=s[k]??""});openModal("editStudentModal")};\nwindow.deleteStudent=async id=>{const s=student(id);if(!s)return;if(!confirm(`Delete ${s.full_name}? This cannot be undone.`))return;const{error}=await sb.from("students").delete().eq("id",id);if(error)return fail(error);await loadAll();renderAll();toast("Student deleted")};\nwindow.editStaff=id=>{const u=person(id);if(!u)return;const f=$("#editStaffForm");["id","full_name","role","email","phone","hourly_rate","status"].forEach(k=>{if(f.elements[k])f.elements[k].value=u[k]??""});openModal("editStaffModal")};\nwindow.deleteStaff=async id=>{const u=person(id);if(!u)return;if(u.id===me.id||u.role==="admin")return toast("Admin accounts are protected");if(!confirm(`Delete ${u.full_name} from Dream Language Centre?`))return;const{error}=await sb.from("profiles").delete().eq("id",id);if(error)return fail(error);await loadAll();renderAll();toast("Staff profile deleted")};\n$("#editStudentForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target),id=f.id;delete f.id;const{error}=await sb.from("students").update(f).eq("id",id);if(error)return fail(error);closeModals();await loadAll();renderAll();toast("Student updated")};\n$("#editStaffForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target),id=f.id;delete f.id;f.hourly_rate=Number(f.hourly_rate||0);const{error}=await sb.from("profiles").update(f).eq("id",id);if(error)return fail(error);closeModals();await loadAll();renderAll();toast("Staff updated")};\nasync function cleanSlate(){if(!can("admin"))return;if(!confirm("Reset Dream Language Centre to a clean slate? Your Admin account, settings and package templates will stay."))return;const phrase=prompt("Type CLEAN SLATE to confirm.");if(phrase!=="CLEAN SLATE")return toast("Reset cancelled");const{error}=await sb.rpc("reset_academy_clean_slate");if(error)return fail(error);await loadAll();renderAll();toast("Dream Language Centre reset")};\n$("#cleanSlateBtn").onclick=cleanSlate;\n
function renderReports(){
 const counts={};students.forEach(s=>counts[s.course]=(counts[s.course]||0)+1);const max=Math.max(1,...Object.values(counts));$("#courseBars").innerHTML=Object.entries(counts).map(([k,v])=>`<div class="bar-row"><header><span>${esc(k)}</span><b>${v}</b></header><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join("");
 const at=attendance.length,pr=attendance.filter(a=>["Present","Late"].includes(a.status)).length;$("#reportAttendance").textContent=(at?Math.round(pr/at*100):0)+"%";
 const inv=invoices.reduce((a,i)=>a+Number(i.total),0),pay=payments.reduce((a,p)=>a+Number(p.amount),0);$("#reportCollection").textContent=(inv?Math.round(pay/inv*100):0)+"%";
 $("#reportHours").textContent=classes.filter(c=>c.status==="Completed").reduce((a,c)=>a+Number(c.duration_hours),0).toFixed(1)+"h";
}
function renderSettings(){
 if(!$("#settingsForm"))return;Object.keys(settings).forEach(k=>{const el=$("#settingsForm").elements[k];if(el)el.value=settings[k]??""})
}

$("#loginForm").onsubmit=async e=>{e.preventDefault();$("#loginError").textContent="";const f=formObj(e.target);const{error}=await sb.auth.signInWithPassword({email:f.email,password:f.password});if(error)$("#loginError").textContent=error.message};
$("#forgotBtn").onclick=async()=>{const email=$("#loginForm").elements.email.value;if(!email)return toast("Enter your email first");const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)return fail(error);toast("Password-reset email sent")};
$("#logoutBtn").onclick=()=>sb.auth.signOut();

$("#studentForm").onsubmit=async e=>{e.preventDefault();let f=formObj(e.target),pkg=packages.find(p=>p.id===f.package_id);if(!f.package_id)f.package_id=null;f.credits_remaining=pkg?pkg.total_credits:0;const{error}=await sb.from("students").insert(f);if(error)return fail(error);e.target.reset();closeModals();await loadAll();renderAll();toast("Student registered")};
$("#classForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target),n=f.recurrence==="none"?1:Number(f.recurrence.replace("weekly","")),group=n>1?crypto.randomUUID():null,rows=[];for(let i=0;i<n;i++){const d=new Date(f.class_date+"T12:00:00");d.setDate(d.getDate()+i*7);rows.push({title:f.title,class_type:f.class_type,teacher_id:f.teacher_id,student_id:f.student_id,class_date:d.toISOString().slice(0,10),start_time:f.start_time,duration_hours:Number(f.duration_hours),room:f.room,status:f.status,recurring_group:group,notes:f.notes,created_by:me.id})}const{error}=await sb.from("classes").insert(rows);if(error)return fail(error);e.target.reset();closeModals();await loadAll();renderAll();toast(`${n} class${n>1?"es":""} scheduled`)};
$("#availabilityForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target);f.weekday=Number(f.weekday);const{error}=await sb.from("teacher_availability").insert(f);if(error)return fail(error);closeModals();await loadAll();renderAll();toast("Availability saved")};
$("#progressForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target);["speaking","listening","reading","writing"].forEach(k=>f[k]=Number(f[k]));f.teacher_id=me.id;const{error}=await sb.from("progress_reports").insert(f);if(error)return fail(error);e.target.reset();closeModals();await loadAll();renderAll();toast("Progress report saved")};
$("#invoiceForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target),num=`${settings.invoice_prefix||"INV"}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,subtotal=Number(f.amount),discount=Number(f.discount||0),tax=Number(f.tax||0),total=Math.max(0,subtotal-discount+tax);const row={invoice_no:num,student_id:f.student_id,due_date:f.due_date,description:f.description,subtotal,discount,tax,total,status:"Issued",created_by:me.id};const{error}=await sb.from("invoices").insert(row);if(error)return fail(error);e.target.reset();closeModals();await loadAll();renderAll();toast("Invoice created")};
$("#paymentForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target);f.amount=Number(f.amount);f.received_by=me.id;const{error}=await sb.from("payments").insert(f);if(error)return fail(error);closeModals();await loadAll();const inv=invoices.find(i=>i.id===f.invoice_id),status=invoiceStatus(inv);await sb.from("invoices").update({status}).eq("id",inv.id);await loadAll();renderAll();toast("Payment recorded")};
$("#staffForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target);f.hourly_rate=Number(f.hourly_rate);const{error}=await sb.from("profiles").insert(f);if(error)return fail(error);closeModals();await loadAll();renderAll();toast("Staff profile added")};
$("#settingsForm").onsubmit=async e=>{e.preventDefault();const f=formObj(e.target);const{error}=await sb.from("settings").update({...f,updated_at:new Date().toISOString()}).eq("id",settings.id);if(error)return fail(error);await loadAll();renderAll();toast("Settings saved")};

$("#generatePayrollBtn").onclick=async()=>{const[a,b]=monthBounds(),teachers=staff.filter(x=>["teacher","admin"].includes(x.role)&&x.status==="Active"),rows=teachers.map(t=>{const h=classes.filter(c=>c.teacher_id===t.id&&c.status==="Completed"&&c.class_date>=a&&c.class_date<=b).reduce((x,c)=>x+Number(c.duration_hours),0),rate=Number(t.hourly_rate||0);return{staff_id:t.id,period_start:a,period_end:b,teaching_hours:h,hourly_rate:rate,base_pay:h*rate,adjustments:0,net_pay:h*rate,status:"Draft"}});const{error}=await sb.from("payroll").upsert(rows,{onConflict:"staff_id,period_start,period_end"});if(error)return fail(error);await loadAll();renderAll();toast("Payroll generated")};

$("#createRemindersBtn").onclick=async()=>{
 const rows=[];const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const td=tomorrow.toISOString().slice(0,10);
 classes.filter(c=>c.class_date===td&&c.status==="Scheduled").forEach(c=>{const s=student(c.student_id);if(s?.phone)rows.push({student_id:s.id,reminder_type:"Class reminder",phone:s.phone,related_id:c.id,message:`Hi ${s.full_name}, reminder that your ${c.title} class is tomorrow at ${c.start_time.slice(0,5)}. — ${settings.academy_name}`})});
 invoices.filter(i=>["Overdue","Issued","Partial"].includes(invoiceStatus(i))&&balanceInvoice(i)>0).forEach(i=>{const s=student(i.student_id);if(s?.phone)rows.push({student_id:s.id,reminder_type:"Payment reminder",phone:s.phone,related_id:i.id,message:`Hi ${s.full_name}, this is a friendly reminder that ${money(balanceInvoice(i))} is outstanding for invoice ${i.invoice_no}. Thank you. — ${settings.academy_name}`})});
 if(!rows.length)return toast("No reminders needed");const{error}=await sb.from("reminders").insert(rows);if(error)return fail(error);await loadAll();renderAll();toast(`${rows.length} reminders prepared`);
};
window.openWhatsApp=async id=>{const r=reminders.find(x=>x.id===id);window.open(`https://wa.me/${cleanPhone(r.phone)}?text=${encodeURIComponent(r.message)}`,"_blank","noopener");await sb.from("reminders").update({status:"Opened",sent_at:new Date().toISOString()}).eq("id",id);await loadAll();renderReminders()};

function pdfBase(title,number){
 const {jsPDF}=window.jspdf,doc=new jsPDF();doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text(settings.academy_name||"Dream Language Centre",20,22);doc.setFontSize(10);doc.setFont("helvetica","normal");doc.text(settings.address||"",20,29);doc.text(settings.phone||"",20,35);doc.setFontSize(18);doc.setFont("helvetica","bold");doc.text(title,190,22,{align:"right"});if(number){doc.setFontSize(10);doc.text(number,190,29,{align:"right"})}doc.line(20,42,190,42);return doc
}
window.invoicePDF=id=>{const i=invoices.find(x=>x.id===id),s=student(i.student_id),doc=pdfBase("INVOICE",i.invoice_no);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(`Bill to: ${s?.full_name||""}`,20,55);doc.text(`Issue date: ${i.issue_date}`,20,62);doc.text(`Due date: ${i.due_date}`,20,69);doc.text(i.description,20,84);doc.text(`Subtotal: ${money(i.subtotal)}`,190,84,{align:"right"});doc.text(`Discount: ${money(i.discount)}`,190,91,{align:"right"});doc.text(`Tax: ${money(i.tax)}`,190,98,{align:"right"});doc.setFont("helvetica","bold");doc.text(`Total: ${money(i.total)}`,190,108,{align:"right"});doc.text(`Paid: ${money(paidForInvoice(i.id))}`,190,116,{align:"right"});doc.text(`Balance: ${money(balanceInvoice(i))}`,190,124,{align:"right"});doc.save(`${i.invoice_no}.pdf`)};
window.receiptPDF=id=>{const i=invoices.find(x=>x.id===id),s=student(i.student_id),doc=pdfBase("RECEIPT",i.invoice_no);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(`Received from: ${s?.full_name||""}`,20,58);doc.text(`Invoice: ${i.invoice_no}`,20,66);doc.text(`Amount received: ${money(paidForInvoice(i.id))}`,20,78);doc.text(`Remaining balance: ${money(balanceInvoice(i))}`,20,86);doc.text("Thank you for your payment.",20,105);doc.save(`Receipt-${i.invoice_no}.pdf`)};
window.payslipPDF=id=>{const p=payroll.find(x=>x.id===id),u=person(p.staff_id),doc=pdfBase("PAYSLIP",`${p.period_start} — ${p.period_end}`);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text(`Employee: ${u?.full_name||""}`,20,58);doc.text(`Role: ${u?.role||""}`,20,66);doc.text(`Teaching hours: ${p.teaching_hours}`,20,82);doc.text(`Hourly rate: ${money(p.hourly_rate)}`,20,90);doc.text(`Base pay: ${money(p.base_pay)}`,20,98);doc.text(`Adjustments: ${money(p.adjustments)}`,20,106);doc.setFont("helvetica","bold");doc.text(`Net pay: ${money(p.net_pay)}`,20,118);doc.text(`Status: ${p.status}`,20,126);doc.save(`Payslip-${u?.full_name||"Staff"}-${p.period_start}.pdf`)};

$("#exportBtn").onclick=async()=>{const dump={exported_at:new Date().toISOString(),settings,students,staff,packages,classes,attendance,progress,invoices,payments,payroll,reminders,availability};const blob=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`academy-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModals()});
init();
