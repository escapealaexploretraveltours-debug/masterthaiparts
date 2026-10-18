import { CATEGORIES, SHOP } from "./config.js";
import { auth, parts } from "./store.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const catOf = (k) => CATEGORIES.find((c) => c.key === k);

function toast(text) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("show"), 2200);
}

function downloadCsv(name, header, rows) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [header.map(q).join(","), ...rows.map((r) => r.map(q).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

// ---------- shared shell: navbar + sidebar (same menu as the original) ----------
const MENU = [
  ["dashboard.html", "home-outline", "Home"],
  ["profile.html", "person-outline", "Profile"],
  ["category.html", "grid-outline", "Category"],
  ["report.html", "document-text-outline", "Report"],
];

function buildShell(session) {
  const here = location.pathname.split("/").pop() || "index.html";
  const inCategory = CATEGORIES.some((c) => c.page === here);
  const links = MENU.map(([href, icon, label]) => {
    const active = href === here || (href === "category.html" && inCategory);
    return `<li><a href="${href}" class="${active ? "active" : ""}"><ion-icon name="${icon}"></ion-icon>${label}</a></li>`;
  }).join("") + `<li><a href="index.html" data-logout><ion-icon name="log-out-outline"></ion-icon>Logout</a></li>`;

  document.body.innerHTML = `
  <div class="main">
    <header class="navbar">
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle menu">☰</button>
      <div class="logo-container">
        <img src="assets/logo.jpg" alt="logo" class="logo-img">
        <h2 class="logo">${esc(SHOP.name)}</h2>
      </div>
      <nav class="menu"><ul>${links}</ul></nav>
      <div class="date-time">${session.demo ? '<span class="pill">Demo</span>' : ""}<span id="datetime"></span></div>
    </header>
    <aside class="sidebar" id="sidebar"><ul>${links}</ul></aside>
    <main class="page-content" id="content"></main>
  </div>`;

  const tick = () => { $("#datetime").textContent = new Date().toLocaleString(); };
  tick();
  setInterval(tick, 1000);

  $("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-logout]");
    if (!a) return;
    e.preventDefault();
    await auth.logout().catch(() => {});
    location.assign("index.html");
  });
}

