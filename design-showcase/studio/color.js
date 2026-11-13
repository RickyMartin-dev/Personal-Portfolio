/* Colour maths for the studio: hex/hsl, WCAG contrast, harmony generators. */
(function () {
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function parseHex(s) {
    if (typeof s !== 'string') return null;
    let m = s.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(m)) m = m.split('').map(c => c + c).join('');
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(m)) return null;
    return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
  }
  const toHex = ({ r, g, b }) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  function normHex(s) { const p = parseHex(s); return p ? toHex(p) : null; }
  function rgb2hsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, s = 0; const l = (mx + mn) / 2;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function hsl2rgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  const hexHsl = hex => { const p = parseHex(hex); return p ? rgb2hsl(p) : null; };
  const hslHex = hsl => toHex(hsl2rgb(hsl));
  function lum(p) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
  }
  function contrast(a, b) {
    const pa = parseHex(a), pb = parseHex(b); if (!pa || !pb) return null;
    const la = lum(pa), lb = lum(pb); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  const OFFS = {
    analogous: [-40, -20, 0, 20, 40],
    triadic: [0, 120, 240, 20, 260],
    complementary: [0, 20, 180, 200, 160],
    split: [0, 150, 210, 30, 180],
    monochrome: [0, 8, -8, 16, -16]
  };
  // Build 5 seeds around the seed at `idx`, keeping each slot's tone (s/l).
  function harmony(seeds, idx, mode) {
    const base = hexHsl(seeds[idx]); if (!base) return seeds.slice();
    const off = OFFS[mode] || OFFS.analogous;
    return seeds.map((hex, j) => {
      if (j === idx) return hex;
      const cur = hexHsl(hex) || base;
      let l = cur.l, s = cur.s;
      if (mode === 'monochrome') { s = base.s; l = clamp(base.l + (j - idx) * 7, 22, 86); }
      return hslHex({ h: base.h + off[j] - off[idx], s, l });
    });
  }
  function nudge(seeds, dh, ds, dl) {
    return seeds.map(hex => { const c = hexHsl(hex); return c ? hslHex({ h: c.h + dh, s: clamp(c.s + ds, 0, 100), l: clamp(c.l + dl, 4, 96) }) : hex; });
  }
  function randomise(seeds, locks, dark) {
    return seeds.map((hex, i) => {
      if (locks[i]) return hex;
      const c = hexHsl(hex) || { l: dark ? 65 : 45 };
      return hslHex({ h: Math.random() * 360, s: 55 + Math.random() * 35, l: clamp(c.l + (Math.random() - .5) * 10, dark ? 52 : 30, dark ? 78 : 56) });
    });
  }
  function shuffle(seeds, locks) {
    const idx = seeds.map((_, i) => i).filter(i => !locks[i]); const vals = idx.map(i => seeds[i]);
    for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
    const out = seeds.slice(); idx.forEach((i, k) => out[i] = vals[k]); return out;
  }
  function derive(seeds, toLight) {
    return seeds.map(hex => {
      const c = hexHsl(hex); if (!c) return hex;
      return toLight ? hslHex({ h: c.h, s: clamp(c.s + 4, 0, 100), l: clamp(c.l * 0.7, 30, 50) })
                     : hslHex({ h: c.h, s: clamp(c.s - 6, 0, 100), l: clamp(c.l * 1.3 + 6, 56, 80) });
    });
  }
  window.RMColor = { parseHex, normHex, toHex, hexHsl, hslHex, contrast, harmony, nudge, randomise, shuffle, derive, modes: Object.keys(OFFS), clamp };
})();
