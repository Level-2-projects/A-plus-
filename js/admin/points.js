/** Department points leaderboard rendered from the current-month admin route. */
import { getAdminPoints } from "../api/admin-api.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createSkeleton } from "../components/skeleton.js";
import { initAdminPage, setPageTitle } from "../core/layout.js";
const root=document.getElementById("page-content");
/** Mounts the department points page. */
async function start(){initAdminPage("points");if(!root||!document.querySelector(".app-shell"))return;setPageTitle("Points Leaderboard");root.append(createSkeleton({lines:6}));await load();}
/** Loads the current month ranking available from the API. */
async function load(){try{render(await getAdminPoints());}catch(e){root.replaceChildren(createErrorState(e.message||"Points could not be loaded.",load));}}
/** Renders top-three medals and the full current-month table. */
function render(rows){root.replaceChildren();const p=document.createElement("section");p.className="page-stack";const h=document.createElement("h2");h.textContent="Points this month";const top=document.createElement("section");top.className="card dashboard-section";const th=document.createElement("h2");th.textContent="Top 3";top.append(th,createLeaderboard(rows.slice(0,3).map(r=>({name:r.full_name,points:r.points,rank:r.rank})),"No points this month."));p.append(h,top,rows.length?createDataTable({label:"Department points ranking",emptyMessage:"No points this month.",rows,columns:[{key:"rank",label:"Rank"},{key:"full_name",label:"Student"},{key:"points",label:"Points",render:r=>Object.assign(document.createElement("span"),{className:"tabular-nums",textContent:String(r.points)})}]}):createEmptyState("No points this month."));root.append(p);}
start();