// ---------- Dashboard ----------
async function dashboard(root, session) {
  const rows = await parts.list();
  const cats = CATEGORIES.map((c) => {
    const n = rows.filter((p) => p.section === c.key).length;
    return `<a class="cat-card" href="${c.page}"><strong>${esc(c.title)}</strong><span>${n} ${n === 1 ? "item" : "items"}</span></a>`;
  }).join("");
  const recent = rows.slice(0, 5).map((p) =>
    `<tr><td class="sku">${esc(p.id)}</td><td class="pname">${esc(p.name)}</td><td>${esc(catOf(p.section)?.title)}</td><td>${esc(p.category)}</td></tr>`).join("");

  root.innerHTML = `
    <div class="page-head"><div><h1>Welcome, ${esc(session.username)}</h1>
      <p class="muted">${rows.length} parts across ${CATEGORIES.length} categories.</p></div></div>
    <section class="panel"><h3>Browse by category</h3><div class="cat-grid">${cats}</div></section>
    <section class="panel"><h3>Recently added</h3>
      ${recent ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Section</th><th>Category</th></tr></thead><tbody>${recent}</tbody></table></div>` : `<p class="muted">No parts yet.</p>`}
    </section>`;
}

// ---------- Category (Stocks) ----------
async function category(root) {
  const rows = await parts.list();
  const buttons = CATEGORIES.map((c) => {
    const n = rows.filter((p) => p.section === c.key).length;
    return `<button class="cn" type="button"><a href="${c.page}">${esc(c.title)}<small>${n} items</small></a></button>`;
  }).join("");
  root.innerHTML = `
    <div class="page-head"><div><h1>Stocks</h1><p class="muted">Items:</p></div></div>
    <div class="category-buttons button-container">${buttons}</div>
    <p class="back"><a href="dashboard.html">← Back to Home</a></p>`;
}

// ---------- Parts page (one per category) ----------
// Same screen as the original: Add (toggles form) · Search · table with ID, Name, Description, Category, Action (Delete)
async function partsPage(root, key) {
  const c = catOf(key);
  if (!c) { root.innerHTML = "<p>Unknown category.</p>"; return; }
  let rows = [];
  let query = "";

  root.innerHTML = `
    <div class="page-head"><div><h1>${esc(c.title)}</h1><p class="muted" id="sub"></p></div></div>

    <section class="panel">
      <div class="panel-row"><h3>Add</h3><button class="add-part-button" id="toggleAdd" type="button" aria-expanded="false">Add</button></div>
      <div id="addForm" hidden>
        <form id="partForm" class="add-form" autocomplete="off">
          <label>Name<input type="text" name="name" required maxlength="100"></label>
          <label>Description<input type="text" name="description" required maxlength="200"></label>
          <label>Category<input type="text" name="category" required maxlength="60"></label>
          <div class="form-actions"><button type="submit" class="add-part-button">Add Part</button></div>
        </form>
        <p class="err" id="formErr" role="alert"></p>
      </div>
    </section>

    <section class="panel">
      <h3>Search</h3>
      <form id="searchForm" class="search-form">
        <input type="search" id="search" name="search" placeholder="Enter keyword..." aria-label="Search parts">
        <button type="submit" class="add-part-button">Search</button>
        <button type="button" class="btn-ghost" id="clearBtn" hidden>Clear</button>
      </form>
    </section>

    <section class="panel">
      <h3>${esc(c.title)}</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Category</th><th>Action</th></tr></thead>
        <tbody id="rows"></tbody></table>
        <p class="empty" id="empty" hidden></p></div>
    </section>`;

  const form = $("#partForm");

  function draw() {
    const q = query.trim().toLowerCase();
    const shown = rows.filter((p) => !q || [p.name, p.description, p.category].some((v) => String(v ?? "").toLowerCase().includes(q)));
    $("#sub").textContent = `${rows.length} ${rows.length === 1 ? "part" : "parts"}`;
    $("#rows").innerHTML = shown.map((p) => `<tr>
        <td class="sku">${esc(p.id)}</td><td class="pname">${esc(p.name)}</td>
        <td>${esc(p.description)}</td><td>${esc(p.category)}</td>
        <td><div class="row-actions"><button class="del" data-id="${esc(p.id)}" type="button">Delete</button></div></td></tr>`).join("");
    $("#empty").hidden = shown.length > 0;
    $("#empty").textContent = q ? "No parts match your search." : "No parts found";
    $("#clearBtn").hidden = !q;
  }

  async function reload() {
    try { rows = await parts.list(key); }
    catch (e) { toast("Could not load parts: " + (e.message || e)); rows = []; }
    draw();
  }

  $("#toggleAdd").addEventListener("click", () => {
    const box = $("#addForm");
    box.hidden = !box.hidden;
    $("#toggleAdd").setAttribute("aria-expanded", String(!box.hidden));
    if (!box.hidden) form.elements.name.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const p = {
      section: key,
      name: String(d.get("name")).trim(),
      description: String(d.get("description")).trim(),
      category: String(d.get("category")).trim(),
    };
    $("#formErr").textContent = "";
    try {
      await parts.add(p);
      toast("Part added");
      form.reset();
      await reload();
    } catch (err) { $("#formErr").textContent = err.message || "Could not save."; }
  });

  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); query = $("#search").value; draw(); });
  $("#clearBtn").addEventListener("click", () => { query = ""; $("#search").value = ""; draw(); });

  $("#rows").addEventListener("click", async (e) => {
    const b = e.target.closest("button.del");
    if (!b) return;
    const p = rows.find((r) => String(r.id) === b.dataset.id);
    if (!p || !confirm(`Delete "${p.name}"?`)) return;
    try { await parts.remove(p.id); toast("Part deleted"); await reload(); }
    catch (err) { toast(err.message || "Delete failed"); }
  });

  await reload();
}

// ---------- Profile ----------
function profile(root, session) {
  const since = session.since ? new Date(session.since).toLocaleString() : "";
  root.innerHTML = `
    <div class="page-head"><div><h1>Profile</h1><p class="muted">Your account</p></div></div>
    <section class="panel profile">
      <div class="avatar">${esc(session.username.charAt(0).toUpperCase())}</div>
      <div><h2>${esc(session.username)}</h2>
        <p class="muted">${session.demo ? "Demo session — nothing leaves your browser." : since ? "Last login " + esc(since) : "Signed in"}</p></div>
    </section>
    ${session.demo ? "" : `<section class="panel"><h3>Change password</h3>
      <form id="pwForm" class="search-form">
        <input type="password" name="pw" minlength="6" required autocomplete="new-password" placeholder="New password" aria-label="New password">
        <button class="add-part-button" type="submit">Update password</button>
      </form><p class="err" id="pwErr" role="alert"></p></section>`}
    <p class="back"><a href="dashboard.html">← Back to Home</a></p>`;
  const f = $("#pwForm");
  if (f) f.addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await auth.changePassword(f.elements.pw.value); f.reset(); $("#pwErr").textContent = ""; toast("Password updated"); }
    catch (err) { $("#pwErr").textContent = err.message || "Could not update password."; }
  });
}

// ---------- Report ----------
async function report(root) {
  const rows = await parts.list();
  const sorted = rows.slice().sort((a, b) => a.section.localeCompare(b.section) || a.id - b.id);
  const per = CATEGORIES.map((c) => ({ c, n: rows.filter((p) => p.section === c.key).length }));

  root.innerHTML = `
    <div class="page-head"><div><h1>Report</h1><p class="muted">Generated ${esc(new Date().toLocaleString())}</p></div>
      <div class="head-actions no-print"><button class="btn-ghost" id="csvAll" type="button">Export CSV</button>
      <button class="add-part-button" id="printBtn" type="button">Print</button></div></div>
    <section class="panel"><h3>Summary</h3><div class="table-wrap"><table>
      <thead><tr><th>Section</th><th class="num">Items</th></tr></thead>
      <tbody>${per.map((x) => `<tr><td>${esc(x.c.title)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody>
      <tfoot><tr><th>Total</th><th class="num">${rows.length}</th></tr></tfoot></table></div></section>
    <section class="panel"><h3>All parts</h3><div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Section</th><th>Name</th><th>Description</th><th>Category</th></tr></thead>
      <tbody>${sorted.map((p) => `<tr><td class="sku">${esc(p.id)}</td><td>${esc(catOf(p.section)?.title)}</td><td class="pname">${esc(p.name)}</td><td>${esc(p.description)}</td><td>${esc(p.category)}</td></tr>`).join("")}</tbody>
    </table></div></section>`;

  $("#printBtn").addEventListener("click", () => window.print());
  $("#csvAll").addEventListener("click", () =>
    downloadCsv("master-thai-parts-report.csv", ["ID", "Section", "Name", "Description", "Category"],
      sorted.map((p) => [p.id, catOf(p.section)?.title, p.name, p.description, p.category])));
}

// ---------- boot ----------
(async function init() {
  const page = document.body.dataset.page;
  let session = null;
  try { session = await auth.current(); } catch {}
  if (!session) return location.replace("index.html");

  buildShell(session);
  const root = $("#content");
  document.title = `${document.body.dataset.title || "Master Thai Parts"} — ${SHOP.name}`;
  try {
    if (page === "dashboard") await dashboard(root, session);
    else if (page === "category") await category(root);
    else if (page === "profile") profile(root, session);
    else if (page === "report") await report(root);
    else if (page === "parts") await partsPage(root, document.body.dataset.category);
  } catch (e) {
    root.innerHTML = `<section class="panel"><p class="err">Something went wrong: ${esc(e.message || e)}</p></section>`;
  }
})();
