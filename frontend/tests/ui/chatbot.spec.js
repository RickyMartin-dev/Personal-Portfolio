const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '../../dist');
const base = 'https://portfolio.test';
const pages = [
  { name: 'home', url: `${base}/index.html` },
  { name: 'about', url: `${base}/pages/about.html` },
  { name: 'games', url: `${base}/pages/games.html` }
];

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }[extension] || 'application/octet-stream';
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route(`${base}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname.endsWith('/')
      ? `${requestUrl.pathname}index.html`
      : requestUrl.pathname;
    const filePath = path.resolve(siteRoot, `.${pathname}`);
    if (!filePath.startsWith(`${siteRoot}${path.sep}`)) {
      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }

    try {
      await route.fulfill({
        status: 200,
        contentType: contentTypeFor(filePath),
        body: readFileSync(filePath)
      });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
});

test('every page loads without console errors, overflow, or leftover template references', async ({ page }) => {
  const problems = [];
  page.on('console', (message) => {
    // Google Fonts are blocked in tests on purpose; anything else is a real problem.
    if (['error', 'warning'].includes(message.type()) && !/fonts\.(googleapis|gstatic)/.test(message.text() + (message.location().url || ''))) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400) {
      problems.push(`${response.status()} ${response.url()}`);
    }
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const target of pages) {
      await page.goto(target.url);
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
        'content',
        'width=device-width, initial-scale=1'
      );
      const icon = page.locator('link[rel="icon"]');
      await expect(icon).toHaveAttribute('href', /assets\/favicon\.svg$/);
      const iconStatus = await icon.evaluate((el) => fetch(el.href).then((r) => r.status));
      expect(iconStatus, 'favicon').toBe(200);
      await expect(page.locator('.brand .lg-mark')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.site-footer')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(overflow, `${target.name} @ ${viewport.width}`).toBe(false);
    }
  }

  await page.goto(pages[0].url);
  await expect(page.locator('.spots')).toContainText('8+ yrs');
  await expect(page.locator('.work-row')).toHaveCount(3);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /AI\/ML/);
  await page.goto(pages[1].url);
  await expect(page.getByText(/8\+ years of experience/)).toBeVisible();
  await expect(page.locator('.portrait img')).toHaveJSProperty('complete', true);

  expect(problems).toEqual([]);
});

test('primary navigation links work across home, about, and games', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(pages[0].url);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(`${base}/pages/about.html`);
  await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Games' }).click();
  await expect(page).toHaveURL(`${base}/pages/games.html`);
  await expect(nav.getByRole('link', { name: 'Games' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(`${base}/index.html`);

  await page.getByRole('link', { name: 'Ricky Martin, home' }).click();
  await expect(page).toHaveURL(`${base}/index.html`);
});

test('theme toggle switches between light and dark and is remembered', async ({ page }) => {
  for (const target of pages) {
    await page.goto(target.url);
    const html = page.locator('html');
    const toggle = page.locator('[data-theme-toggle]');
    const initial = await html.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(initial);
    const other = initial === 'dark' ? 'light' : 'dark';

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', other);
    await expect(toggle).toHaveAttribute('aria-pressed', String(other === 'dark'));
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', other);

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', initial);
  }
});

test('follows the operating system colour scheme until the visitor chooses', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(pages[0].url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(pages[0].url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('shows an accessible under-construction warning without making API calls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const backendRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === '/chat' ||
      url.hostname.endsWith('.execute-api.us-east-1.amazonaws.com') ||
      /chatbot\.(config\.)?js$/.test(url.pathname)
    ) {
      backendRequests.push(request.url());
    }
  });

  for (const target of pages) {
    await page.goto(target.url);
    const launcher = page.getByRole('button', { name: 'Ask about Ricky' });
    await expect(launcher).toBeVisible();
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');

    await launcher.focus();
    await page.keyboard.press('Enter');
    const notice = page.getByRole('dialog', { name: 'Ask about Ricky' });
    await expect(notice).toBeVisible();
    await expect(launcher).toHaveAttribute('aria-expanded', 'true');
    await expect(notice).toContainText('being rebuilt');
    const closeButton = page.getByRole('button', { name: 'Close assistant panel' });
    await expect(closeButton).toBeFocused();
    await expect(notice.getByRole('textbox')).toHaveCount(0);
    await expect(notice.getByRole('button', { name: /Send message/ })).toHaveCount(0);
    const box = await notice.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.y + box.height).toBeLessThanOrEqual(640);

    await page.keyboard.press('Escape');
    await expect(notice).toBeHidden();
    await expect(launcher).toBeFocused();

    await launcher.click();
    await expect(notice).toBeVisible();
    await closeButton.click();
    await expect(notice).toBeHidden();
    await expect(launcher).toBeFocused();
  }

  expect(backendRequests).toEqual([]);
});

test('contact form validates and posts to Web3Forms only after valid input', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const posts = [];
  await page.route('https://api.web3forms.com/**', async (route) => {
    posts.push(route.request().postData() || '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
  });
  await page.goto(pages[0].url);
  const form = page.locator('#contact-form');
  await expect(form).toHaveAttribute('action', 'https://api.web3forms.com/submit');
  // The suite builds with a placeholder key; production uses the WEB3FORMS_KEY secret.
  await expect(form.locator('input[name="access_key"]')).toHaveValue('playwright-test-key');

  await form.getByRole('button', { name: /Send message/ }).click();
  await expect(page.locator('#cf-name-err')).not.toBeEmpty();
  expect(posts).toEqual([]);

  await page.locator('#cf-name').fill('Ada Lovelace');
  await page.locator('#cf-email').fill('ada@example.com');
  await page.locator('#cf-msg').fill('Hello there');
  await form.getByRole('button', { name: /Send message/ }).click();
  await expect(page.locator('#form-ok')).toBeVisible();
  await expect(page.locator('#ok-name')).toHaveText('Ada');
  expect(posts).toHaveLength(1);
});

test('games page opens playable Tetris and Road Racer and closes them with keyboard or button', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(pages[2].url);
    await expect(page.locator('.game.soon .btn')).toHaveCount(0);

    for (const [game, title] of [['Tetris', 'Tetris'], ['Road Racer', 'Road Racer']]) {
      const play = page.getByRole('button', { name: `Play ${game}` });
      await play.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: title });
      await expect(dialog).toBeVisible();
      const canvas = dialog.locator('canvas');
      await expect(canvas).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Close game' })).toBeVisible();
      if (game === 'Tetris') {
        await expect(page.getByRole('button', { name: 'Rotate' })).toHaveCount(viewport.width < 640 ? 1 : 0);
      }
      // The canvas has real drawn pixels once the game loop starts.
      await page.waitForTimeout(300);
      const painted = await canvas.evaluate((el) => {
        const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
        for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
        return false;
      });
      expect(painted, game).toBe(true);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(play).toBeFocused();
    }

    await page.getByRole('button', { name: 'Play Tetris' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tetris' });
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Close game' }).click();
    await expect(dialog).toBeHidden();
  }

  expect(errors).toEqual([]);
});
