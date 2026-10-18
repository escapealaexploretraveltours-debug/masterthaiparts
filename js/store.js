import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const MODE_KEY = "mtp_mode";
const DEMO_KEY = "mtp_demo_v2";

const safe = {
  get: (s, k) => { try { return s.getItem(k); } catch { return null; } },
  set: (s, k, v) => { try { s.setItem(k, v); } catch {} },
  del: (s, k) => { try { s.removeItem(k); } catch {} },
};
const isDemo = () => safe.get(sessionStorage, MODE_KEY) === "demo";

// ---------- Supabase client (loaded only when configured) ----------
let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

// ---------- demo data ----------
const SEED = [
  ["brake", "Front Brake Pad Set", "Semi-metallic pads for front disc", "Brake Pads"],
  ["brake", "Rear Brake Shoe", "Drum brake shoe, pair", "Brake Shoes"],
  ["brake", "Brake Disc 260mm", "Floating stainless disc", "Brake Discs"],
  ["brake", "Brake Master Cylinder", "Front master cylinder with lever", "Hydraulics"],
  ["engine", "Piston Kit 59mm", "Piston, rings and pin", "Top End"],
  ["engine", "Cam Chain Set", "Timing chain with guide", "Valve Train"],
  ["engine", "Spark Plug Iridium", "Long-life iridium plug", "Ignition"],
  ["engine", "Clutch Lining Set", "Friction plates, set of 5", "Clutch"],
  ["exhaust", "Stainless Slip-On Muffler", "Slip-on, 51mm inlet", "Mufflers"],
  ["exhaust", "Exhaust Gasket Kit", "Header and muffler gaskets", "Gaskets"],
  ["exhaust", "Header Pipe 4-1", "Stainless 4-into-1 header", "Headers"],
  ["fuel", "Fuel Pump Assembly", "12V electric fuel pump", "Pumps"],
  ["fuel", "Carburetor 24mm", "Replacement carburetor", "Carburetors"],
  ["fuel", "Inline Fuel Filter", "Universal 6mm inline filter", "Filters"],
  ["suspension", "Front Fork Seal Kit", "Fork oil and dust seals", "Forks"],
  ["suspension", "Rear Shock 330mm", "Adjustable preload shock", "Shocks"],
  ["suspension", "Fork Oil 10W", "1 liter fork oil", "Fluids"],
  ["transmission", "Drive Chain 428H", "Heavy-duty 120 links", "Chains"],
  ["transmission", "Sprocket Set 14/36", "Front and rear sprocket", "Sprockets"],
  ["transmission", "Clutch Cable", "Universal clutch cable", "Cables"],
].map(([section, name, description, category], i) => ({
  id: i + 1, section, name, description, category,
  created_at: new Date(Date.now() - i * 3600e3).toISOString(),
}));

function demoLoad() {
  const raw = safe.get(localStorage, DEMO_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  safe.set(localStorage, DEMO_KEY, JSON.stringify(SEED));
  return structuredClone(SEED);
}
const demoSave = (rows) => safe.set(localStorage, DEMO_KEY, JSON.stringify(rows));

// ---------- parts API (same shape in demo and live mode) ----------
export const parts = {
  async list(section) {
    if (isDemo()) {
      const rows = demoLoad().filter((r) => !section || r.section === section);
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const c = await client();
    let q = c.from("parts").select("*").order("created_at", { ascending: false });
    if (section) q = q.eq("section", section);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async add(p) {
    if (isDemo()) {
      const rows = demoLoad();
      const id = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
      rows.push({ ...p, id, created_at: new Date().toISOString() });
      return demoSave(rows);
    }
    const { error } = await (await client()).from("parts").insert(p);
    if (error) throw error;
  },
  async remove(id) {
    if (isDemo()) return demoSave(demoLoad().filter((r) => r.id !== id));
    const { error } = await (await client()).from("parts").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------- auth ----------

export const auth = {
  startDemo() { safe.set(sessionStorage, MODE_KEY, "demo"); },

  async current() {
    if (isDemo()) return { demo: true, username: "guest" };
    if (!hasSupabase) return null;
    const { data } = await (await client()).auth.getSession();
    const s = data.session;
    if (!s) return null;
    return { demo: false, username: (s.user.email || "").split("@")[0], email: s.user.email, since: s.user.last_sign_in_at };
  },

  // Returns {ok:true} or {error:"username"|"password"} — same messages as the original login.php.
    async login(username, password) {
    const u = String(username || "").trim().toLowerCase();
    if (!u || u.length > 254) return { error: "username" };
    const c = await client();
    const { data: email, error } = await c.rpc("login_email", { u });
    if (error) throw error;
    if (!email) return { error: "username" };
    const { error: e2 } = await c.auth.signInWithPassword({ email, password });
    if (e2) return { error: "password" };
    safe.del(sessionStorage, MODE_KEY);
    return { ok: true };
  },
  
  async logout() {
    safe.del(sessionStorage, MODE_KEY);
    if (hasSupabase) await (await client()).auth.signOut();
  },

  async changePassword(newPassword) {
    const { error } = await (await client()).auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};
