/** Department attendance overview rendered from existing admin aggregates. */
import { getAdminAttendance, getAdminDashboard, getAdminSettings } from "../api/admin-api.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField } from "../components/form-field.js";
import { createProgressBar } from "../components/progress-bar.js";
import { createSkeleton } from "../components/skeleton.js";
import { initAdminPage, setPageTitle } from "../core/layout.js";
const root=document.getElementById("page-content");let courses=[];let dashboard=null;let settings=null;let filter="";
/** Mounts the admin attendance page. */
async function start(){initAdminPage("attendance");if(!root||!document.querySelector(".app-shell"))return;setPageTitle("Attendance Tracking");root.append(createSkeleton({lines:7}));await load();}
/** Loads only existing department attendance, risk, and setting endpoints. */
async function load(){try{[courses,dashboard,settings]=await Promise.all([getAdminAttendance(),getAdminDashboard(),getAdminSettings()]);render();}catch(e){root.replaceChildren(createErrorState(e.message||"Attendance could not be loaded.",load));}}
/** Renders aggregate attendance rows and dashboard-provided risk records. */
function render(){root.replaceChildren();const p=document.createElement("section");p.className="page-stack";const title=document.createElement("h2");title.textContent="Attendance Tracking";const select=createFormField({label:"Course",name:"course",options:[{value:"",text:"All courses"},...courses.map(c=>({value:c.course_id,text:`${c.course_code} — ${c.course_title}`}))]});select.querySelector("select").value=filter;select.querySelector("select").addEventListener("change",()=>{filter=select.querySelector("select").value;render();});const visible=courses.filter(c=>!filter||c.course_id===filter);p.append(title,select,createDataTable({label:"Department attendance",emptyMessage:"No attendance records.",rows:visible,columns:[{key:"course_code",label:"Course"},{key:"avg_attendance_rate",label:"Attendance rate",render:r=>rate(r)},{key:"total_sessions",label:"Sessions"},{key:"at_risk_count",label:"At risk"}]}));const h=document.createElement("h2");h.textContent=`At or over ${settings.absence_warning_threshold} absences`;const risk=dashboard.at_risk_students.filter(x=>!filter||visible.some(c=>c.course_code===x.course_code));p.append(h,risk.length?createDataTable({label:"At-risk students",emptyMessage:"No students at risk.",rows:risk,columns:[{key:"full_name",label:"Student"},{key:"course_code",label:"Course"},{key:"absence_count",label:"Absences",render:r=>`${r.absence_count} / ${settings.absence_warning_threshold}`}]}):createEmptyState("No students have reached the absence threshold."));root.append(p);}
/** Combines an aqua native progress bar and tabular percentage. */
function rate(row){const box=document.createElement("div");box.className="page-stack";box.append(createProgressBar(row.avg_attendance_rate,`${row.course_code} attendance`),Object.assign(document.createElement("span"),{className:"tabular-nums",textContent:`${row.avg_attendance_rate}%`}));return box;}
start();
