import { db, collection, getDocs, query, orderBy, limit } from "./firebase-config.js";
import { renderHeader } from "./shared.js";

renderHeader("home");

async function loadProjects() {
  const root = document.getElementById("projects");
  try {
    const snap = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"), limit(12)));
    if (snap.empty) {
      root.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <h3>No projects yet</h3>
          <p>Be the first to post one — go on, the leaderboard is empty.</p>
          <a href="/submit.html" class="btn btn-primary" style="margin-top:24px">Post a Project</a>
        </div>`;
      return;
    }
    root.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      const tags = (p.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join(" ");
      const card = document.createElement("a");
      card.href = `project.html?id=${d.id}`;
      card.className = "card";
      card.innerHTML = `
        <div class="project-cover" style="background:linear-gradient(135deg,${p.color1||'#222'},${p.color2||'#D9FF00'})"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">${tags}</div>
        <h3 class="font-display" style="font-size:22px;margin:16px 0 8px">${escapeHtml(p.title||'Untitled')}</h3>
        <p class="muted" style="font-size:14px;line-height:1.5">${escapeHtml((p.description||'').slice(0,140))}${(p.description||'').length>140?'…':''}</p>
        <div class="project-stats">
          <div class="stat"><span class="stat-num">${p.bugsFound||0}</span><span class="stat-label">Bugs</span></div>
          <div class="stat"><span class="stat-num">${p.testers||0}</span><span class="stat-label">Testers</span></div>
          <div class="stat"><span class="stat-num">${p.pointsAwarded||0}</span><span class="stat-label">Points</span></div>
        </div>
      `;
      root.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Couldn't load projects</h3><p>${e.message}</p></div>`;
  }
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
loadProjects();
