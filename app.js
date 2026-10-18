import { CATEGORIES } from "./config.js";
import { hasSupabase, store, auth } from "./data.js";

const $ = (id) => document.getElementById(id);
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = {
  mode: null,        // "demo" | "live"
  user: null,
  parts: [],
  category: "All",
  search: "",
  stock: "all",
  sort: { key: "created_at", dir: "desc" },
  editing: null,
};

const db = () => (state.mode === "demo" ? store.demo : store.remote);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 2200);
}

const status = (p) => (p.stock <= 0 ? "out" : p.stock <= p.min_stock ? "low" : "ok");

// ---------- views ----------
function showAuth() {
  $("authView").hidden = false;
  $("appView").hidden = true;
  $("modeNote").textContent = hasSupabase
    ? "Sign in to manage the live inventory."
    : "Supabase isn't configured yet — demo mode only.";
  $("signInBtn").disabled = !hasSupabase;
  $("signUpBtn").disabled = !hasSupabase;
}

async function enterApp(mode, user) {
  state.mode = mode;
  state.user = user;
  $("authView").hidden = true;
  $("appView").hidden = false;
  $("modePill").textContent = mode === "demo" ? "Demo" : "Live";
  $("modePill").className = "pill " + (mode === "demo" ? "demo" : "live");
  $("userLabel").textContent = mode === "demo" ? "Guest" : user?.email ?? "";
  await refresh();
}

async function refresh() {
  try {
    state.parts = await db().list();
  } catch (e) {
    toast("Could not load parts: " + (e.message || e));
    state.parts = [];
  }
  render();
}

// ---------- rendering ----------
function filtered() {
  const q = state.search.trim().toLowerCase();
  let rows = state.parts.filter((p) => {
    if (state.category !== "All" && p.category !== state.category) return false;
    if (state.stock !== "all" && status(p) !== state.stock) return false;
    if (!q) return true;
    return [p.name, p.sku, p.brand].some((v) => String(v ?? "").toLowerCase().includes(q));
  });
  const { key, dir } = state.sort;
  rows.sort((a, b) => {
    const x = a[key], y = b[key];
    const r = typeof x === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
    return dir === "asc" ? r : -r;
  });
  return rows;
}

function renderNav() {
  const items = ["All", ...CATEGORIES];
  $("catNav").innerHTML = items
    .map((c) => {
      const n = c === "All" ? state.parts.length : state.parts.filter((p) => p.category === c).length;
      return `<button data-cat="${esc(c)}" class="${c === state.category ? "active" : ""}"><span>${c === "All" ? "All Parts" : esc(c)}</span><span class="count">${n}</span></button>`;
    })
    .join("");
}

function renderStats(scope) {
  const value = scope.reduce((s, p) => s + p.price * p.stock, 0);
  const low = scope.filter((p) => status(p) === "low").length;
  const out = scope.filter((p) => status(p) === "out").length;
  const cards = [
    ["Total parts", scope.length, "var(--blue-l)"],
    ["Units in stock", scope.reduce((s, p) => s + p.stock, 0).toLocaleString(), "var(--ok)"],
    ["Inventory value", peso.format(value), "var(--red)"],
    ["Low / out of stock", `${low} / ${out}`, "var(--warn)"],
  ];
  $("stats").innerHTML = cards
    .map(([k, v, c]) => `<div class="stat" style="--c:${c}"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`)
    .join("");
}

function renderChart() {
  const totals = CATEGORIES.map((c) => [c, state.parts.filter((p) => p.category === c).reduce((s, p) => s + p.stock, 0)]);
  const max = Math.max(1, ...totals.map((t) => t[1]));
  $("chart").innerHTML = totals
    .map(([c, n]) => `<div class="bar-row"><span>${esc(c)}</span><div class="bar-track"><div class="bar-fill" style="width:${(n / max) * 100}%"></div></div><span class="n">${n}</span></div>`)
    .join("");
}

function renderTable(rows) {
  $("rows").innerHTML = rows
    .map((p) => {
      const s = status(p);
      const label = { ok: "In stock", low: "Low stock", out: "Out of stock" }[s];
      return `<tr>
        <td class="sku">${esc(p.sku)}</td>
        <td><div class="pname">${esc(p.name)}</div>${p.notes ? `<div class="pnote">${esc(p.notes)}</div>` : ""}</td>
        <td class="hide-sm">${esc(p.category)}</td>
        <td class="hide-sm">${esc(p.brand)}</td>
        <td class="num">${peso.format(p.price)}</td>
        <td class="num">${p.stock}</td>
        <td><span class="badge ${s}">${label}</span></td>
        <td><div class="row-actions">
          <button data-act="edit" data-id="${esc(p.id)}">Edit</button>
          <button class="del" data-act="del" data-id="${esc(p.id)}">Delete</button>
        </div></td>
      </tr>`;
    })
    .join("");
  $("empty").hidden = rows.length > 0;
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    const on = th.dataset.sort === state.sort.key;
    th.classList.toggle("sorted", on);
    th.classList.toggle("desc", on && state.sort.dir === "desc");
  });
}

