// Smoothness probe: node design-showcase/tools/perf.mjs <folder> [--page index.html] [--theme dark|light]
// Moves a mouse across the hero (comet cursor), then wheel-scrolls the whole page down and back up,
// recording requestAnimationFrame intervals, long tasks, and main-thread style/layout cost.
// Headless Chromium renders in software, so absolute numbers are pessimistic; use it to compare
// before/after and between variants. Gate: p95 frame <= 34ms and janky (>50ms) frames <= 3%.
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';

const folder = process.argv[2];
if (!folder) { console.error('usage: perf.mjs <folder> [--page index.html] [--theme dark]'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const page = arg('--page', 'index.html');
const theme = arg('--theme', 'dark');
const base = arg('--base', 'http://127.0.0.1:4810');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
await p.goto(`${base}/${folder}/${page}${page.includes("?") ? "&" : "?"}theme=${theme}`, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(p);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
const before = await metrics();

await p.evaluate(() => {
  window.__f = []; window.__lt = 0; let last = performance.now();
  const tick = t => { window.__f.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver(l => { window.__lt += l.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
});

// 1) mouse sweep over the hero (~1.5s) to exercise the comet cursor
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  await p.mouse.move(200 + t * 1000, 300 + Math.sin(t * 6.28) * 160);
  await p.waitForTimeout(16);
}
// 2) wheel-scroll down the page and back up
const height = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const steps = Math.min(140, Math.ceil(height / 90));
for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, 90); await p.waitForTimeout(16); }
await p.waitForTimeout(300);
for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, -90); await p.waitForTimeout(16); }
await p.waitForTimeout(300);

const r = await p.evaluate(() => { window.__stop = true; return { f: window.__f.slice(2), lt: window.__lt }; });
const after = await metrics();
const f = r.f.sort((a, b) => a - b);
const q = x => f[Math.min(f.length - 1, Math.floor(f.length * x))] || 0;
const janky = f.filter(x => x > 50).length / Math.max(1, f.length);
const d = k => (after[k] || 0) - (before[k] || 0);
console.log(JSON.stringify({
  folder, page, theme, frames: f.length,
  p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(f[f.length - 1] || 0).toFixed(1),
  jankyPct: +(janky * 100).toFixed(1), longTasks: r.lt,
  styleMs: Math.round(d('RecalcStyleDuration') * 1000), layoutMs: Math.round(d('LayoutDuration') * 1000),
  scriptMs: Math.round(d('ScriptDuration') * 1000), taskMs: Math.round(d('TaskDuration') * 1000),
  verdict: q(0.95) <= 34 && janky <= 0.03 ? 'PASS' : 'FAIL', errors
}));
await browser.close();
