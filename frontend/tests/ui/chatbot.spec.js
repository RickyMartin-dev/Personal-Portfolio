const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '../..');

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

async function openChat(page) {
  const launcher = page.getByRole('button', { name: "Open chat with Ricky's assistant" });
  await launcher.focus();
  await page.keyboard.press('Enter');
  const launcherControl = page.locator('#chatbot-button');
  await expect(launcherControl).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('textbox', { name: 'Your message' })).toBeFocused();
  return launcherControl;
}

async function submitMessage(page, message) {
  const input = page.getByRole('textbox', { name: 'Your message' });
  await input.fill(message);
  await input.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://portfolio.test/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === '/chat') {
      await route.fulfill({ status: 501, body: 'Add a test-specific chat response.' });
      return;
    }

    if (requestUrl.pathname === '/assets/js/chatbot.config.js') {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: "window.CHATBOT_CONFIG = { apiEndpoint: '/chat' };"
      });
      return;
    }

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
    } catch (error) {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
  await page.goto('https://portfolio.test/pages/index.html');
});

test('opens by keyboard, sends a message, and keeps API credentials out of browser requests', async ({ page }) => {
  let requestBody;
  let requestHeaders;
  await page.route('**/chat', async (route) => {
    requestBody = route.request().postDataJSON();
    requestHeaders = route.request().headers();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock assistant response' })
    });
  });

  const launcher = await openChat(page);
  await submitMessage(page, 'Who is Ricky?');

  const conversation = page.getByRole('log', { name: 'Chat conversation' });
  await expect(conversation.getByText('Mock assistant response')).toBeVisible();
  expect(requestBody).toEqual({ input: 'Who is Ricky?', history: [] });
  expect(requestHeaders['x-api-key']).toBeUndefined();
  await expect(page.getByRole('textbox', { name: 'Your message' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await expect(launcher).toBeFocused();
});

test('sends only a bounded recent conversation window', async ({ page }) => {
  const requests = [];
  let replyNumber = 0;
  await page.route('**/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    replyNumber += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Mock response ${replyNumber}` })
    });
  });

  await openChat(page);
  const conversation = page.getByRole('log', { name: 'Chat conversation' });
  for (let turn = 1; turn <= 6; turn += 1) {
    await submitMessage(page, `Question ${turn}`);
    await expect(conversation.getByText(`Mock response ${turn}`)).toBeVisible();
  }

  expect(requests[0].history).toEqual([]);
  expect(requests[5].history).toHaveLength(4);
  expect(requests[5].history[0]).toEqual({ role: 'user', content: 'Question 4' });
  expect(requests[5].history[3]).toEqual({ role: 'assistant', content: 'Mock response 5' });
});

test('keeps recent history within the character budget using complete exchanges', async ({ page }) => {
  const requests = [];
  await page.route('**/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'A'.repeat(1200) })
    });
  });

  await openChat(page);
  const conversation = page.getByRole('log', { name: 'Chat conversation' });
  for (let turn = 1; turn <= 3; turn += 1) {
    await submitMessage(page, `Question ${turn}`);
    await expect(conversation.getByText('A'.repeat(1200)).nth(turn - 1)).toBeVisible();
  }

  const recentHistory = requests[2].history;
  expect(recentHistory).toHaveLength(2);
  expect(recentHistory[0]).toEqual({ role: 'user', content: 'Question 2' });
  expect(recentHistory[1].role).toBe('assistant');
  expect(recentHistory[1].content).toHaveLength(1200);
  expect(recentHistory.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(2000);
});

test('shows loading state and recovers from rate limiting', async ({ page }) => {
  let releaseResponse;
  let requestCount = 0;
  const responseGate = new Promise((resolve) => {
    releaseResponse = resolve;
  });

  await page.route('**/chat', async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await responseGate;
      await route.fulfill({ status: 429, body: '{"detail":"rate limited"}' });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Retry succeeded' })
    });
  });

  await openChat(page);
  const originalMessage = 'A request that will be rate limited';
  await submitMessage(page, originalMessage);
  const sendButton = page.locator('#chatbot-send');
  await expect(sendButton).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Assistant is responding.');
  await page.keyboard.press('Enter');
  expect(requestCount).toBe(1);

  releaseResponse();
  await expect(page.getByText('Too many requests right now. Please wait a moment and try again.')).toBeVisible();
  await expect(sendButton).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('');
  const input = page.getByRole('textbox', { name: 'Your message' });
  await expect(input).toHaveValue(originalMessage);
  await input.press('Enter');
  await expect(page.getByText('Retry succeeded')).toBeVisible();
  expect(requestCount).toBe(2);
  await expect(input).toHaveValue('');
});

test('shows a useful error for server failures and stays usable on mobile', async ({ page }) => {
  await page.route('**/chat', (route) => route.fulfill({ status: 500, body: 'server error' }));
  await page.setViewportSize({ width: 390, height: 844 });

  const launcher = await openChat(page);
  await submitMessage(page, 'Trigger an error');
  await expect(page.getByText('Unable to reach the assistant. Please try again.')).toBeVisible();
  await expect(page.locator('#chatbot-send')).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Your message' })).toHaveValue('Trigger an error');

  const panel = await page.locator('#chatbot-container').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(390);
  expect(panel.y + panel.height).toBeLessThanOrEqual(844);

  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
});

test('preserves the draft after a network failure and clears it after retry success', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/chat', async (route) => {
    requestCount += 1;
    if (requestCount === 1) {
      await route.abort('failed');
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Connected again' })
    });
  });

  await openChat(page);
  const message = 'Keep this draft after a network failure';
  await submitMessage(page, message);
  await expect(page.getByText('Connection error. Please try again later.')).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Your message' });
  await expect(input).toHaveValue(message);
  await input.press('Enter');
  await expect(page.getByText('Connected again')).toBeVisible();
  await expect(input).toHaveValue('');
  expect(requestCount).toBe(2);
});
