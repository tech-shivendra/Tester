import { auth, db, onAuthStateChanged, signOut, doc, getDoc, ensureUserProfile } from "./firebase-config.js";

export function initials(name) {
  if (!name) return "?";
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
}

export function renderHeader(activePage = "") {
  const header = document.getElementById("site-header");
  if (!header) return;
  header.innerHTML = `
    <div class="header-inner">
      <a href="home.html" class="logo">
        <span class="logo-mark">D</span>
        <span>DevCheck</span>
      </a>
      <div class="search">
        <input type="text" placeholder="Search projects, hunters, bugs..." />
      </div>
      <nav class="nav">
        <a href="leaderboard.html" class="${activePage==='leaderboard'?'active':''}">Leaderboard</a>
        <a href="submit.html" class="btn btn-primary" style="padding:8px 18px">Post a Project</a>
        <span id="user-slot"></span>
      </nav>
    </div>
  `;
  onAuthStateChanged(auth, async (user) => {
    const slot = document.getElementById("user-slot");
    if (!slot) return;
    if (user) {
      const data = await ensureUserProfile(user);
      slot.innerHTML = `
        <a href="profile.html" class="icon-btn" title="${data.displayName}" style="font-family:'Lexend',sans-serif;font-weight:700;color:var(--neon)">
          ${initials(data.displayName)}
        </a>
      `;
    } else {
      slot.innerHTML = `<a href="login.html" class="btn btn-ghost" style="padding:8px 16px">Sign In</a>`;
    }
  });
}

export function requireAuth(redirect = "login.html") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = redirect;
      } else {
        resolve(user);
      }
    });
  });
}

export function timeAgo(ts) {
  if (!ts) return "just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "home.html";
}
window.devcheckLogout = logout;
