const SUPABASE_URL = "https://oinxnxmutxufkwwqsfms.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbnhueG11dHh1Zmt3d3FzZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjQyNTIsImV4cCI6MjA5NzE0MDI1Mn0.Orf1dsaPoRNUopsTGQEYsJlulcbaBvgsaDFuBSBAXto";

function togglePassword(id) {
  const el = document.getElementById(id);
  el.type = el.type === "password" ? "text" : "password";
}

document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const full_name        = document.getElementById("full_name").value.trim();
  const email            = document.getElementById("email").value.trim();
  const password         = document.getElementById("password").value.trim();
  const confirm_password = document.getElementById("confirm_password").value.trim();
  const errorMsg         = document.getElementById("errorMsg");
  const successMsg       = document.getElementById("successMsg");
  const registerBtn      = document.getElementById("registerBtn");

  errorMsg.textContent   = "";
  successMsg.textContent = "";

  if (password !== confirm_password) { errorMsg.textContent = "Passwords do not match."; return; }
  if (password.length < 6)           { errorMsg.textContent = "Password must be at least 6 characters."; return; }

  registerBtn.disabled    = true;
  registerBtn.textContent = "Creating account...";

  try {
    // Step 1: Try to sign up
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body:    JSON.stringify({ email, password, data: { full_name } })
    });
    const data = await res.json();

    if (!res.ok) {
      // Check if it's a duplicate user error
      const msg = data.msg || data.error_description || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        errorMsg.textContent = "Email already registered. Please login instead.";
      } else {
        errorMsg.textContent = msg || "Registration failed.";
      }
      return;
    }

    // Case 1: Email confirmation OFF — we get session + user immediately
    if (data.access_token && data.user?.id) {
      await upsertUser(data.user.id, email, full_name, data.access_token);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify({ id: data.user.id, email, full_name }));
      successMsg.textContent = "Account created! Redirecting...";
      setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
      return;
    }

    // Case 2: Email confirmation ON — identities:[] means already registered
    if (data.identities && data.identities.length === 0) {
      errorMsg.textContent = "Email already registered. Please login instead.";
      return;
    }

    // Case 3: Email confirmation ON — new user, needs to confirm email
    // Try immediate login anyway (works if confirmation is actually off despite response)
    const loginRes  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body:    JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.access_token) {
      const userId = loginData.user.id;
      await upsertUser(userId, email, full_name, loginData.access_token);
      localStorage.setItem("access_token", loginData.access_token);
      localStorage.setItem("user", JSON.stringify({ id: userId, email, full_name }));
      successMsg.textContent = "Account created! Redirecting...";
      setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
    } else {
      successMsg.textContent = "Account created! Please check your email to confirm, then login.";
    }

  } catch {
    errorMsg.textContent = "Failed to connect. Check your internet connection.";
  } finally {
    registerBtn.disabled    = false;
    registerBtn.textContent = "Create Account";
  }
});

async function upsertUser(id, email, full_name, userToken) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${userToken}`,
        "Prefer":        "resolution=merge-duplicates"
      },
      body: JSON.stringify({ id, email, full_name })
    });
  } catch (_) {}
}
