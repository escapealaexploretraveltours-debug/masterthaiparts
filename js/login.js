import { SHOP } from "./config.js";
import { auth, hasSupabase } from "./store.js";

const $ = (id) => document.getElementById(id);

// Live date & time (same as the original homepage)
function tick() { $("datetime").textContent = new Date().toLocaleString(); }
tick();
setInterval(tick, 1000);

$("shopName").textContent = SHOP.name;
$("shopAddress").textContent = SHOP.address;

const msg = $("errorMessage");
function showError(text) { msg.textContent = text; msg.hidden = !text; }

if (!hasSupabase) {
  $("setupNote").hidden = false;
  $("btn").disabled = true;
}

// Already signed in? Go straight to the dashboard.
auth.current().then((s) => { if (s) location.replace("dashboard.html"); }).catch(() => {});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = $("user").value;
  const pass = $("pass").value;
  if (!user.trim() || !pass) return showError("Both fields are required.");
  showError("");
  $("btn").disabled = true;
  try {
    const r = await auth.login(user, pass);
    if (r.ok) return location.assign("dashboard.html");
    if (r.error === "username") { $("user").value = ""; showError("Username not found."); }
    else { $("pass").value = ""; showError("Incorrect password."); }
  } catch (err) {
        console.error(err);
    showError("Login service error: " + (err.message || "please try again."));
  } finally {
    $("btn").disabled = !hasSupabase;
  }
});

$("demoBtn").addEventListener("click", () => {
  auth.startDemo();
  location.assign("dashboard.html");
});
