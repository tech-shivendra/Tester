import {
  auth, db, doc, getDoc, updateDoc, collection, getDocs, query, orderBy
} from "./firebase-config.js";
import { renderHeader, requireAuth, initials, logout } from "./shared.js";

renderHeader("profile");

(async () => {
  const user = await requireAuth();
  const root = document.getElementById("profile-root");

  // Fetch profile + compute rank
  const profileRef = doc(db, "users", user.uid);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.data() || {};

  const allUsersSnap = await getDocs(query(collection(db, "users"), orderBy("points", "desc")));
  let rank = 0;
  let total = 0;
  allUsersSnap.forEach((d, i) => {
    total++;
    if (d.id === user.uid) rank = total;
  });

  let editing = false;
  function render() {
    root.innerHTML = `
      <div class="card card-pad-lg">
        <div class="profile-hero">
          <div class="avatar avatar-lg" style="width:120px;height:120px;font-size:48px">
            ${profile.photoURL ? `<img src="${profile.photoURL}" alt="">` : initials(profile.displayName)}
          </div>
          <div style="flex:1;min-width:240px">
            <div class="rank-badge">🏆 Rank #${rank} of ${total}</div>
            ${editing ? `
              <input class="input" id="f-name" value="${escapeHtml(profile.displayName||'')}" style="margin-top:16px;font-size:24px;font-family:'Lexend',sans-serif;font-weight:700"/>
              <input class="input" id="f-handle" value="${escapeHtml(profile.handle||'')}" style="margin-top:8px" placeholder="handle"/>
            ` : `
              <h1 class="font-display" style="font-size:36px;margin-top:16px">${escapeHtml(profile.displayName||'Anonymous')}</h1>
              <p class="muted" style="margin-top:4px">@${escapeHtml(profile.handle||'')} · ${escapeHtml(profile.email||'')}</p>
            `}
          </div>
          <div class="row" style="gap:8px">
            ${editing
              ? `<button class="btn btn-primary" id="save-btn">Save</button>
                 <button class="btn btn-ghost" id="cancel-btn">Cancel</button>`
              : `<button class="btn btn-ghost" id="edit-btn">✎ Edit Profile</button>
                 <button class="btn btn-danger" id="logout-btn">Sign Out</button>`}
          </div>
        </div>

        <div style="margin-top:32px">
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);font-weight:600">Bio</label>
          ${editing
            ? `<textarea class="textarea" id="f-bio" style="margin-top:8px" placeholder="Tell the community what you hunt for...">${escapeHtml(profile.bio||'')}</textarea>`
            : `<p style="margin-top:8px;line-height:1.6">${escapeHtml(profile.bio || 'No bio yet — add one to tell the community what you hunt for.')}</p>`}
        </div>

        <div class="stats-row">
          <div class="stat-card"><div class="num">${(profile.points||0).toLocaleString()}</div><div class="lbl">Points</div></div>
          <div class="stat-card"><div class="num">${profile.bugsResolved||0}</div><div class="lbl">Bugs Resolved</div></div>
          <div class="stat-card"><div class="num">${profile.shoutouts||0}</div><div class="lbl">Shoutouts</div></div>
          <div class="stat-card"><div class="num">#${rank}</div><div class="lbl">Global Rank</div></div>
        </div>
      </div>
    `;

    if (editing) {
      document.getElementById("save-btn").onclick = save;
      document.getElementById("cancel-btn").onclick = () => { editing = false; render(); };
    } else {
      document.getElementById("edit-btn").onclick = () => { editing = true; render(); };
      document.getElementById("logout-btn").onclick = logout;
    }
  }

  async function save() {
    const name = document.getElementById("f-name").value.trim();
    const handle = document.getElementById("f-handle").value.trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    const bio = document.getElementById("f-bio").value.trim();
    const btn = document.getElementById("save-btn");
    btn.disabled = true; btn.innerHTML = '<div class="loader"></div>';
    try {
      await updateDoc(profileRef, { displayName: name, handle, bio });
      profile.displayName = name; profile.handle = handle; profile.bio = bio;
      editing = false; render();
    } catch (e) {
      alert("Couldn't save: " + e.message);
      btn.disabled = false; btn.innerHTML = "Save";
    }
  }

  render();
})();

function escapeHtml(s){return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
