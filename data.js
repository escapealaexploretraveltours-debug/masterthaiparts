import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const DEMO_KEY = "mtp_demo_parts_v1";

const SEED = [
  ["BRK-1001", "Front Brake Pad Set", "Brake Parts", "Brembo", 1250, 24, 8],
  ["BRK-1002", "Rear Brake Shoe", "Brake Parts", "Nissin", 680, 3, 6],
  ["BRK-1003", "Brake Disc 260mm", "Brake Parts", "Galfer", 2450, 11, 4],
  ["BRK-1004", "Brake Master Cylinder", "Brake Parts", "Nissin", 3200, 0, 3],
  ["ENG-2001", "Piston Kit 59mm", "Engine Parts", "Yoshimura", 3890, 9, 4],
  ["ENG-2002", "Cam Chain Set", "Engine Parts", "Daido", 1180, 15, 5],
  ["ENG-2003", "Spark Plug Iridium", "Engine Parts", "NGK", 420, 60, 20],
  ["ENG-2004", "Clutch Lining Set", "Engine Parts", "Mugen", 1560, 4, 6],
  ["EXH-3001", "Stainless Slip-On Muffler", "Exhaust System", "Akrapovic", 8900, 5, 2],
  ["EXH-3002", "Exhaust Gasket Kit", "Exhaust System", "Athena", 260, 38, 10],
  ["EXH-3003", "Header Pipe 4-1", "Exhaust System", "Two Brothers", 6400, 2, 3],
  ["FUL-4001", "Fuel Pump Assembly", "Fuel System", "Denso", 2750, 7, 3],
  ["FUL-4002", "Carburetor 24mm", "Fuel System", "Keihin", 4300, 6, 3],
  ["FUL-4003", "Fuel Filter Inline", "Fuel System", "Mahle", 190, 45, 15],
  ["SUS-5001", "Front Fork Seal Kit", "Suspension", "Showa", 780, 18, 6],
  ["SUS-5002", "Rear Shock 330mm", "Suspension", "YSS", 7600, 3, 2],
  ["SUS-5003", "Fork Oil 10W", "Suspension", "Motul", 520, 2, 8],
].map(([sku, name, category, brand, price, stock, min_stock], i) => ({
  id: "demo-" + (i + 1), sku, name, category, brand, price, stock, min_stock, notes: "",
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
}));

// ---------- demo store (localStorage) ----------
const demo = {
  load() {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    this.save(SEED);
    return structuredClone(SEED);
  },
  save(rows) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(rows)); } catch {}
  },
  async list() { return this.load(); },
  async upsert(part) {
    const rows = this.load();
    if (part.id) {
      const i = rows.findIndex((r) => r.id === part.id);
      if (i >= 0) rows[i] = { ...rows[i], ...part };
    } else {
      rows.unshift({ ...part, id: "demo-" + Date.now(), created_at: new Date().toISOString() });
    }
    this.save(rows);
  },
  async remove(id) { this.save(this.load().filter((r) => r.id !== id)); },
};

// ---------- supabase store ----------
let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

const remote = {
  async list() {
    const c = await client();
    const { data, error } = await c.from("parts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async upsert(part) {
    const c = await client();
    const { id, ...fields } = part;
    const q = id ? c.from("parts").update(fields).eq("id", id) : c.from("parts").insert(fields);
    const { error } = await q;
    if (error) throw error;
  },
  async remove(id) {
    const c = await client();
    const { error } = await c.from("parts").delete().eq("id", id);
    if (error) throw error;
  },
};

export const store = { demo, remote };

// ---------- auth ----------
export const auth = {
  async session() {
    if (!hasSupabase) return null;
    const c = await client();
    const { data } = await c.auth.getSession();
    return data.session;
  },
  async signIn(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },
  async signUp(email, password) {
    const c = await client();
    const { data, error } = await c.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    if (!hasSupabase) return;
    const c = await client();
    await c.auth.signOut();
  },
};
