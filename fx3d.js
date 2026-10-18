// fx3d.js — 3D layer for every page. Purely visual: it never touches your app logic.
//  • loads css/theme3d.css (modern glass theme)
//  • WebGL brake-rotor scene (Three.js) behind the UI, lit in Thai-flag red / blue
//  • 3D tilt + glare on cards that follow the cursor
// If WebGL or the CDN is unavailable, the site simply works without the 3D scene.

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isLogin = document.body.classList.contains("login-page");

// ---------- 1) theme ----------
document.head.append(Object.assign(document.createElement("link"), {
  rel: "stylesheet",
  href: new URL("../css/theme3d.css", import.meta.url).href,
}));

// ---------- 2) login hero text ----------
if (isLogin) {
  const wrap = document.querySelector(".login-wrap");
  if (wrap) {
    const hero = document.createElement("div");
    hero.className = "hero-copy";
    hero.innerHTML = `
      <span class="kicker">III.XXV.MMXXI</span>
      <h2><b class="r">MA</b><b class="w">S</b><b class="b">TER</b></h2>
      <p><span class="t-r">THAI PARTS</span><span class="t-b">ACCESSORIES</span></p>
      <small>Move your mouse — the rotor follows.</small>`;
    wrap.prepend(hero);
  }
}

// ---------- 3) tilt cards ----------
const TILT = ".stat,.cat-card,.cn a,.login-card,.profile,[data-tilt]";
let current = null;
const reset = (el) => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };

addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const el = e.target.closest?.(TILT) ?? null;
  if (current && current !== el) reset(current);
  current = el;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--rx", ((0.5 - y) * 12).toFixed(2) + "deg");
  el.style.setProperty("--ry", ((x - 0.5) * 14).toFixed(2) + "deg");
  el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
  el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
}, { passive: true });
document.addEventListener("pointerleave", () => { if (current) reset(current); current = null; });

// ---------- 4) WebGL scene ----------
let boost = () => {};

