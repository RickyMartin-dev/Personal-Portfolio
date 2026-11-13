import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('scene');
const root = document.documentElement;

function boot() {
  if (!canvas) return;
  const lite = canvas.dataset.scene === 'lite';
  const small = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    root.classList.add('no-webgl');
    return;
  }
  const dprCap = small ? 1.25 : 2;
  const dpr = () => Math.min(window.devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(dpr());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2600);
  camera.rotation.order = 'YXZ';
  const rig = new THREE.Group(); // follows the camera: sky, stars, meteors sit at infinity
  scene.add(rig);

  /* ---------- palettes ---------- */
  const C = (h) => new THREE.Color(h);
  const P = {
    dark: {
      horizon: C('#25396a'), mid: C('#0c1735'), zenith: C('#02040d'),
      light: C('#c8d6f5'), lightGain: 1.0, discGain: 3.2, discSize: 0.0105, glow: 0.35,
      rock: C('#070d1e'), snow: C('#8fa6d4'), rim: C('#d9e4ff'), ambient: C('#24365f'),
      fog: C('#17264a'), fogDensity: 0.0024, rimGain: 1.1,
      lightDir: new THREE.Vector3(-0.34, 0.5, -0.8),
      bloom: 0.95, bloomThreshold: 0.82, exposure: 1.05, grain: 0.055, vig: 0.62, day: 0
    },
    light: {
      horizon: C('#ffcf9c'), mid: C('#f2a2a6'), zenith: C('#5f8fd6'),
      light: C('#ffc88a'), lightGain: 1.0, discGain: 7.5, discSize: 0.016, glow: 1.25,
      rock: C('#1d1440'), snow: C('#ffd9c0'), rim: C('#ffb06a'), ambient: C('#5a4378'),
      fog: C('#f2b3a0'), fogDensity: 0.0019, rimGain: 2.1,
      lightDir: new THREE.Vector3(-0.38, 0.26, -0.89),
      bloom: 0.55, bloomThreshold: 0.92, exposure: 0.95, grain: 0.04, vig: 0.42, day: 1
    }
  };
  P.dark.lightDir.normalize(); P.light.lightDir.normalize();

  /* ---------- noise (terrain) ---------- */
  const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += vnoise(x * f, y * f) * a; f *= 2.02; a *= 0.5; } return s; };
  const ridged = (x, y, o) => {
    let s = 0, a = 0.5, f = 1, w = 1;
    for (let i = 0; i < o; i++) {
      let n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); n *= n; n *= w; w = Math.min(1, n * 2);
      s += n * a; f *= 2.03; a *= 0.5;
    }
    return s;
  };
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pathX = (z) => Math.sin(z * 0.011) * 28;
  function height(x, z) {
    const d = Math.abs(x - pathX(z));
    const valley = sm(14, 170, d);
    const far = sm(-60, -520, z);
    const r = ridged(x * 0.0065 + 11.3, z * 0.0065 + 4.1, lite ? 5 : 6);
    const m = fbm(x * 0.02 + 2, z * 0.02 + 9, 4);
    let h = m * 9;
    h += valley * (r * 88 + m * 16);
    h += far * (r * 100 + 26);
    h += sm(-380, -760, z) * 60;
    return h;
  }

  /* ---------- sky ---------- */
  const noiseGLSL = `
    float h31(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float f3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=n3(p)*a; p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
  `;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: {
        uHorizon: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() },
        uLightDir: { value: new THREE.Vector3(0, 0.3, -1) }, uLightColor: { value: new THREE.Color() },
        uDay: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 1 }, uDiscGain: { value: 1 }, uDiscSize: { value: 0.01 }
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uHorizon,uMid,uZenith,uLightDir,uLightColor;
        uniform float uDay,uTime,uGlow,uDiscGain,uDiscSize;
        ${noiseGLSL}
        void main(){
          vec3 d = normalize(vDir);
          float e = d.y;
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, e));
          col = mix(col, uZenith, smoothstep(0.18, 0.95, e));
          col = mix(uHorizon*0.9, col, smoothstep(-0.12, 0.0, e));
          float ld = max(dot(d, uLightDir), 0.0);
          col += uLightColor * (pow(ld, 6.0)*0.18 + pow(ld, 40.0)*0.55) * uGlow;
          float ang = acos(clamp(ld,0.0,1.0));
          float disc = smoothstep(uDiscSize, uDiscSize*0.86, ang);
          col += uLightColor * disc * uDiscGain * smoothstep(-0.02, 0.01, e + 0.012);
          float night = 1.0 - uDay;
          if (night > 0.001) {
            vec3 bn = normalize(vec3(0.7, 0.8, 0.46));
            float b = dot(d, bn);
            float band = exp(-b*b*12.0);
            float cloud = f3(d*3.2 + vec3(2.0));
            float lanes = smoothstep(0.42, 0.72, f3(d*7.5 + vec3(5.0, 1.0, 8.0)));
            float core = exp(-b*b*70.0) * (0.6 + 0.8*f3(d*5.0+vec3(9.0)));
            float mw = band * (0.25 + 0.95*cloud) * (1.0 - 0.8*lanes*band) + core*0.55;
            vec3 mwCol = mix(vec3(0.36,0.46,0.78), vec3(1.0,0.74,0.52), smoothstep(0.35,0.75,f3(d*2.0+vec3(4.0))));
            vec3 stars = vec3(0.0);
            for (int k = 0; k < 2; k++) {
              float sc = k == 0 ? 140.0 : 260.0;
              vec3 p = d * sc; vec3 id = floor(p); vec3 f = fract(p) - 0.5;
              float r = h31(id + float(k)*13.0);
              float thr = (k == 0 ? 0.972 : 0.958) - band*0.06;
              if (r > thr) {
                vec3 off = vec3(h31(id+1.3), h31(id+2.7), h31(id+4.1)) - 0.5;
                float dd = length(f - off*0.6);
                float s = smoothstep(0.16, 0.0, dd) * (0.35 + 1.3*h31(id+9.0));
                float tw = 0.75 + 0.25*sin(uTime*(1.0+h31(id)*3.0) + h31(id+5.0)*6.28);
                stars += mix(vec3(0.75,0.85,1.0), vec3(1.0,0.86,0.7), h31(id+3.0)) * s * tw;
              }
            }
            float vis = night * smoothstep(-0.02, 0.18, e);
            col += (mwCol * mw * 0.5 + stars * 1.1) * vis;
          }
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  sky.renderOrder = -10; sky.frustumCulled = false;
  rig.add(sky);

  /* ---------- instanced stars ---------- */
  const starCount = small ? 450 : 1300;
  const starGeo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  starGeo.index = quad.index;
  starGeo.setAttribute('position', quad.getAttribute('position'));
  starGeo.setAttribute('uv', quad.getAttribute('uv'));
  const off = new Float32Array(starCount * 3), sz = new Float32Array(starCount), ph = new Float32Array(starCount), tint = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    let x, y, z; do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.1 || y < 0.04 * Math.sqrt(x * x + y * y + z * z));
    const l = Math.hypot(x, y, z) / 900; off.set([x / l, y / l, z / l], i * 3);
    sz[i] = 2.2 + Math.pow(Math.random(), 5) * 9; ph[i] = Math.random() * 6.283; tint[i] = Math.random();
  }
  starGeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  starGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 1));
  starGeo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  starGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uNight: { value: 1 } },
    vertexShader: `
      attribute vec3 aOff; attribute float aSize, aPh, aTint;
      uniform float uTime, uNight; varying vec2 vUv; varying float vI; varying float vT;
      void main(){
        vec4 mv = modelViewMatrix * vec4(aOff, 1.0);
        mv.xy += position.xy * aSize;
        float tw = 0.7 + 0.3*sin(uTime*(1.2+aTint*2.5) + aPh);
        vI = tw * uNight * smoothstep(0.0, 0.2, normalize(aOff).y) * (0.5 + aSize*0.18);
        vT = aTint; vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vI; varying float vT;
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(1.0 - d, 0.0), 2.4);
        vec3 c = mix(vec3(0.7,0.82,1.0), vec3(1.0,0.84,0.66), vT);
        gl_FragColor = vec4(c * a * vI * 1.6, a);
      }`
  });
  const stars = new THREE.Mesh(starGeo, starMat);
  stars.frustumCulled = false; stars.renderOrder = -9;
  rig.add(stars);

  /* ---------- terrain ---------- */
  const segX = small ? 120 : lite ? 150 : 230, segZ = small ? 170 : lite ? 220 : 330;
  const tg = new THREE.PlaneGeometry(900, 1100, segX, segZ);
  tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -380);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  tg.computeVertexNormals();
  const terrainMat = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() }, uLightDir: { value: new THREE.Vector3() }, uLightColor: { value: new THREE.Color() },
      uRock: { value: new THREE.Color() }, uSnow: { value: new THREE.Color() }, uRim: { value: new THREE.Color() },
      uAmbient: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.003 }, uRimGain: { value: 1.5 }
    },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vW = position; vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vW; varying vec3 vN;
      uniform vec3 uCam,uLightDir,uLightColor,uRock,uSnow,uRim,uAmbient,uFog; uniform float uFogDensity,uRimGain;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec3 N = normalize(vN);
        vec3 toCam = uCam - vW; float dist = length(toCam); vec3 V = toCam / dist;
        float det = n2(vW.xz*0.35)*0.6 + n2(vW.xz*1.3)*0.4;
        N = normalize(N + vec3(det-0.5, 0.0, n2(vW.zx*0.5)-0.5)*0.14);
        float ndl = dot(N, uLightDir);
        float diff = pow(clamp(ndl*0.5+0.5, 0.0, 1.0), 2.0);
        float slope = 1.0 - N.y;
        float snow = smoothstep(62.0, 118.0, vW.y + (det-0.5)*34.0) * smoothstep(0.62, 0.2, slope);
        vec3 base = mix(uRock * (0.75 + 0.5*det), uSnow, snow);
        vec3 col = base * (uAmbient * 0.7 + uLightColor * diff * 1.5);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
        col += uRim * fres * uRimGain * smoothstep(-0.25, 0.7, ndl) * (0.25 + 0.75*smoothstep(10.0, 90.0, vW.y));
        col += uRim * snow * max(ndl, 0.0) * 0.6;
        float fogF = 1.0 - exp(-pow(dist * uFogDensity, 1.35));
        float mist = exp(-max(vW.y, 0.0) * 0.03) * 0.3 * smoothstep(40.0, 320.0, dist);
        fogF = clamp(fogF + mist, 0.0, 1.0);
        col = mix(col, uFog, fogF);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const terrain = new THREE.Mesh(tg, terrainMat);
  terrain.frustumCulled = false; terrain.renderOrder = 0;
  scene.add(terrain);

  /* ---------- meteors ---------- */
  const mGeo = new THREE.PlaneGeometry(1, 1); mGeo.translate(-0.5, 0, 0);
  const meteors = [];
  const meteorCount = lite ? 3 : small ? 5 : 8;
  for (let i = 0; i < meteorCount; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#ffb25a') }, uAlpha: { value: 0 }, uGain: { value: 6 }, uAdd: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha,uGain,uAdd;
        void main(){
          float along = vUv.x; float across = abs(vUv.y - 0.5) * 2.0;
          float core = pow(along, 3.5) * pow(max(1.0-across,0.0), 2.4);
          float head = exp(-pow((1.0-along)*16.0, 2.0)) * exp(-across*across*5.0) * 1.6;
          float a = (core + head) * uAlpha;
          if (uAdd > 0.5) gl_FragColor = vec4(uColor * uGain, clamp(a,0.0,1.0));
          else gl_FragColor = vec4(uColor, clamp(a*0.85,0.0,1.0));
        }`
    });
    const m = new THREE.Mesh(mGeo, mat);
    m.visible = false; m.frustumCulled = false; m.renderOrder = 5;
    rig.add(m);
    meteors.push({ m, t: 0, life: 1, speed: 0, active: false });
  }
  let nextMeteor = 0.4;
  function spawnMeteor(mt, isDay) {
    const az = (Math.random() - 0.5) * 1.7 - Math.PI / 2;
    const el = 0.22 + Math.random() * 0.75;
    const r = 800;
    mt.m.position.set(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
    mt.m.lookAt(camera.position);
    mt.m.rotateZ(Math.PI + (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5));
    const len = (isDay ? 260 : 190) * (0.7 + Math.random() * 0.8);
    mt.m.scale.set(len, isDay ? 2.4 : 4.2 + Math.random() * 2.4, 1);
    mt.life = isDay ? 1.7 + Math.random() * 0.8 : 0.8 + Math.random() * 0.7;
    mt.speed = (isDay ? 150 : 420) * (0.8 + Math.random() * 0.5);
    mt.t = 0; mt.active = true; mt.m.visible = true;
    mt.m.material.uniforms.uAdd.value = isDay ? 0 : 1;
    mt.m.material.blending = isDay ? THREE.NormalBlending : THREE.AdditiveBlending;
    mt.m.material.uniforms.uColor.value.set(isDay ? '#fffaf2' : Math.random() < 0.7 ? '#ffb25a' : '#ffd9a8');
    mt.m.material.needsUpdate = true;
  }
  function updateMeteors(dt, isDay) {
    nextMeteor -= dt;
    if (nextMeteor <= 0) {
      const free = meteors.find((x) => !x.active);
      if (free) spawnMeteor(free, isDay);
      nextMeteor = isDay ? 2.2 + Math.random() * 3 : 0.5 + Math.random() * 1.8;
    }
    for (const mt of meteors) {
      if (!mt.active) continue;
      mt.t += dt;
      const k = mt.t / mt.life;
      if (k >= 1) { mt.active = false; mt.m.visible = false; continue; }
      mt.m.translateX(mt.speed * dt);
      mt.m.material.uniforms.uAlpha.value = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 1.0;
    }
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.7, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.05 }, uVig: { value: 0.6 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime,uGrain,uVig; uniform vec2 uRes;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 q = vUv - 0.5; q.x *= uRes.x/uRes.y;
        float v = smoothstep(0.95, 0.15, length(q)*1.05);
        c.rgb *= mix(1.0 - uVig*0.55, 1.0, v);
        float g = h(vUv*uRes + fract(uTime)*91.7) - 0.5;
        c.rgb += g * uGrain * (1.0 - dot(c.rgb, vec3(0.33))*0.6);
        gl_FragColor = vec4(c.rgb, 1.0);
      }`
  });
  composer.addPass(film);
  bloom.enabled = !(lite && small);

  /* ---------- theme mixing ---------- */
  let mix = root.dataset.theme === 'light' ? 1 : 0, mixTarget = mix;
  const tmp = new THREE.Color();
  const lerpC = (target, a, b, t) => { target.copy(a).lerp(b, t); };
  function applyMix(t) {
    const a = P.dark, b = P.light;
    const su = sky.material.uniforms;
    lerpC(su.uHorizon.value, a.horizon, b.horizon, t); lerpC(su.uMid.value, a.mid, b.mid, t); lerpC(su.uZenith.value, a.zenith, b.zenith, t);
    lerpC(su.uLightColor.value, a.light, b.light, t);
    su.uDay.value = t; su.uGlow.value = a.glow + (b.glow - a.glow) * t;
    su.uDiscGain.value = a.discGain + (b.discGain - a.discGain) * t; su.uDiscSize.value = a.discSize + (b.discSize - a.discSize) * t;
    const L = su.uLightDir.value; L.copy(a.lightDir).lerp(b.lightDir, t).normalize();
    const tu = terrainMat.uniforms;
    tu.uLightDir.value.copy(L); lerpC(tu.uLightColor.value, a.light, b.light, t);
    lerpC(tu.uRock.value, a.rock, b.rock, t); lerpC(tu.uSnow.value, a.snow, b.snow, t); lerpC(tu.uRim.value, a.rim, b.rim, t);
    lerpC(tu.uAmbient.value, a.ambient, b.ambient, t); lerpC(tu.uFog.value, a.fog, b.fog, t);
    tu.uFogDensity.value = a.fogDensity + (b.fogDensity - a.fogDensity) * t; tu.uRimGain.value = a.rimGain + (b.rimGain - a.rimGain) * t;
    starMat.uniforms.uNight.value = 1 - t;
    bloom.strength = (a.bloom + (b.bloom - a.bloom) * t) * (lite ? 0.8 : 1);
    bloom.threshold = a.bloomThreshold + (b.bloomThreshold - a.bloomThreshold) * t; bloom.radius = 0.7;
    renderer.toneMappingExposure = a.exposure + (b.exposure - a.exposure) * t;
    film.uniforms.uGrain.value = a.grain + (b.grain - a.grain) * t; film.uniforms.uVig.value = a.vig + (b.vig - a.vig) * t;
  }
  applyMix(mix);
  document.addEventListener('rm:themechange', (e) => {
    mixTarget = e.detail.theme === 'light' ? 1 : 0;
    if (reduce) { mix = mixTarget; applyMix(mix); drawOnce(); }
  });

  /* ---------- camera / scroll ---------- */
  let target = 0, prog = 0;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const readScroll = () => { const max = Math.max(1, root.scrollHeight - innerHeight); target = lite ? Math.min(1, scrollY / max) * 0.25 : Math.min(1, Math.max(0, scrollY / max)); };
  addEventListener('scroll', () => { readScroll(); if (reduce) drawOnce(); }, { passive: true });
  if (!reduce) addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth - 0.5; ptr.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function place(p, time) {
    const baseP = lite ? 0.18 + p : p;
    const x = Math.sin(baseP * 3.0) * 14 + ptr.sx * 6;
    const z = 120 - baseP * 400;
    let y = 24 + baseP * 72 + ptr.sy * -3;
    y = Math.max(y, height(x, z) + 16);
    camera.position.set(x, y, z);
    camera.rotation.y = Math.sin(baseP * 4.0) * 0.12 - ptr.sx * 0.05;
    camera.rotation.x = (lite ? 0.2 : 0.35 - baseP * 0.38) - ptr.sy * 0.03 + Math.sin(time * 0.2) * 0.003;
    rig.position.copy(camera.position);
    terrainMat.uniforms.uCam.value.copy(camera.position);
  }

  /* ---------- sizing ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(dpr());
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr());
    composer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w / h < 0.8 ? 74 : w / h < 1.2 ? 64 : 54; camera.updateProjectionMatrix();
    film.uniforms.uRes.value.set(w * dpr(), h * dpr());
  }
  resize();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { resize(); if (reduce) drawOnce(); }, 120); });

  /* ---------- loop ---------- */
  let time = 0, last = 0, raf = 0, visible = true, ready = false;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
    if (lite && dt < 0.03) { raf = requestAnimationFrame(frame); return; }
    time += dt;
    prog += (target - prog) * (1 - Math.exp(-dt * 2.6));
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 3)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 3));
    if (Math.abs(mix - mixTarget) > 0.001) { mix += Math.sign(mixTarget - mix) * Math.min(Math.abs(mixTarget - mix), dt / 0.9); applyMix(mix); }
    place(prog, time);
    updateMeteors(dt, mix > 0.5);
    sky.material.uniforms.uTime.value = time; starMat.uniforms.uTime.value = time; film.uniforms.uTime.value = time;
    composer.render(dt);
    if (!ready) { ready = true; root.classList.add('scene-ready'); }
    raf = requestAnimationFrame(frame);
  }
  function drawOnce() {
    prog = target; place(prog, 0);
    sky.material.uniforms.uTime.value = 3.0; starMat.uniforms.uTime.value = 3.0;
    if (!meteors.some((x) => x.active)) { // freeze a single streak into the still frame
      const mt = meteors[0]; spawnMeteor(mt, mix > 0.5); mt.t = mt.life * 0.45; mt.m.translateX(mt.speed * mt.t);
      mt.m.material.uniforms.uAlpha.value = 0.95;
    }
    composer.render(0.016);
    if (!ready) { ready = true; root.classList.add('scene-ready'); }
  }
  readScroll();
  if (reduce) { prog = target; drawOnce(); }
  else { prog = target; raf = requestAnimationFrame(frame); }

  const resume = () => { if (!reduce && !raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', resume);
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; resume(); }).observe(canvas);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.add('no-webgl'); });
  window.__scene = { ready: () => ready };
}

try { boot(); } catch (err) { root.classList.add('no-webgl'); console.warn('scene unavailable'); }
