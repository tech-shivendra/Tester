import {
  auth, db, doc, getDoc, addDoc, collection, getDocs, query, where,
  orderBy, updateDoc, serverTimestamp, increment, onAuthStateChanged, deleteDoc, writeBatch,
  storage, ref, uploadBytes, getDownloadURL
} from "./firebase-config.js";
import { renderHeader, initials, timeAgo } from "./shared.js";

renderHeader();

const id = new URLSearchParams(location.search).get("id") || location.hash.substring(1);
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
    const bugsSnap = await getDocs(query(collection(db, "bugs"), where("projectId", "==", id)));
    for (const bugDoc of bugsSnap.docs) {
      try {
        await deleteDoc(doc(db, "bugs", bugDoc.id));
      } catch (e) {
        console.warn("Skipping bug deletion (permissions):", e);
      }
    }
    await deleteDoc(doc(db, "projects", id));
    location.href = "home.html";
  } catch (err) {
    alert("Error deleting project: " + err.message);
  }
}

function renderBug(b) {
  const statusColors = { Open:"tag", Resolved:"tag tag-neon", Invalid:"tag", Duplicate:"tag" };
  const isOwner = currentUser && project && currentUser.uid === project.ownerId;
  const showActions = isOwner && b.status === "Open";

  return `
    <div class="bug">
      <div class="bug-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
        <div style="flex:1;min-width:240px">
          <div class="row" style="gap:8px;margin-bottom:8px">
            <span class="tag">${esc(b.type||'Bug')}</span>
            <span class="${statusColors[b.status]||'tag'}">${esc(b.status||'Open')}</span>
            ${b.points ? `<span class="badge-points">+${b.points}</span>` : ""}
            ${b.shoutout ? `<span class="badge-shoutout">📣 Shoutout</span>` : ""}
          </div>
          <div class="bug-title">${esc(b.title)}</div>
        </div>
        ${showActions ? `
          <div class="bug-actions" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            <button class="btn btn-primary btn-sm action-resolve" data-id="${b.id}" data-hunter="${b.hunterId}" style="padding:4px 8px;font-size:12px">✅ Resolve (+10)</button>
            <button class="btn btn-ghost btn-sm action-shoutout" data-id="${b.id}" data-hunter="${b.hunterId}" style="padding:4px 8px;font-size:12px">📣 Shoutout</button>
            <button class="btn btn-danger btn-sm action-invalid" data-id="${b.id}" style="padding:4px 8px;font-size:12px">❌ Invalid</button>
          </div>
        ` : ""}
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

function prettyStorageError(err) {
  // Firebase Storage error codes
  const code = err?.code || "";
  const map = {
    "storage/unauthorized":       "You don't have permission to upload files. Please sign in and try again.",
    "storage/canceled":           "Upload was cancelled.",
    "storage/unknown":            "An unknown error occurred during upload. Please try again.",
    "storage/object-not-found":   "File not found in storage.",
    "storage/bucket-not-found":   "Storage bucket not configured. Contact the site owner.",
    "storage/project-not-found":  "Firebase project not found. Contact the site owner.",
    "storage/quota-exceeded":     "Storage quota exceeded. Contact the site owner.",
    "storage/unauthenticated":    "You must be signed in to upload files.",
    "storage/retry-limit-exceeded":"Upload timed out. Check your connection and try again.",
    "storage/invalid-checksum":   "File upload failed (checksum mismatch). Please try again.",
    "storage/invalid-url":        "Invalid storage URL.",
    "storage/no-default-bucket":  "Firebase Storage is not configured. Contact the site owner.",
    "storage/cannot-slice-blob":  "Could not read the selected file. Please try a different image.",
    "storage/server-file-wrong-size": "Upload size mismatch. Please try again.",
  };
  if (map[code]) return map[code];
  // CORS / network failures surface as generic "storage/unknown" but sometimes as TypeError
  if (err instanceof TypeError || code === "" || !code) {
    return "Could not reach the upload server. This is usually a CORS or network issue — try submitting without a screenshot.";
  }
  return err.message || "Screenshot upload failed. Try submitting without a screenshot.";
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
          <div class="field"><label>Description &amp; repro steps</label><textarea class="textarea" id="b-body" required></textarea></div>
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

  // --- Cache DOM refs immediately after innerHTML is set ---
  const fileInput     = document.getElementById("b-image");
  const uploadBtn     = document.getElementById("image-upload-btn");
  const preview       = document.getElementById("image-preview");
  const previewImg    = document.getElementById("preview-img");
  const removeBtn     = document.getElementById("remove-image-btn");
  const cancelBtn     = document.getElementById("cancel-bug");
  const overlay       = document.getElementById("overlay");
  const bugMsg        = document.getElementById("bug-msg");
  const saveBtn       = document.getElementById("save-bug");

  // Helper: always re-query from the live DOM to survive any partial re-renders
  function getBugMsg()  { return document.getElementById("bug-msg"); }
  function getSaveBtn() { return document.getElementById("save-bug"); }

  function showBugError(text) {
    const el = getBugMsg();
    if (el) el.innerHTML = `<div class="error">${text}</div>`;
  }

  function clearBugMsg() {
    const el = getBugMsg();
    if (el) el.innerHTML = "";
  }

  function setBtnState(disabled, html) {
    const btn = getSaveBtn();
    if (btn) { btn.disabled = disabled; btn.innerHTML = html; }
  }

  uploadBtn.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });

  fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0] || null;
    if (selectedFile) {
      // Validate file type and size (5 MB cap)
      if (!selectedFile.type.startsWith("image/")) {
        showBugError("Please select an image file.");
        selectedFile = null;
        fileInput.value = "";
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        showBugError("Image must be smaller than 5 MB.");
        selectedFile = null;
        fileInput.value = "";
        return;
      }
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
    previewImg.src = "";
  });

  cancelBtn.onclick = () => { if (!submitting) m.innerHTML = ""; };
  overlay.onclick   = (e) => { if (!submitting && e.target.id === "overlay") m.innerHTML = ""; };

  document.getElementById("bug-form").onsubmit = async (e) => {
    e.preventDefault();
    clearBugMsg();
    setBtnState(true, '<div class="loader"></div>');
    submitting = true;

    try {
      const title = document.getElementById("b-title").value.trim();
      const body  = document.getElementById("b-body").value.trim();
      if (!title) throw new Error("Title is required.");
      if (!body)  throw new Error("Description is required.");

      let imageUrl = null;

      // Upload screenshot — isolated try/catch so we can give a clear error
      if (selectedFile) {
        try {
          const storageRef = ref(storage, `bugs/${Date.now()}_${selectedFile.name}`);
          const snapshot   = await uploadBytes(storageRef, selectedFile);
          imageUrl         = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.error("Screenshot upload failed:", uploadErr);
          // Re-enable button and show a clear, actionable message; don't submit without the image
          setBtnState(false, "Submit Report");
          submitting = false;
          showBugError(
            `<strong>Screenshot upload failed.</strong> ${prettyStorageError(uploadErr)}<br>
             <span style="font-size:12px;opacity:.8">You can remove the screenshot and submit without it.</span>`
          );
          return; // stop — do not save the bug without the intended screenshot
        }
      }

      const bugData = {
        projectId:   id,
        hunterId:    currentUser.uid,
        hunterName:  currentUser.displayName || currentUser.email,
        type:        document.getElementById("b-type").value,
        title,
        body,
        environment: document.getElementById("b-env").value.trim(),
        status:      "Open",
        createdAt:   serverTimestamp(),
      };
      if (imageUrl) bugData.imageUrl = imageUrl;

      await addDoc(collection(db, "bugs"), bugData);
      try {
        const qs = await getDocs(query(collection(db, "bugs"), where("projectId", "==", id), where("hunterId", "==", currentUser.uid)));
        const updates = { bugsFound: increment(1) };
        if (qs.empty) {
          updates.testers = increment(1);
        }
        await updateDoc(doc(db, "projects", id), updates);
      } catch (e) {
        console.warn("Could not update project stats (permissions):", e);
      }

      m.innerHTML = ""; // close modal on success
      load();           // refresh bug feed

    } catch (err) {
      console.error("Bug submission error:", err);
      const message = err?.message || String(err) || "Something went wrong.";
      setBtnState(false, "Submit Report");
      showBugError(message);
    } finally {
      submitting = false;
    }
  };
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

if (id) load();

document.addEventListener("click", async (e) => {
  const target = e.target;
  if (!target.classList.contains("action-resolve") &&
      !target.classList.contains("action-shoutout") &&
      !target.classList.contains("action-invalid")) return;

  const bugId = target.dataset.id;
  const hunterId = target.dataset.hunter;
  if (!bugId) return;

  target.disabled = true;
  const originalText = target.innerText;
  target.innerText = "...";

  try {
    if (target.classList.contains("action-resolve")) {
      await updateDoc(doc(db, "bugs", bugId), { status: "Resolved", points: 10 });
      try { await updateDoc(doc(db, "projects", id), { pointsAwarded: increment(10) }); } catch(e) {}
      if (hunterId) {
        try { await updateDoc(doc(db, "users", hunterId), { points: increment(10), bugsResolved: increment(1) }); } catch(e) {}
      }
    } else if (target.classList.contains("action-shoutout")) {
      await updateDoc(doc(db, "bugs", bugId), { shoutout: true });
      if (hunterId) {
        try { await updateDoc(doc(db, "users", hunterId), { shoutouts: increment(1) }); } catch(e) {}
      }
    } else if (target.classList.contains("action-invalid")) {
      await updateDoc(doc(db, "bugs", bugId), { status: "Invalid" });
    }
    load(); // Refresh the list
  } catch (err) {
    alert("Action failed: " + err.message);
    target.disabled = false;
    target.innerText = originalText;
  }
});
