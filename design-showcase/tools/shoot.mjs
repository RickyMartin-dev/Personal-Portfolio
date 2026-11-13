// Screenshot a design version: node design-showcase/tools/shoot.mjs v1-meridian [--pages home,about,games] [--full] [--query "tune=open"]
// Writes design-showcase/_review/<version>/<page>-<theme>-<viewport>.png and prints console errors.
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const version = process.argv[2];
if (!version) { console.error('usage: shoot.mjs <version-folder> [--pages a,b] [--full] [--base url]'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const pages = arg('--pages', 'home,about,games').split(',');
const full = process.argv.includes('--full');
const base = arg('--base', 'http://127.0.0.1:4810');
const query = arg('--query', ''); // e.g. --query 'tune=open'
const files = { home: 'index.html', about: 'about.html', games: 'games.html' };
const out = join(here, '..', '_review', version);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const viewports = [['desktop', 1440, 900], ['mobile', 390, 844]];
for (const page of pages) {
  for (const theme of ['dark', 'light']) {
    for (const [vname, w, h] of viewports) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
      const p = await ctx.newPage();
      const errors = [];
      p.on('pageerror', e => errors.push('pageerror: ' + e.message));
      p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await p.goto(`${base}/${version}/${files[page]}?theme=${theme}${query ? "&" + query : ""}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errors.push('goto: ' + e.message));
      await p.waitForTimeout(2500);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => 0);
      const file = join(out, `${page}-${theme}-${vname}.png`);
      await p.screenshot({ path: file, fullPage: full }).catch(e => errors.push('shot: ' + e.message));
      console.log(`${file}${overflow > 0 ? `  [HORIZONTAL OVERFLOW ${overflow}px]` : ''}`);
      errors.forEach(e => console.log('   ' + e));
      await ctx.close();
    }
  }
}
await browser.close();
