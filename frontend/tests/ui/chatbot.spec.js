const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '../../dist');

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }[extension] || 'application/octet-stream';
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://portfolio.test/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const filePath = path.resolve(siteRoot, `.${requestUrl.pathname}`);
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
  await page.goto('https://portfolio.test/pages/index.html');
});

test('keeps all pages mobile-friendly and avoids duplicated selected work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const pageName of ['index', 'about', 'elements']) {
    await page.goto(`https://portfolio.test/pages/${pageName}.html`);

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      'width=device-width, initial-scale=1'
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      '../images/dolphin.png'
    );

    const menuButton = page.locator('#nav-hamburger');
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('type', 'button');
    await expect(menuButton).toHaveAttribute('aria-controls', 'nav-overlay');
    await menuButton.focus();
    await page.keyboard.press('Enter');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-overlay')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    const themeButton = page.getByRole('button', { name: /Switch to/ });
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      initialTheme === 'dark' ? 'light' : 'dark'
    );
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', initialTheme);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow, pageName).toBe(false);

    if (pageName === 'index') {
      await expect(page.locator('.projects-grid > .project-card')).toHaveCount(3);
      await expect(page.locator('.kpi-card__value').first()).toHaveText('8+');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        /8\+ years/
      );
    }

    if (pageName === 'about') {
      await expect(page.getByText(/with 8\+ years of experience/)).toBeVisible();
    }

    if (pageName === 'elements') {
      await page.getByRole('button', { name: 'Play Tetris' }).click();
      const gameDialog = page.getByRole('dialog', { name: 'Tetris' });
      await expect(gameDialog).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rotate' })).toBeVisible();
      await page.getByRole('button', { name: 'Close game' }).click();
      await expect(gameDialog).toBeHidden();
    }
  }
});

test('shows an accessible under-construction warning without making API calls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const backendRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/chat' || url.hostname.endsWith('.execute-api.us-east-1.amazonaws.com')) {
      backendRequests.push(request.url());
    }
  });

  for (const pageName of ['index', 'about']) {
    await page.goto(`https://portfolio.test/pages/${pageName}.html`);
    const launcher = page.getByRole('button', { name: 'Chatbot under construction' });
    await expect(launcher).toBeVisible();
    await expect(launcher.locator('.chatbot-button__warning')).toHaveText('⚠');

    await launcher.focus();
    await page.keyboard.press('Enter');
    const notice = page.getByRole('dialog', { name: /Under construction/ });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('currently being updated');
    await expect(page.locator('#chatbot-close')).toBeFocused();
    await expect(notice.getByRole('textbox')).toHaveCount(0);
    await expect(notice.getByRole('button', { name: /Send message/ })).toHaveCount(0);
    const panel = await notice.boundingBox();
    expect(panel).not.toBeNull();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(320);
    expect(panel.y + panel.height).toBeLessThanOrEqual(640);

    await page.keyboard.press('Escape');
    await expect(notice).toBeHidden();
    await expect(launcher).toBeFocused();

    await launcher.click();
    await expect(notice).toBeVisible();
    await page.getByRole('button', { name: 'Close notice' }).click();
    await expect(notice).toBeHidden();
    await expect(launcher).toBeFocused();
  }

  expect(backendRequests).toEqual([]);
});
