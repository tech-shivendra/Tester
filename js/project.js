import {
  auth, db, doc, getDoc, addDoc, collection, getDocs, query, where,
  orderBy, updateDoc, serverTimestamp, increment, onAuthStateChanged, deleteDoc,
  storage, ref, uploadBytes, getDownloadURL
} from "./firebase-config.js";
import { renderHeader, initials, timeAgo } from "./shared.js";

renderHeader();

const id = new URLSearchParams(location.search).get("id");
if (!id) { document.getElementById("project-root").innerHTML = `<div class="empty"><h3>Missing project id</h3></div>`; }

let currentUser = null;
let project = null;
onAuthStateChanged(auth, (u) => { currentUser = u; if (project) renderHead(); });

async function load() {
  const root = document.getElementById("project-root");
  try {
    const snap = await getDoc(doc(db, "projects", id));
    if (!snap.exists()) { root.innerHTML = `<div class="empty"><h3>Project not found</h3></div>`; return; }
    project = { id: snap.id, ...snap.data() };

    const bugsSnap = await getDocs(query(collection(db, "bugs"), where("projectId", "==", id), orderBy("createdAt", "desc")));
    const bugs = []; bugsSnap.forEach(d => bugs.push({ id: d.id, ...d.data() }));

    root.innerHTML = `
      <div id="project-head"></div>
      <div class="grid" style="grid-template-columns:1fr;margin-top:48px;gap:48px">
        <div>
          <div class="between" style="margin-bottom:24px">
            <h2 class="font-display" style="font-size:28px">Bug Feed <span class="muted" style="font-size:18px">(${bugs.length})</span></h2>
            <button class="btn btn-primary" id="report-btn">+ Report a Bug</button>
          </div>
          <div id="bugs">
            ${bugs.length === 0
              ? `<div class="empty card"><h3>No bugs reported yet</h3><p>Be the first to break it.</p></div>`
              : bugs.map(renderBug).join("")}
          </div>
        </div>
      </div>
    `;
    renderHead();
    document.getElementById("report-btn").onclick = openModal;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="empty"><h3>Couldn't load project</h3><p>${e.message}</p></div>`;
  }
}

