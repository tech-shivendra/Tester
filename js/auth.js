import {
  auth, googleProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, updateProfile, ensureUserProfile, onAuthStateChanged
} from "./firebase-config.js";

const msgEl = document.getElementById("msg");
function showError(text) { msgEl.innerHTML = `<div class="error">${text}</div>`; }
function clearMsg() { msgEl.innerHTML = ""; }

// Redirect if already logged in
onAuthStateChanged(auth, (u) => {
  if (u && (location.pathname.endsWith("login.html") || location.pathname.endsWith("signup.html"))) {
    location.href = "profile.html";
  }
});

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.innerHTML = '<div class="loader"></div>';
    try {
      const email = document.getElementById("email").value.trim();
      const pw = document.getElementById("password").value;
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      await ensureUserProfile(cred.user);
      location.href = "profile.html";
    } catch (err) {
      showError(prettyError(err));
      btn.disabled = false; btn.innerHTML = "Sign In";
    }
  });
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.innerHTML = '<div class="loader"></div>';
    try {
      const name = document.getElementById("displayName").value.trim();
      const email = document.getElementById("email").value.trim();
      const pw = document.getElementById("password").value;
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      await updateProfile(cred.user, { displayName: name });
      await ensureUserProfile(cred.user);
      location.href = "profile.html";
    } catch (err) {
      showError(prettyError(err));
      btn.disabled = false; btn.innerHTML = "Create Account";
    }
  });
}

const gBtn = document.getElementById("google-btn");
if (gBtn) {
  gBtn.addEventListener("click", async () => {
    clearMsg();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(cred.user);
      location.href = "profile.html";
    } catch (err) {
      showError(prettyError(err));
    }
  });
}

function prettyError(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/user-not-found": "No account with that email.",
    "auth/wrong-password": "Wrong password.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in popup closed.",
    "auth/network-request-failed": "Network error. Check your connection."
  };
  return map[code] || err.message || "Something went wrong.";
}
