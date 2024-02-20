import { test, expect } from 'playwright-test-coverage';

// These processes do not depend on each other and can be executed in parallel.
test.describe.configure({ mode: 'parallel' });

test('has title', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('非公式 ナワバトラーデッキビルダー');
  await expect(page.getByText('非公式 ナワバトラーデッキビルダー')).toBeVisible();
});
test('open about me modal', async ({ page }) => {
  await page.goto('/');
  const helpBtn = page.getByRole('button', { name: '' });
  await expect(helpBtn).toBeVisible();
  // open about me modal
  await helpBtn.click();
  await expect(page.getByText('このWebアプリケーションについて')).toBeInViewport();
  // close about me modal
  await page.locator('button').filter({ hasText: 'Close modal' }).click();
  await expect(page.getByText('このWebアプリケーションについて')).not.toBeInViewport();
});

test('change style (light theme os)', async ({ browser }) => {
  const lightBrowser = await browser.newContext({
    colorScheme: 'light',
  });
  const page = await lightBrowser.newPage();
  await page.goto('/');
  const html = page.locator('html');
  // check default is light
  await expect(html).not.toHaveClass('dark');

  const themeBtn = page.getByRole('button', { name: 'テーマ変更' });
  await expect(themeBtn).toBeVisible();
  const lightBtn = page.getByRole('button', { name: 'ライト' });
  const darkBtn = page.getByRole('button', { name: 'ダーク' });
  const systemBtn = page.getByRole('button', { name: 'システム' });
  // theme picker is open
  await themeBtn.click();
  await Promise.all([
    expect(lightBtn).toBeInViewport(),
    expect(darkBtn).toBeInViewport(),
    expect(systemBtn).toBeInViewport(),
  ]);
  // theme picker is closed
  await themeBtn.click();
  await Promise.all([
    expect(lightBtn).not.toBeInViewport(),
    expect(darkBtn).not.toBeInViewport(),
    expect(systemBtn).not.toBeInViewport(),
  ]);

  // check light theme and its setting is saved
  await themeBtn.click();
  await lightBtn.click();
  await expect(html).not.toHaveClass('dark');
  await page.reload();
  await expect(html).not.toHaveClass('dark');

  // check dark theme and its setting is saved
  await themeBtn.click();
  await darkBtn.click();
  await expect(html).toHaveClass('dark');
  await page.reload();
  await expect(html).toHaveClass('dark');

  // check dark theme and its setting is not saved
  await themeBtn.click();
  await systemBtn.click();
  await expect(html).not.toHaveClass('dark');
  await page.reload();
  await expect(html).not.toHaveClass('dark');

  await lightBrowser.close();
});

test('change style (dark theme os)', async ({ browser }) => {
  const darkBrowser = await browser.newContext({
    colorScheme: 'dark',
  });
  const page = await darkBrowser.newPage();
  await page.goto('/');
  const html = page.locator('html');
  // check default is dark
  await expect(html).toHaveClass('dark');

  const themeBtn = page.getByRole('button', { name: 'テーマ変更' });
  await expect(themeBtn).toBeVisible();
  const lightBtn = page.getByRole('button', { name: 'ライト' });
  const darkBtn = page.getByRole('button', { name: 'ダーク' });
  const systemBtn = page.getByRole('button', { name: 'システム' });
  // theme picker is open
  await themeBtn.click();
  await Promise.all([
    expect(lightBtn).toBeInViewport(),
    expect(darkBtn).toBeInViewport(),
    expect(systemBtn).toBeInViewport(),
  ]);
  // theme picker is closed
  await themeBtn.click();
  await Promise.all([
    expect(lightBtn).not.toBeInViewport(),
    expect(darkBtn).not.toBeInViewport(),
    expect(systemBtn).not.toBeInViewport(),
  ]);

  // check light theme and its setting is saved
  await themeBtn.click();
  await lightBtn.click();
  await expect(html).not.toHaveClass('dark');
  await page.reload();
  await expect(html).not.toHaveClass('dark');

  // check dark theme and its setting is saved
  await themeBtn.click();
  await darkBtn.click();
  await expect(html).toHaveClass('dark');
  await page.reload();
  await expect(html).toHaveClass('dark');

  // check dark theme and its setting is not saved
  await themeBtn.click();
  await systemBtn.click();
  await expect(html).toHaveClass('dark');
  await page.reload();
  await expect(html).toHaveClass('dark');

  await darkBrowser.close();
});