function renderHead() {
  const head = document.getElementById("project-head");
  if (!head || !project) return;
  const tags = (project.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(" ");
  const isOwner = currentUser && currentUser.uid === project.ownerId;
  head.innerHTML = `
    <div class="card card-pad-lg">
      <div class="row" style="gap:8px;flex-wrap:wrap">${tags}</div>
      <h1 class="font-display" style="font-size:48px;margin-top:16px;letter-spacing:-.03em">${esc(project.title)}</h1>
      <p class="muted" style="margin-top:16px;font-size:17px;line-height:1.6;max-width:720px">${esc(project.description)}</p>
      <div class="row" style="margin-top:24px;flex-wrap:wrap;gap:12px">
        ${project.liveUrl ? `<a href="${esc(project.liveUrl)}" target="_blank" rel="noopener" class="btn btn-primary">↗ Live Demo</a>` : ""}
        ${project.repoUrl ? `<a href="${esc(project.repoUrl)}" target="_blank" rel="noopener" class="btn btn-ghost">⌥ Repository</a>` : ""}
        ${isOwner ? `<button id="delete-project-btn" class="btn btn-danger">🗑 Delete Project</button>` : ""}
        <span class="muted" style="margin-left:auto;font-size:13px">by ${esc(project.ownerName || 'unknown')}</span>
      </div>
      <div class="project-stats">
        <div class="stat"><span class="stat-num">${project.bugsFound||0}</span><span class="stat-label">Bugs Found</span></div>
        <div class="stat"><span class="stat-num">${project.testers||0}</span><span class="stat-label">Testers</span></div>
        <div class="stat"><span class="stat-num">${project.pointsAwarded||0}</span><span class="stat-label">Points Awarded</span></div>
      </div>
    </div>
  `;
  if (isOwner) {
    document.getElementById("delete-project-btn").addEventListener("click", deleteProject);
  }
}

async function deleteProject() {
  if (!confirm(`Are you sure you want to delete "${project.title}"? This action cannot be undone.`)) return;
  try {
    // Delete all bugs associated with this project
    const bugsSnap = await getDocs(query(collection(db, "bugs"), where("projectId", "==", id)));
    for (const bugDoc of bugsSnap.docs) {
      await deleteDoc(doc(db, "bugs", bugDoc.id));
    }
    // Delete the project
    await deleteDoc(doc(db, "projects", id));
    // Redirect to home
    location.href = "home.html";
  } catch (err) {
    alert("Error deleting project: " + err.message);
  }
}

function renderBug(b) {
  const statusColors = { Open:"tag", Resolved:"tag tag-neon", Invalid:"tag", Duplicate:"tag" };
  return `
    <div class="bug">
      <div class="bug-head">
        <div style="flex:1;min-width:240px">
          <div class="row" style="gap:8px;margin-bottom:8px">
            <span class="tag">${esc(b.type||'Bug')}</span>
            <span class="${statusColors[b.status]||'tag'}">${esc(b.status||'Open')}</span>
            ${b.points ? `<span class="badge-points">+${b.points}</span>` : ""}
          </div>
          <div class="bug-title">${esc(b.title)}</div>
        </div>
      </div>
      <p class="muted" style="line-height:1.6;font-size:14px">${esc(b.body)}</p>
      ${b.imageUrl ? `<img src="${esc(b.imageUrl)}" alt="bug screenshot" style="max-width:100%;border-radius:12px;margin:16px 0;max-height:400px;object-fit:cover">` : ""}
      <div class="bug-meta">
        <div class="avatar avatar-sm" style="font-size:11px">${initials(b.hunterName)}</div>
        <span>${esc(b.hunterName||'anon')}</span>
        <span>·</span>
        <span>${esc(b.environment||'')}</span>
        <span>·</span>
        <span>${timeAgo(b.createdAt)}</span>
      </div>
    </div>
  `;
}

function openModal() {
  if (!currentUser) { location.href = "login.html"; return; }
  const m = document.getElementById("modal-root");
  m.innerHTML = `
    <div class="modal-overlay" id="overlay">
      <div class="modal">
        <h2>Report a bug</h2>
        <p class="muted" style="margin-bottom:24px;font-size:14px">Be specific. Include reproduction steps, environment, and attach a screenshot if possible.</p>
        <form id="bug-form">
          <div class="field">
            <label>Type</label>
            <select class="select" id="b-type">
              <option>UI/UX</option><option>Logical</option><option>Security</option><option>Performance</option>
            </select>
          </div>
          <div class="field"><label>Title</label><input class="input" id="b-title" required maxlength="120"/></div>
          <div class="field"><label>Description & repro steps</label><textarea class="textarea" id="b-body" required></textarea></div>
          <div class="field"><label>Environment</label><input class="input" id="b-env" placeholder="Chrome 124 / macOS 14.4"/></div>
          <div class="field">
            <label>Attach screenshot (optional)</label>
            <div class="file-input-wrapper">
              <input type="file" id="b-image" accept="image/*" style="display:none"/>
              <button type="button" id="image-upload-btn" class="btn btn-ghost" style="width:100%;justify-content:center">📷 Choose Image</button>
            </div>
            <div id="image-preview" style="margin-top:12px;display:none">
              <img id="preview-img" style="max-width:100%;border-radius:8px;max-height:200px;object-fit:cover"/>
              <button type="button" id="remove-image-btn" class="btn btn-danger" style="margin-top:8px;width:100%">Remove Image</button>
            </div>
          </div>
          <div id="bug-msg"></div>
          <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">
            <button type="button" class="btn btn-ghost" id="cancel-bug">Cancel</button>
            <button type="submit" class="btn btn-primary" id="save-bug">Submit Report</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  let selectedFile = null;
  let submitting = false;
  const fileInput = document.getElementById("b-image");
  const uploadBtn = document.getElementById("image-upload-btn");
  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const removeBtn = document.getElementById("remove-image-btn");
  const cancelBtn = document.getElementById("cancel-bug");
  const overlay = document.getElementById("overlay");
  const bugMsg = document.getElementById("bug-msg");
  const safeSetBugMsg = (html) => { if (bugMsg) bugMsg.innerHTML = html; };
  
  uploadBtn.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
  
  fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        previewImg.src = evt.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(selectedFile);
    }
  });
  
  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    selectedFile = null;
    fileInput.value = "";
    preview.style.display = "none";
  });
  
  cancelBtn.onclick = () => { if (!submitting) m.innerHTML = ""; };
  overlay.onclick = (e) => { if (!submitting && e.target.id === "overlay") m.innerHTML = ""; };
  
  document.getElementById("bug-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("save-bug");
    const safeSetBtnState = (disabled, html) => { if (btn) { btn.disabled = disabled; btn.innerHTML = html; } };
    safeSetBtnState(true, '<div class="loader"></div>');
    submitting = true;
    try {
      safeSetBugMsg("");

      let imageUrl = null;
      
      // Upload image if selected
      if (selectedFile) {
        const storageRef = ref(storage, `bugs/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const title = document.getElementById("b-title").value.trim();
      const body = document.getElementById("b-body").value.trim();
      if (!title) throw new Error("Title is required.");
      if (!body) throw new Error("Description is required.");
      
      const bugData = {
        projectId: id,
        hunterId: currentUser.uid,
        hunterName: currentUser.displayName || currentUser.email,
        type: document.getElementById("b-type").value,
        title,
        body,
        environment: document.getElementById("b-env").value.trim(),
        status: "Open",
        createdAt: serverTimestamp()
      };
      
      if (imageUrl) {
        bugData.imageUrl = imageUrl;
      }
      
      await addDoc(collection(db, "bugs"), bugData);
      await updateDoc(doc(db, "projects", id), { bugsFound: increment(1) });
      m.innerHTML = "";
      load();
    } catch (err) {
      const message = (err && err.message) ? err.message : String(err);
      safeSetBugMsg(`<div class="error">${message}</div>`);
      safeSetBtnState(false, "Submit Report");
    } finally {
      submitting = false;
    }
  };
}

function esc(s){return String(s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

if (id) load();
