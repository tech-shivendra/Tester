import { db, collection, getDocs, query, orderBy, limit } from "./firebase-config.js";
import { renderHeader, initials } from "./shared.js";

renderHeader("leaderboard");

(async () => {
  const root = document.getElementById("lb-root");
  try {
    const snap = await getDocs(query(collection(db, "users"), orderBy("points", "desc"), limit(50)));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));

    if (users.length === 0) {
      root.innerHTML = `<div class="empty"><h3>No hunters yet</h3><p>Be the first to file a bug.</p></div>`;
      return;
    }

    const [first, ...rest] = users;
    let html = `
      <div class="podium">
        <div class="num">#1</div>
        <div class="avatar avatar-lg" style="background:rgba(0,0,0,.2);color:#000">${first.photoURL ? `<img src="${first.photoURL}">` : initials(first.displayName)}</div>
        <div style="flex:1;min-width:200px">
          <div class="font-display" style="font-size:28px">${esc(first.displayName||'Anonymous')}</div>
          <div style="opacity:.7;font-size:14px">@${esc(first.handle||'')}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,auto);gap:24px">
          <div><div class="font-display" style="font-size:24px">${(first.points||0).toLocaleString()}</div><div style="font-size:11px;opacity:.7;text-transform:uppercase">Points</div></div>
          <div><div class="font-display" style="font-size:24px">${first.bugsResolved||0}</div><div style="font-size:11px;opacity:.7;text-transform:uppercase">Resolved</div></div>
          <div><div class="font-display" style="font-size:24px">${first.shoutouts||0}</div><div style="font-size:11px;opacity:.7;text-transform:uppercase">Shouts</div></div>
        </div>
      </div>
      <div class="lb-table">
        <div class="lb-row head">
          <div>Rank</div><div>Hunter</div>
          <div class="right hide-sm">Points</div>
          <div class="right hide-sm">Resolved</div>
          <div class="right">Shouts</div>
        </div>`;

    rest.forEach((u, i) => {
      html += `
        <div class="lb-row">
          <div class="rank">${i+2}</div>
          <div class="row">
            <div class="avatar avatar-sm">${u.photoURL ? `<img src="${u.photoURL}">` : initials(u.displayName)}</div>
            <div>
              <div style="font-weight:500">${esc(u.displayName||'Anonymous')}</div>
              <div class="muted" style="font-size:12px">@${esc(u.handle||'')}</div>
            </div>
          </div>
          <div class="right hide-sm">${(u.points||0).toLocaleString()}</div>
          <div class="right hide-sm muted">${u.bugsResolved||0}</div>
          <div class="right neon">${u.shoutouts||0}</div>
        </div>`;
    });
    html += `</div>`;
    root.innerHTML = html;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="empty"><h3>Couldn't load leaderboard</h3><p>${e.message}</p></div>`;
  }
})();

function esc(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
