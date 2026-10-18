// fx3d.js — 3D layer for every page. Purely visual: it never touches your app logic.
//  • your real logo as a 3D coin (drag to spin, click to flip, follows the mouse)
//  • your background image as a layered parallax scene + 3D floor grid + depth sparks
//  • 3D tilt + glare on cards
// No external libraries. Uses assets/logo.jpg and assets/background.jpg.

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isLogin = document.body.classList.contains("login-page");
const asset = (n) => new URL("../assets/" + n, import.meta.url).href;
const root = document.documentElement;

document.head.append(Object.assign(document.createElement("link"), {
  rel: "stylesheet",
  href: new URL("../css/theme3d.css", import.meta.url).href,
}));

// ---------- shared pointer ----------
let px = 0, py = 0, sx = 0, sy = 0;
addEventListener("pointermove", (e) => {
  px = (e.clientX / innerWidth) * 2 - 1;
  py = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

// ---------- 3D background (appended to <html> so page scripts that rewrite <body> never remove it) ----------
const bg = document.createElement("div");
bg.className = "bg3d";
bg.setAttribute("aria-hidden", "true");
bg.innerHTML = `
  <div class="bg-img" style="background-image:url('${asset("background.jpg")}')"></div>
  <div class="bg-glow"></div>
  <div class="bg-floor"></div>
  <canvas class="bg-sparks"></canvas>`;
root.append(bg);
root.classList.add("fx-on");

// ---------- sparks (2D canvas, parallax by depth) ----------
const cv = bg.querySelector("canvas");
const ctx = cv.getContext("2d");
const COLORS = ["228,32,44", "255,255,255", "74,109,240"];
let W = 0, H = 0, dpr = 1;
const sparks = Array.from({ length: innerWidth < 700 ? 40 : 90 }, () => ({
  x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8,
  s: 0.15 + Math.random() * 0.4, ph: Math.random() * 6.28, c: COLORS[(Math.random() * 3) | 0],
}));
function sizeCanvas() {
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeCanvas();
addEventListener("resize", () => { sizeCanvas(); if (reduced) drawSparks(0); });
function drawSparks(t) {
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  for (const p of sparks) {
    if (!reduced) { p.y -= (p.s * p.z * 0.0009); if (p.y < -0.02) p.y = 1.02; }
    const x = p.x * W + Math.sin(t * 0.0004 + p.ph) * 14 * p.z - sx * p.z * 46;
    const y = p.y * H - sy * p.z * 30;
    const r = 0.8 + p.z * 2.2;
    ctx.fillStyle = `rgba(${p.c},${0.16 * p.z})`;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${p.c},${0.75 * p.z})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }
}

// ---------- logo coin ----------
function makeCoin(extra = "") {
  const el = document.createElement("div");
  el.className = "coin-scene " + extra;
  const rims = Array.from({ length: 14 }, (_, k) => `<i class="rim" style="--k:${k}"></i>`).join("");
  const img = `<img src="${asset("logo.jpg")}" alt="" draggable="false">`;
  el.innerHTML = `<div class="coin-floor"></div>
    <div class="coin">
      <div class="coin-face front">${img}</div>${rims}<div class="coin-face back">${img}</div>
      <span class="orbit o1"></span><span class="orbit o2"></span>
    </div>`;
  el.querySelector(".front img").alt = "Master Thai Parts logo";
  return el;
}

const coins = [];
function addCoin(scene, strength = 1) {
  const st = { scene, strength, drag: 0, vel: 0, rx: 0, ry: 0, down: false, moved: 0, lastX: 0 };
  coins.push(st);
  scene.addEventListener("pointerdown", (e) => {
    st.down = true; st.moved = 0; st.lastX = e.clientX;
    scene.setPointerCapture(e.pointerId); scene.classList.add("grabbing");
  });
  scene.addEventListener("pointermove", (e) => {
    if (!st.down) return;
    const dx = e.clientX - st.lastX; st.lastX = e.clientX;
    st.moved += Math.abs(dx); st.drag += dx * 0.7; st.vel = dx * 0.7;
  });
  const up = () => {
    if (!st.down) return;
    st.down = false; scene.classList.remove("grabbing");
    if (st.moved < 5) st.vel = 24; // simple click = flip
  };
  scene.addEventListener("pointerup", up);
  scene.addEventListener("pointercancel", up);
  return st;
}
function updateCoins(t) {
  for (const st of coins) {
    if (!st.down) {
      st.drag += st.vel; st.vel *= 0.94;
      if (Math.abs(st.vel) < 0.08) st.drag += (Math.round(st.drag / 360) * 360 - st.drag) * 0.05; // settle face-forward
    }
    const sway = reduced ? 0 : Math.sin(t * 0.0008) * 12;
    const ty = (px * 24 + sway) * st.strength + st.drag;
    const tx = (-py * 16 + (reduced ? 0 : Math.sin(t * 0.0006) * 4)) * st.strength;
    st.ry += (ty - st.ry) * 0.14;
    st.rx += (tx - st.rx) * 0.1;
    const s = st.scene.style;
    s.setProperty("--crx", st.rx.toFixed(2) + "deg");
    s.setProperty("--cry", st.ry.toFixed(2) + "deg");
    s.setProperty("--sh", (50 + (st.ry % 360) * 0.9).toFixed(1) + "%");
  }
}

if (isLogin) {
  const wrap = document.querySelector(".login-wrap");
  if (wrap) {
    const hero = document.createElement("div");
    hero.className = "hero-copy";
    const coin = makeCoin("hero");
    hero.append(coin);
    hero.insertAdjacentHTML("beforeend", `
      <span class="kicker">III.XXV.MMXXI</span>
      <h2><b class="r">MA</b><b class="w">S</b><b class="b">TER</b></h2>
      <p><span class="t-r">THAI PARTS</span><span class="t-b">ACCESSORIES</span></p>
      <small>Drag the logo to spin it · click to flip</small>`);
    wrap.prepend(hero);
    addCoin(coin, 1);
  }
} else {
  const mini = makeCoin("mini");
  mini.title = "Click to flip";
  root.append(mini);
  addCoin(mini, 1.4);
}

// ---------- tilt cards ----------
const TILT = ".stat,.cat-card,.cn a,.login-card,.profile,[data-tilt]";
let current = null;
const resetTilt = (el) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const el = e.target.closest?.(TILT) ?? null;
  if (current && current !== el) resetTilt(current);
  current = el;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--rx", ((0.5 - y) * 12).toFixed(2) + "deg");
  el.style.setProperty("--ry", ((x - 0.5) * 14).toFixed(2) + "deg");
  el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
  el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
}, { passive: true });
document.addEventListener("pointerleave", () => { if (current) resetTilt(current); current = null; });

// ---------- one animation loop ----------
let raf = 0;
function frame(t) {
  sx += (px - sx) * 0.07; sy += (py - sy) * 0.07;
  bg.style.setProperty("--px", sx.toFixed(3));
  bg.style.setProperty("--py", sy.toFixed(3));
  drawSparks(t);
  updateCoins(t);
  if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !reduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
});
raf = requestAnimationFrame(frame);
