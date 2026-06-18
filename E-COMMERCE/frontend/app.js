const SUPABASE_URL = "https://oinxnxmutxufkwwqsfms.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbnhueG11dHh1Zmt3d3FzZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjQyNTIsImV4cCI6MjA5NzE0MDI1Mn0.Orf1dsaPoRNUopsTGQEYsJlulcbaBvgsaDFuBSBAXto";

// ─── STACK DATA STRUCTURE ────────────────────────────────────────────────────
class Stack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop()      { return this.items.pop(); }
  peek()     { return this.items[this.items.length - 1]; }
  isEmpty()  { return this.items.length === 0; }
  size()     { return this.items.length; }
}

const sessionStack = new Stack();

function renderStack() {
  const ul = document.getElementById("sessionStack");
  ul.innerHTML = "";
  sessionStack.items.forEach((entry, i) => {
    const li = document.createElement("li");
    li.className = entry.status;
    li.innerHTML = `<span>${entry.email}</span><span>${entry.time} ${i === sessionStack.size() - 1 ? "⬆ TOP" : ""}</span>`;
    ul.appendChild(li);
  });
}

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === "password" ? "text" : "password";
}

function undoLogin() {
  if (sessionStack.isEmpty()) return;
  sessionStack.pop();
  renderStack();
}

// ─── LOGIN FORM ──────────────────────────────────────────────────────────────
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");
  const loginBtn = document.getElementById("loginBtn");
  const now      = new Date().toLocaleTimeString();

  errorMsg.textContent = "";
  loginBtn.disabled    = true;
  loginBtn.textContent = "Logging in...";

  try {
    // 1. Sign in via Supabase Auth
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.access_token) {
      sessionStack.push({ email, time: now, status: "failed" });
      renderStack();
      errorMsg.textContent = data.error_description || data.msg || "Invalid email or password.";
      return;
    }

    const userToken = data.access_token;
    const userId    = data.user.id;
    const full_name = data.user.user_metadata?.full_name || email.split("@")[0];

    // 2. Upsert into users table using user's own token (ensures cart FK works)
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${userToken}`,
        "Prefer":        "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id: userId, email, full_name })
    });

    sessionStack.push({ email, time: now, status: "success" });
    renderStack();

    localStorage.setItem("access_token", userToken);
    localStorage.setItem("user", JSON.stringify({ id: userId, email, full_name }));

    setTimeout(() => { window.location.href = "dashboard.html"; }, 400);

  } catch {
    sessionStack.push({ email, time: now, status: "failed" });
    renderStack();
    errorMsg.textContent = "Failed to connect. Check your internet connection.";
  } finally {
    loginBtn.disabled    = false;
    loginBtn.textContent = "Login";
  }
});