function render() {
  const rows = filtered();
  const scope = state.category === "All" ? state.parts : state.parts.filter((p) => p.category === state.category);
  $("pageTitle").textContent = state.category === "All" ? "All Parts" : state.category;
  $("pageSub").textContent = `${rows.length} of ${scope.length} parts shown`;
  renderNav();
  renderStats(scope);
  renderChart();
  renderTable(rows);
}

// ---------- dialog ----------
function openDialog(part) {
  state.editing = part ?? null;
  $("dialogTitle").textContent = part ? "Edit part" : "Add part";
  $("formErr").textContent = "";
  const f = $("partForm");
  f.reset();
  $("categorySelect").innerHTML = CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join("");
  if (part) {
    for (const k of ["sku", "brand", "name", "category", "price", "stock", "min_stock", "notes"]) f.elements[k].value = part[k] ?? "";
  } else if (state.category !== "All") {
    f.elements.category.value = state.category;
  }
  $("partDialog").showModal();
}

async function savePart(e) {
  e.preventDefault();
  const f = new FormData($("partForm"));
  const part = {
    sku: f.get("sku").trim(),
    brand: f.get("brand").trim(),
    name: f.get("name").trim(),
    category: f.get("category"),
    price: Number(f.get("price")),
    stock: parseInt(f.get("stock"), 10),
    min_stock: parseInt(f.get("min_stock"), 10),
    notes: f.get("notes").trim(),
  };
  if (state.editing) part.id = state.editing.id;
  try {
    await db().upsert(part);
    $("partDialog").close();
    toast(state.editing ? "Part updated" : "Part added");
    await refresh();
  } catch (err) {
    $("formErr").textContent = err.message || "Could not save.";
  }
}

function exportCsv() {
  const cols = ["sku", "name", "category", "brand", "price", "stock", "min_stock", "notes"];
  const lines = [cols.join(",")].concat(
    filtered().map((p) => cols.map((c) => `"${String(p[c] ?? "").replace(/"/g, '""')}"`).join(","))
  );
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "master-thai-parts.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- events ----------
function bind() {
  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("authErr").textContent = "";
    try {
      const s = await auth.signIn($("email").value, $("password").value);
      await enterApp("live", s.user);
    } catch (err) {
      $("authErr").textContent = err.message || "Sign in failed.";
    }
  });
  $("signUpBtn").addEventListener("click", async () => {
    $("authErr").textContent = "";
    if (!$("authForm").reportValidity()) return;
    try {
      const d = await auth.signUp($("email").value, $("password").value);
      if (d.session) await enterApp("live", d.user);
      else $("authErr").textContent = "Check your email to confirm your account, then sign in.";
    } catch (err) {
      $("authErr").textContent = err.message || "Sign up failed.";
    }
  });
  $("demoBtn").addEventListener("click", () => enterApp("demo", null));
  $("signOutBtn").addEventListener("click", async () => {
    await auth.signOut();
    showAuth();
  });

  $("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  $("catNav").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cat]");
    if (!b) return;
    state.category = b.dataset.cat;
    $("sidebar").classList.remove("open");
    render();
  });

  $("search").addEventListener("input", (e) => { state.search = e.target.value; render(); });
  $("stockFilter").addEventListener("change", (e) => { state.stock = e.target.value; render(); });
  document.querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;
    const key = th.dataset.sort;
    state.sort = { key, dir: state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc" };
    render();
  });

  $("addBtn").addEventListener("click", () => openDialog());
  $("exportBtn").addEventListener("click", exportCsv);
  $("cancelBtn").addEventListener("click", () => $("partDialog").close());
  $("partForm").addEventListener("submit", savePart);

  $("rows").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const part = state.parts.find((p) => String(p.id) === b.dataset.id);
    if (!part) return;
    if (b.dataset.act === "edit") return openDialog(part);
    if (confirm(`Delete "${part.name}"?`)) {
      try {
        await db().remove(part.id);
        toast("Part deleted");
        await refresh();
      } catch (err) {
        toast(err.message || "Delete failed");
      }
    }
  });
}

// ---------- boot ----------
(async function init() {
  bind();
  try {
    const s = await auth.session();
    if (s) return enterApp("live", s.user);
  } catch {}
  showAuth();
})();
