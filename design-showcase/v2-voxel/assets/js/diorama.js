import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const hero = document.querySelector('[data-diorama]');
const canvas = hero && hero.querySelector('canvas');
const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const themeName = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

function rngFactory(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (t) => t * t * (3 - 2 * t);
const h2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123; return s - Math.floor(s); };
function vn(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = smooth(x - xi), zf = smooth(z - zi);
  const a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1);
  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
}
const fbm = (x, z) => vn(x * 0.18, z * 0.18) * 0.6 + vn(x * 0.42 + 7, z * 0.42 + 3) * 0.3 + vn(x * 0.95, z * 0.95) * 0.1;

/* palettes: [dark, light] */
const PAL = {
  grass: ['#3a9f72', '#6fc24d'],
  dirt: ['#5c4c6e', '#a4743f'],
  stone: ['#4d5688', '#a0a8b8'],
  rockdark: ['#343b6c', '#7d8798'],
  rock: ['#6e769f', '#adb4c0'],
  snow: ['#e6edff', '#ffffff'],
  water: ['#46c2ff', '#35b7f0'],
  trunk: ['#6e4b4a', '#8d5b32'],
  leaf: ['#2a9468', '#33963f'],
  wood: ['#a58370', '#dba865'],
  roof: ['#c5583f', '#dc5a3e'],
  stonec: ['#7a7f9e', '#9096a3'],
  dome: ['#e6ecff', '#ffffff'],
  door: ['#5a3b30', '#6b3f26'],
  scope: ['#2a3150', '#3c4660']
};

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { hero.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 700);
  scene.add(camera);

  /* ---------- terrain ---------- */
  const R = 13.5, PX = -3, PZ = -3.5;
  const cols = new Map();
  const key = (x, z) => x + ',' + z;
  for (let x = -15; x <= 15; x++) for (let z = -15; z <= 15; z++) {
    const e = Math.hypot(x, z) / R;
    if (e >= 1) continue;
    const n = fbm(x, z);
    const d = Math.hypot(x - PX, z - PZ);
    const pk = Math.max(0, 1 - d / 10);
    let top = Math.floor(3 + n * 2.4 + Math.pow(pk, 1.6) * 14 + pk * n * 3.5);
    top -= Math.floor(smooth(Math.max(0, (e - 0.78) / 0.22)) * 2);
    top = Math.max(top, 2);
    const bottom = -Math.floor(Math.pow(1 - e, 0.85) * 13) - 1 - Math.floor(vn(x * 0.5, z * 0.5) * 2);
    cols.set(key(x, z), { x, z, top, bottom, water: false });
  }
  /* cabin plateau */
  const OX = 3, OZ = 5;
  for (let x = OX - 1; x <= OX + 5; x++) for (let z = OZ - 1; z <= OZ + 4; z++) {
    const c = cols.get(key(x, z)); if (c) c.top = 4;
  }
  /* stream */
  const dir = [0.9, -0.43];
  let run = 99, rim = null;
  for (let t = 2; t < 24; t += 0.5) {
    const x = Math.round(PX + 2.5 + dir[0] * t), z = Math.round(PZ + dir[1] * t);
    const c = cols.get(key(x, z));
    if (!c) { continue; }
    run = Math.min(run, c.top); c.top = run; c.water = true;
    if (t > 11) { const s = cols.get(key(x, z - 1)); if (s) { s.top = Math.min(s.top, run); s.water = true; } }
    rim = c;
  }
  const filled = (x, y, z) => { const c = cols.get(key(x, z)); return !!c && y >= c.bottom && y <= c.top; };

  const vox = []; // {x,y,z,t,j}
  const rnd = rngFactory(7);
  cols.forEach((c) => {
    const sl = 10 + vn(c.x * 0.7, c.z * 0.7) * 2.2;
    for (let y = c.bottom; y <= c.top; y++) {
      if (filled(c.x + 1, y, c.z) && filled(c.x - 1, y, c.z) && filled(c.x, y + 1, c.z) && filled(c.x, y - 1, c.z) && filled(c.x, y, c.z + 1) && filled(c.x, y, c.z - 1)) continue;
      const d = c.top - y;
      let t;
      if (y < 0) t = 'rockdark';
      else if (d === 0 && c.water) t = 'water';
      else if (c.top >= sl && y >= sl - 1 && d <= 1) t = 'snow';
      else if (d === 0) t = y >= 7.5 + vn(c.x * 0.6, c.z * 0.6) * 1.8 ? 'rock' : 'grass';
      else if (d <= 2) t = y >= 7 ? 'rock' : (y >= 3 ? 'dirt' : 'stone');
      else t = y >= 6 ? 'rock' : 'stone';
      vox.push({ x: c.x, y, z: c.z, t, j: 0.94 + rnd() * 0.12, depth: y < 0 ? -y : 0 });
    }
  });

  /* trees */
  const placed = [];
  const treeRnd = rngFactory(21);
  const cand = [];
  cols.forEach((c) => {
    const e = Math.hypot(c.x, c.z) / R;
    const inCabin = c.x >= OX - 2 && c.x <= OX + 6 && c.z >= OZ - 2 && c.z <= OZ + 5;
    if (c.water || inCabin || e > 0.88 || c.top < 3 || c.top > 7) return;
    cand.push(c);
  });
  for (let i = cand.length - 1; i > 0; i--) { const k = Math.floor(treeRnd() * (i + 1)); [cand[i], cand[k]] = [cand[k], cand[i]]; }
  cand.forEach((c) => {
    if (placed.length >= 15) return;
    if (placed.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 3.1)) return;
    placed.push(c);
    const lj = 0.9 + treeRnd() * 0.2, g = c.top;
    vox.push({ x: c.x, y: g + 1, z: c.z, t: 'trunk', j: 1 });
    const L = (y, pts) => pts.forEach(([dx, dz]) => vox.push({ x: c.x + dx, y: g + y, z: c.z + dz, t: 'leaf', j: lj * (0.95 + treeRnd() * 0.1) }));
    const sq = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) sq.push([a, b]);
    L(2, sq.concat([[2, 0], [-2, 0], [0, 2], [0, -2]]));
    L(3, sq);
    L(4, [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]);
    L(5, [[0, 0]]);
  });

  /* cabin */
  const gy = 4;
  const cb = (x, y, z, t) => vox.push({ x: OX + x, y: gy + y, z: OZ + z, t, j: 0.97 + rnd() * 0.06 });
  for (let x = 0; x <= 4; x++) for (let z = 0; z <= 3; z++) for (let y = 1; y <= 3; y++) {
    const edge = x === 0 || x === 4 || z === 0 || z === 3;
    if (!edge) continue;
    if (z === 3 && x === 3 && y <= 2) cb(x, y, z, 'door'); else cb(x, y, z, 'wood');
  }
  for (let x = -1; x <= 5; x++) { for (let z = -1; z <= 4; z++) cb(x, 4, z, 'roof'); }
  for (let x = -1; x <= 5; x++) { for (let z = 0; z <= 3; z++) cb(x, 5, z, 'roof'); }
  for (let x = -1; x <= 5; x++) { for (let z = 1; z <= 2; z++) cb(x, 6, z, 'roof'); }
  for (let y = 4; y <= 8; y++) cb(0, y + 2 > 8 ? 8 : y + 2, 1, 'stonec');
  cb(0, 7, 1, 'stonec'); cb(0, 8, 1, 'stonec'); cb(0, 9, 1, 'stonec');
  for (let a = 3; a <= 4; a++) for (let b = 1; b <= 2; b++) cb(a, 7, b, 'dome');
  cb(3, 8, 1, 'dome'); cb(4, 8, 1, 'dome'); cb(3, 8, 2, 'dome'); cb(4, 8, 2, 'dome');
  cb(5, 8, 2, 'scope'); cb(5, 9, 2, 'scope'); cb(6, 10, 2, 'scope');

  /* ambient occlusion bake */
  const occ = new Set(vox.map((v) => v.x + ',' + v.y + ',' + v.z));
  vox.forEach((v) => {
    let n = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (occ.has((v.x + a) + ',' + (v.y + 1) + ',' + (v.z + b))) n++;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (occ.has((v.x + a) + ',' + v.y + ',' + (v.z + b))) n += 0.5;
    v.ao = Math.max(0.62, 1.04 - n * 0.045);
  });

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, vox.length);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const m4 = new THREE.Matrix4(), s = 0.985;
  vox.forEach((v, i) => { m4.makeScale(s, s, s).setPosition(v.x, v.y, v.z); mesh.setMatrixAt(i, m4); });
  mesh.setColorAt(0, new THREE.Color());
  scene.add(mesh);
  const tmpC = new THREE.Color();
  function paintVoxels() {
    const ti = themeName() === 'light' ? 1 : 0;
    vox.forEach((v, i) => {
      tmpC.set(PAL[v.t][ti]);
      let f = v.j * (themeName() === 'light' ? Math.min(1, v.ao + 0.1) : v.ao);
      if (v.depth) f *= Math.max(0.55, 1 - v.depth * 0.03);
      tmpC.multiplyScalar(f);
      mesh.setColorAt(i, tmpC);
    });
    mesh.instanceColor.needsUpdate = true;
  }

  /* window + glow */
  const winMat = new THREE.MeshBasicMaterial({ color: '#ffb44d' });
  const winMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.2), winMat);
  winMesh.position.set(OX + 1, gy + 2, OZ + 3.5);
  const winMesh2 = winMesh.clone(); winMesh2.position.set(OX + 4.5, gy + 2, OZ + 1.5); winMesh2.rotation.y = Math.PI / 2;
  scene.add(winMesh, winMesh2);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ff9d2e', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.2), glowMat);
  glow.position.set(OX + 1, gy + 2, OZ + 3.7);
  scene.add(glow);
  const winLight = new THREE.PointLight('#ffa940', 0, 14, 2);
  winLight.position.set(OX + 1, gy + 2, OZ + 5.2);
  scene.add(winLight);

  /* waterfall */
  const FALL = 90;
  const rimY = rim.top + 0.5;
  const rimPos = new THREE.Vector3(rim.x + dir[0] * 0.9, rimY, rim.z + dir[1] * 0.9);
  const wfMat = new THREE.MeshLambertMaterial({ color: '#46c2ff', emissive: '#1b6fa8', emissiveIntensity: 0.5 });
  const wf = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wfMat, FALL);
  scene.add(wf);
  const wfSeed = Array.from({ length: FALL }, () => ({ p: Math.random(), jx: (Math.random() - 0.5) * 1.6, jz: (Math.random() - 0.5) * 1.6, sp: 0.7 + Math.random() * 0.5 }));
  const rf = rngFactory(5);
  wfSeed.forEach((w) => { w.p = rf(); w.jx = (rf() - 0.5) * 1.5; w.jz = (rf() - 0.5) * 1.5; w.sp = 0.7 + rf() * 0.5; });
  let clock = 0;
  function updateFall() {
    wfSeed.forEach((w, i) => {
      const t = (w.p + clock * 0.28 * w.sp) % 1;
      const y = rimPos.y - 26 * t * t;
      const out = 0.5 + t * 1.3;
      m4.makeScale(0.62 - 0.4 * t, 0.62 - 0.35 * t, 0.62 - 0.4 * t).setPosition(rimPos.x + dir[0] * out + w.jx * 0.6 * (1 - t * 0.4), y, rimPos.z + dir[1] * out + w.jz * 0.6 * (1 - t * 0.4));
      wf.setMatrixAt(i, m4);
    });
    wf.instanceMatrix.needsUpdate = true;
  }

  /* lights */
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  const sc = sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 110;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#ffffff', 0.3);
  fill.position.set(-20, 10, -18);
  scene.add(fill);

  /* stars */
  const starN = 260;
  const stars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), starN);
  const sr = rngFactory(99);
  for (let i = 0; i < starN; i++) {
    const th = sr() * Math.PI * 2, ph = Math.acos(0.12 + sr() * 0.88), r = 130 + sr() * 50;
    const sz = 0.6 + sr() * 1.0;
    m4.makeScale(sz, sz, sz).setPosition(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.9 - 4, r * Math.sin(ph) * Math.sin(th));
    stars.setMatrixAt(i, m4);
    tmpC.set(sr() > 0.8 ? '#ffe2a8' : '#ffffff'); stars.setColorAt(i, tmpC);
  }
  scene.add(stars);

  /* orb: moon / sun, attached to camera */
  const orbPts = [];
  const orbR = 3.7;
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) if (x * x + y * y + z * z <= orbR * orbR && z >= 0) orbPts.push([x, y, z]);
  const orb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), orbPts.length);
  const orbRnd = rngFactory(3);
  const orbShade = orbPts.map(() => orbRnd());
  orbPts.forEach((p, i) => { m4.makeScale(1.5, 1.5, 1.5).setPosition(p[0] * 1.5, p[1] * 1.5, p[2] * 1.5); orb.setMatrixAt(i, m4); });
  orb.setColorAt(0, new THREE.Color());
  camera.add(orb);

  /* meteors */
  const SEG = 18, MET = 3;
  const metMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, fog: false }), SEG * MET);
  metMesh.frustumCulled = false;
  metMesh.setColorAt(0, new THREE.Color());
  m4.makeScale(0, 0, 0);
  for (let i = 0; i < SEG * MET; i++) metMesh.setMatrixAt(i, m4);
  scene.add(metMesh);
  const meteors = Array.from({ length: MET }, () => ({ on: false, age: 0, life: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 0.5 }));
  let nextMeteor = 0.8;
  const cA = new THREE.Color('#ffffff'), cB = new THREE.Color('#ffc766'), cC = new THREE.Color('#5a58c8');
  function spawnMeteor() {
    const m = meteors.find((q) => !q.on); if (!m) return;
    const dirSign = Math.random() > 0.35 ? 1 : -1;
    const nd = new THREE.Vector3(-0.85 + Math.random() * 1.5, 0.2 + Math.random() * 0.7, 0.5).unproject(camera);
    const ray = nd.sub(camera.position).normalize();
    m.pos.copy(camera.position).addScaledVector(ray, 60 + Math.random() * 30);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    m.vel.copy(right).multiplyScalar(30 * dirSign).addScaledVector(up, -12 - Math.random() * 6);
    m.age = 0; m.life = 1.1 + Math.random() * 0.6; m.size = 0.5 + Math.random() * 0.25; m.on = true;
  }
  function updateMeteors(dt, dark) {
    if (dark) { nextMeteor -= dt; if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 1.8 + Math.random() * 3; } }
    meteors.forEach((m, mi) => {
      if (m.on) { m.age += dt; if (m.age > m.life) m.on = false; }
      for (let i = 0; i < SEG; i++) {
        const idx = mi * SEG + i;
        if (!m.on) { m4.makeScale(0, 0, 0); metMesh.setMatrixAt(idx, m4); continue; }
        const f = i / SEG;
        const env = Math.sin(Math.PI * Math.min(1, m.age / m.life));
        const sz = m.size * (1 - f * 0.9) * (0.4 + env * 0.6);
        const p = m.pos.clone().addScaledVector(m.vel, m.age - i * 0.022);
        m4.makeScale(sz, sz, sz).setPosition(p);
        metMesh.setMatrixAt(idx, m4);
        tmpC.copy(cA).lerp(cB, Math.min(1, f * 2)).lerp(cC, Math.max(0, f * 1.4 - 0.4));
        metMesh.setColorAt(idx, tmpC);
      }
    });
    metMesh.instanceMatrix.needsUpdate = true;
    if (metMesh.instanceColor) metMesh.instanceColor.needsUpdate = true;
  }

  /* clouds */
  const cloudGroups = [];
  const cr = rngFactory(41);
  let cn = 0;
  for (let g = 0; g < 8; g++) {
    const ang = cr() * Math.PI * 2, rad = 24 + cr() * 18, y = 9 + cr() * 14;
    const cells = [];
    const w = 3 + Math.floor(cr() * 3);
    for (let a = 0; a < w; a++) for (let b = 0; b < 2; b++) {
      if (cr() > 0.18) cells.push([a, 0, b]);
      if (a > 0 && a < w - 1 && cr() > 0.35) cells.push([a, 1, b]);
    }
    cloudGroups.push({ cells, ox: Math.cos(ang) * rad, oz: Math.sin(ang) * rad, y, sp: 0.5 + cr() * 0.7, start: cn });
    cn += cells.length;
  }
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#bad9f5', emissiveIntensity: 0.35 });
  const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), cloudMat, cn);
  scene.add(clouds);
  function updateClouds() {
    cloudGroups.forEach((g) => {
      let x = ((g.ox + clock * g.sp + 55) % 110) - 55;
      g.cells.forEach((c, i) => {
        m4.makeScale(1, 1, 1).setPosition(x + c[0] * 2.4, g.y + c[1] * 1.9, g.oz + c[2] * 2.4);
        clouds.setMatrixAt(g.start + i, m4);
      });
    });
    clouds.instanceMatrix.needsUpdate = true;
  }

  /* sky objects colour */
  function paintOrb(light) {
    orbPts.forEach((p, i) => {
      if (light) tmpC.set('#fff0a6').multiplyScalar(0.94 + orbShade[i] * 0.06);
      else tmpC.set(orbShade[i] > 0.82 ? '#cfd6ee' : '#f2f1e6');
      orb.setColorAt(i, tmpC);
    });
    orb.instanceColor.needsUpdate = true;
    orb.scale.setScalar(light ? 1.3 : 1);
  }

  /* theme */
  function applyTheme() {
    const light = themeName() === 'light';
    paintVoxels();
    paintOrb(light);
    stars.visible = !light; metMesh.visible = !light; clouds.visible = light;
    if (light) {
      hemi.color.set('#cfeeff'); hemi.groundColor.set('#e0d3a8'); hemi.intensity = 1.0;
      sun.color.set('#fff0cf'); sun.intensity = 2.5; sun.position.set(22, 30, 14);
      fill.color.set('#b9dcff'); fill.intensity = 0.4;
      winMat.color.set('#a9dcff'); glowMat.opacity = 0; winLight.intensity = 0;
      wfMat.emissiveIntensity = 0.25;
    } else {
      hemi.color.set('#7d89ee'); hemi.groundColor.set('#2a1f58'); hemi.intensity = 1.7;
      sun.color.set('#a9bcff'); sun.intensity = 2.6; sun.position.set(-18, 30, 12);
      fill.color.set('#6d78d6'); fill.intensity = 0.35;
      winMat.color.set('#ffb54f'); glowMat.opacity = 0.3; winLight.intensity = 55;
      wfMat.emissiveIntensity = 0.55;
    }
    renderer.setClearColor(0x000000, 0);
    kick(true);
  }

  /* camera + controls */
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 3.5, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = 0.7; controls.maxPolarAngle = 1.46;
  controls.rotateSpeed = 0.7;
  controls.autoRotateSpeed = 0.55;
  canvas.style.touchAction = 'pan-y';
  const sph = new THREE.Spherical(64, 1.12, 0.78);
  camera.position.setFromSpherical(sph).add(controls.target);
  controls.update();

  function orbitBy(d) {
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), d);
    camera.position.copy(controls.target).add(off);
    controls.update(); kick(true);
  }
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); orbitBy(0.18); }
    if (e.key === 'ArrowRight') { e.preventDefault(); orbitBy(-0.18); }
  });
  document.querySelectorAll('[data-orbit]').forEach((b) => b.addEventListener('click', () => orbitBy(Number(b.dataset.orbit) * 0.3)));

  let playing = !reduceMQ.matches;
  let resumeT = 0;
  const playBtn = document.querySelector('[data-scene-play]');
  function syncPlayBtn() {
    if (!playBtn) return;
    playBtn.setAttribute('aria-pressed', String(!playing));
    playBtn.setAttribute('aria-label', playing ? 'Pause scene motion' : 'Play scene motion');
    playBtn.querySelector('.i-pause').style.display = playing ? '' : 'none';
    playBtn.querySelector('.i-play').style.display = playing ? 'none' : '';
  }
  syncPlayBtn();
  if (playBtn) playBtn.addEventListener('click', () => { playing = !playing; controls.autoRotate = playing; syncPlayBtn(); kick(true); });
  controls.autoRotate = playing;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeT); interactUntil = performance.now() + 4000; kick(true); });
  controls.addEventListener('end', () => { interactUntil = performance.now() + 1800; resumeT = setTimeout(() => { controls.autoRotate = playing; kick(true); }, 2600); kick(true); });
  controls.addEventListener('change', () => kick(true));

  /* signs */
  const signEls = Array.from(hero.querySelectorAll('.sign'));
  const polar = (deg, r, y) => new THREE.Vector3(Math.cos(deg * Math.PI / 180) * r, y, Math.sin(deg * Math.PI / 180) * r);
  const anchors = {
    years: polar(215, 17, 13),
    projects: polar(275, 15, 20),
    models: polar(322, 17, 8),
    tokens: polar(140, 19, 11)
  };
  const tv = new THREE.Vector3();
  const cabinV = new THREE.Vector3(OX + 2, gy + 3, OZ + 1.5);
  const signY = new Map();
  const hit = (a, b, pad) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
  function updateSigns(w, h) {
    tv.copy(cabinV).project(camera);
    const cx = (tv.x * 0.5 + 0.5) * w, cy = (-tv.y * 0.5 + 0.5) * h;
    const placed = [{ x: cx - 80, y: cy - 70, w: 160, h: 140 }];
    signEls.forEach((el) => {
      const a = anchors[el.dataset.key]; if (!a || !el.offsetWidth) return;
      tv.copy(a).project(camera);
      const bw = el.offsetWidth, bh = el.offsetHeight + 0;
      let x = (tv.x * 0.5 + 0.5) * w - bw / 2, y = (-tv.y * 0.5 + 0.5) * h - bh;
      x = Math.max(6, Math.min(w - bw - 6, x));
      y = Math.max(6, Math.min(h - bh - 6, y));
      const r = { x, y, w: bw, h: bh };
      for (let k = 0; k < 6; k++) {
        const o = placed.find((q) => hit(r, q, 8));
        if (!o) break;
        r.y = o.y - bh - 10;
        if (r.y < 6) { r.y = o.y + o.h + 10; r.x = Math.min(w - bw - 6, o.x + o.w + 10); }
      }
      placed.push(r);
      const prev = signY.get(el) || { x: r.x, y: r.y };
      prev.x += (r.x - prev.x) * 0.25; prev.y += (r.y - prev.y) * 0.25;
      signY.set(el, prev);
      el.style.transform = 'translate(' + prev.x.toFixed(1) + 'px,' + prev.y.toFixed(1) + 'px)';
      el.style.opacity = tv.z > 1 ? '0' : '1';
    });
  }

  /* size */
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(86, 22 / (tanH * camera.aspect));
    const o = camera.position.clone().sub(controls.target).setLength(dist);
    camera.position.copy(controls.target).add(o);
    camera.updateProjectionMatrix();
    if (W > 900) camera.setViewOffset(W, H, -W * 0.2, H * 0.02, W, H);
    else if (W <= 860) camera.setViewOffset(W, H, 0, -H * 0.04, W, H);
    else camera.clearViewOffset();
    camera.updateMatrixWorld(true);
    const nx = W > 900 ? 0.5 : 0.56, ny = 0.78;
    const v = new THREE.Vector3(nx, ny, 0.9).unproject(camera).sub(camera.position).normalize();
    orb.position.copy(camera.worldToLocal(camera.position.clone().addScaledVector(v, 150)));
    kick(true);
  }
  new ResizeObserver(resize).observe(canvas);

  /* loop */
  let visible = true, tabVisible = !document.hidden, running = false, last = 0, interactUntil = 0, dirty = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; if (tabVisible) kick(); });
  function kick(mark) { if (mark) dirty = true; if (!running && visible && tabVisible) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    if (!(visible && tabVisible)) { running = false; return; }
    const active = playing || dirty || now < interactUntil;
    if (!active) { running = false; return; }
    requestAnimationFrame(loop);
    if (now - last < 15.5) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const light = themeName() === 'light';
    if (playing) {
      clock += dt;
      updateFall();
      if (light) updateClouds(); else updateMeteors(dt, true);
    }
    controls.update(dt);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    updateSigns(W, H);
    if (!hero.classList.contains('is-ready')) hero.classList.add('is-ready');
    dirty = false;
  }

  window.__rmShot = () => { camera.updateMatrixWorld(); renderer.render(scene, camera); return canvas.toDataURL('image/webp', 0.92); };
  document.addEventListener('rm:themechange', applyTheme);
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', (e) => { playing = !e.matches; controls.autoRotate = playing; syncPlayBtn(); kick(true); });
  updateFall(); updateClouds();
  applyTheme();
  resize();
  /* settle one static frame even if loop paused */
  setTimeout(() => kick(true), 200);
}

if (hero && canvas) init();
