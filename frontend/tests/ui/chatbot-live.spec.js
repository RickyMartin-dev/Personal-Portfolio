const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '../../dist');
const base = 'https://portfolio.test';
const endpoint = 'https://api.example.test/chat';

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  return {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
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

test('sends bounded in-memory chat history and opens/closes accessibly', async ({ page }) => {
  const requests = [];
  await page.route(endpoint, async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Answer ${requests.length}` })
    });
  });
  await page.goto(`${base}/index.html`);
  const launcher = page.getByRole('button', { name: 'Ask about Ricky' });
  await launcher.click();
  const panel = page.getByRole('dialog', { name: 'Ask about Ricky' });
  const input = panel.getByRole('textbox', { name: 'Your question' });
  await expect(panel).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill('What does Ricky work on?');
  await input.press('Enter');
  await expect(panel).toContainText('Answer 1');
  await input.fill('Which skills does he use?');
  await input.press('Enter');
  await expect(panel).toContainText('Answer 2');
  expect(requests).toEqual([
    { input: 'What does Ricky work on?', history: [] },
    {
      input: 'Which skills does he use?',
      history: [
        { role: 'user', content: 'What does Ricky work on?' },
        { role: 'assistant', content: 'Answer 1' }
      ]
    }
  ]);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
});

test('shows quota and service errors without discarding the visitor draft', async ({ page }) => {
  await page.route(endpoint, async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    const status = body.input === 'quota' ? 429 : body.input === 'service' ? 503 : 0;
    if (status) {
      await route.fulfill({ status, contentType: 'application/json', body: '{"detail":"Unavailable"}' });
    } else {
      await route.abort('failed');
    }
  });
  await page.goto(`${base}/index.html`);
  await page.getByRole('button', { name: 'Ask about Ricky' }).click();
  const panel = page.getByRole('dialog', { name: 'Ask about Ricky' });
  const input = panel.getByRole('textbox', { name: 'Your question' });

  for (const [draft, message] of [
    ['quota', 'reached its request limit'],
    ['service', 'temporarily unavailable'],
    ['network', 'Could not connect']
  ]) {
    await input.fill(draft);
    await input.press('Enter');
    await expect(panel).toContainText(message);
    await expect(input).toHaveValue(draft);
  }
});

test('uses a viewport-contained bottom sheet on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(endpoint, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"message":"Hello"}'
  }));
  await page.goto(`${base}/index.html`);
  await page.getByRole('button', { name: 'Ask about Ricky' }).click();
  const panel = page.getByRole('dialog', { name: 'Ask about Ricky' });
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
});
