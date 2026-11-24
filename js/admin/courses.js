/** Department course catalogue backed by the existing admin API. */
import { createAdminCourse, getAdminCourses, getAdminDoctors, updateAdminCourse } from "../api/admin-api.js";
import { createDataTable } from "../components/data-table.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { showToast } from "../components/toast.js";
import { initAdminPage, setPageTitle } from "../core/layout.js";
const root=document.getElementById("page-content");let courses=[];let doctors=[];
/** Mounts the course catalogue. */
async function start(){initAdminPage("courses");if(!root||!document.querySelector(".app-shell"))return;setPageTitle("Department Courses");root.append(createSkeleton({lines:7}));await load();}
/** Loads scoped course and doctor data. */
async function load(){try{[courses,doctors]=await Promise.all([getAdminCourses(),getAdminDoctors()]);render();}catch(e){root.replaceChildren(createErrorState(e.message||"Courses could not be loaded.",load));}}
/** Renders responsive course table. */
function render(){root.replaceChildren();const p=document.createElement("section");p.className="page-stack";const h=document.createElement("div");h.className="course-work-row";const t=document.createElement("h2");t.textContent="Department Courses";h.append(t,btn("Create course","btn btn-primary",()=>form()));p.append(h,createDataTable({label:"Department courses",emptyMessage:"No courses available.",rows:courses,columns:[{key:"code",label:"Code"},{key:"title",label:"Course"},{key:"doctor",label:"Doctor"},{key:"student_count",label:"Enrolled"},{key:"color",label:"Color",render:r=>dot(r.color)},{key:"actions",label:"Actions",render:r=>btn("Edit","btn btn-secondary",()=>form(r))}]}));root.append(p);}
/** Creates plain button actions. */function btn(label,cn,fn){const b=document.createElement("button");b.type="button";b.className=cn;b.textContent=label;b.addEventListener("click",fn);return b;}
/** Renders the course-color indicator without inline styling. */function dot(color){const s=document.createElement("span");s.className="status status-info";s.textContent=color;return s;}
/** Opens the existing create/update course form. */function form(course){const d=document.createElement("dialog");d.className="confirm-dialog";const f=document.createElement("form");f.className="confirm-dialog__form";const h=document.createElement("h2");h.textContent=course?"Edit course":"Create course";const fields=[createFormField({label:"Code",name:"code",required:!course}),createFormField({label:"Course name",name:"title",required:true}),createFormField({label:"Doctor",name:"doctor_id",required:true,options:doctors.map(x=>({value:x.id,text:x.full_name}))}),createFormField({label:"Color",name:"color",type:"color"})];fields.forEach(x=>{const i=x.querySelector("input,select");if(course)i.value=course[i.name]||"";});const m=document.createElement("p");m.className="form-message";m.hidden=true;const save=Object.assign(document.createElement("button"),{type:"submit",className:"btn btn-primary",textContent:"Save"});f.append(h,...fields,m,save);d.append(f);document.body.append(d);d.showModal();d.addEventListener("close",()=>d.remove(),{once:true});f.addEventListener("submit",async e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(f));course?await updateAdminCourse(course.id,data):await createAdminCourse(data);d.close();showToast("Course saved.",{kind:"success"});await load();}catch(err){showFieldErrors(f,err,m);}});}
start();