async function scene() {
  let THREE;
  try { THREE = await import(THREE_URL); } catch { return; }

  const canvas = document.createElement("canvas");
  canvas.id = "fx3d";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;transition:opacity 1.2s`;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch { return; }
  document.documentElement.append(canvas); // on <html> so page scripts that rewrite <body> never remove it
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Studio-style reflections (so the steel actually looks like steel): dark room + red/blue/white light strips
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x080b14, side: THREE.BackSide })));
  const strip = (hex, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(7), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  strip(0xffffff, 14, 2, 0, 11, 6, 0);
  strip(0xe4202c, 2.5, 16, -11, 0, 3, Math.PI / 2);
  strip(0x2f55e6, 2.5, 16, 11, 0, 3, Math.PI / 2);
  strip(0xffffff, 10, 1, 0, -9, 6, 0);
  sc.environment = pmrem.fromScene(env, 0.03).texture;

  // ----- brake rotor -----
  const pivot = new THREE.Group();
  const rotor = new THREE.Group();
  pivot.add(rotor);
  sc.add(pivot);

  const shape = new THREE.Shape();
  shape.absarc(0, 0, 3, 0, Math.PI * 2, false);
  const bore = new THREE.Path(); bore.absarc(0, 0, 1.55, 0, Math.PI * 2, true); shape.holes.push(bore);
  for (const [radius, offset] of [[2.1, 0], [2.55, 0.5]]) {
    for (let i = 0; i < 24; i++) {
      const a = ((i + offset) / 24) * Math.PI * 2;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * radius, Math.sin(a) * radius, 0.13, 0, Math.PI * 2, true);
      shape.holes.push(h);
    }
  }
  const discGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 48 });
  discGeo.translate(0, 0, -0.11);
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd4df, metalness: 1, roughness: 0.24, envMapIntensity: 1.25 });
  rotor.add(new THREE.Mesh(discGeo, steel));

  const dark = new THREE.MeshStandardMaterial({ color: 0x151a26, metalness: 0.9, roughness: 0.38, envMapIntensity: 1 });
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.5, 72), dark);
  hub.rotation.x = Math.PI / 2; rotor.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.62, 48), steel);
  cap.rotation.x = Math.PI / 2; rotor.add(cap);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe4202c, metalness: 0.6, roughness: 0.3, emissive: 0x4a0007 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 6), redMat);
    bolt.rotation.x = Math.PI / 2; bolt.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0);
    rotor.add(bolt);
  }
  const ring = (r, hex) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 16, 160), new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }));
    m.position.z = 0.15; rotor.add(m);
  };
  ring(1.58, 0xff2a38);
  ring(2.94, 0x4a6df0);

  // lights for extra pop
  const red = new THREE.PointLight(0xe4202c, 140, 0, 2); red.position.set(-6, 3, 5); sc.add(red);
  const blue = new THREE.PointLight(0x3a5bff, 140, 0, 2); blue.position.set(6, -3, 5); sc.add(blue);
  sc.add(new THREE.AmbientLight(0xffffff, 0.25));

  // ----- sparks -----
  const N = innerWidth < 700 ? 220 : 560;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N);
  const palette = [new THREE.Color(0xe4202c), new THREE.Color(0xffffff), new THREE.Color(0x4a6df0)];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    vel[i] = 0.12 + Math.random() * 0.5;
    const c = palette[(Math.random() * 3) | 0];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  sc.add(sparks);

  // ----- layout (login: big rotor on the left; app pages: dim, to the right) -----
  const base = { x: 0, y: 0 };
  function layout() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, w < 700 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vh = 2 * 9 * Math.tan(THREE.MathUtils.degToRad(20));
    const vw = vh * camera.aspect;
    let s, z = 0;
    if (isLogin) {
      if (w > 900) { s = Math.min(1, (vw * 0.44) / 6, (vh * 0.64) / 6); base.x = -vw * 0.24; base.y = vh * 0.14; }
      else { s = Math.min(0.62, (vw * 0.7) / 6); base.x = 0; base.y = vh * 0.27; z = -1; }
    } else {
      s = Math.min(1.1, (vw * 0.42) / 6, (vh * 0.9) / 6);
      base.x = vw * 0.3; base.y = -vh * 0.04; z = -3;
      if (w < 900) { base.x = vw * 0.18; s *= 0.8; }
    }
    pivot.scale.setScalar(s);
    pivot.position.z = z;
    if (layout.ready) canvas.style.opacity = isLogin ? "1" : (w < 900 ? "0.22" : "0.4");
    layout.ready = true;
  }
  layout();
  addEventListener("resize", () => { layout(); if (reduced) renderer.render(sc, camera); });

  // ----- interaction -----
  let px = 0, py = 0, tx = 0, ty = 0, spin = 0.25, spinT = 0.25, t = 0, last = performance.now(), lastScroll = scrollY, raf = 0;
  addEventListener("pointermove", (e) => { px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  boost = (v = 2.2, ms = 900) => { spinT = v; clearTimeout(boost.t); boost.t = setTimeout(() => (spinT = 0.25), ms); };
  addEventListener("focusin", (e) => { if (e.target.matches?.("input")) boost(1.6, 1200); });
  addEventListener("submit", () => boost(5, 1500), true);
  addEventListener("click", (e) => { if (e.target.closest?.("a,button")) boost(3, 700); }, true);
  addEventListener("pointerover", (e) => { if (e.target.closest?.(TILT)) boost(1.1, 500); }, { passive: true });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    tx += (py * 0.35 - tx) * 0.06;
    ty += (px * 0.55 - ty) * 0.06;
    pivot.rotation.x = tx;
    pivot.rotation.y = ty + Math.sin(t * 0.4) * 0.12;
    pivot.position.x = base.x;
    pivot.position.y = base.y + Math.sin(t * 0.8) * 0.08;
    spin += (spinT - spin) * 0.05;
    const sy = scrollY; rotor.rotation.z -= spin * dt + (sy - lastScroll) * 0.003; lastScroll = sy;
    const a = pg.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += vel[i] * dt;
      if (a[i * 3 + 1] > 7) a[i * 3 + 1] = -7;
    }
    pg.attributes.position.needsUpdate = true;
    sparks.rotation.y = t * 0.02;
    renderer.render(sc, camera);
    if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reduced) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => requestAnimationFrame(layout)); // fade the canvas in
}

scene().catch(() => {});
