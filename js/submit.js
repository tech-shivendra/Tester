import { db, auth, addDoc, collection, serverTimestamp } from "./firebase-config.js";
import { renderHeader, requireAuth } from "./shared.js";

renderHeader();

(async () => {
  const user = await requireAuth();
  const form = document.getElementById("submit-form");
  const msg = document.getElementById("msg");
  const palette = ["#D9FF00","#0000EE","#1E1E1E","#FF4D4D","#9CC700","#222"];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerHTML = "";
    const btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.innerHTML = '<div class="loader"></div>';
    try {
      const data = {
        ownerId: user.uid,
        ownerName: user.displayName || user.email,
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        tags: document.getElementById("tags").value.split(",").map(s=>s.trim()).filter(Boolean),
        liveUrl: document.getElementById("liveUrl").value.trim(),
        repoUrl: document.getElementById("repoUrl").value.trim(),
        bugsFound: 0, testers: 0, pointsAwarded: 0,
        color1: palette[Math.floor(Math.random()*palette.length)],
        color2: palette[Math.floor(Math.random()*palette.length)],
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, "projects"), data);
      location.href = `project.html?id=${ref.id}`;
    } catch (err) {
      msg.innerHTML = `<div class="error">${err.message}</div>`;
      btn.disabled = false; btn.innerHTML = "Publish Project";
    }
  });
})();
