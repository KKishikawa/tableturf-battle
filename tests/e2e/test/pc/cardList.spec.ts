import { test as base, expect } from 'playwright-test-coverage';
import { CardList } from '../../fixture/cardList';

const test = CardList.ExtendTest(base);

test('select card and clear', async ({ page, cardUtil }) => {
  await page.goto('/');
  await expect(page.locator('li.cardlist_table_row').filter({ hasText: 'ヒーローシューター' })).toBeVisible();
  await cardUtil.getCardByIdFromList(1).getByRole('button').click();
  await cardUtil.getCardByIdFromList(2).getByRole('button').click();
  await cardUtil.getCardByIdFromList(3).getByRole('button').click();
  await cardUtil.getCardByIdFromList(4).getByRole('button').click();
  await expect(page.locator('.table-title-text').nth(1)).toBeInViewport();
  await expect(page.locator('.table-title-text').nth(1)).toHaveText('デッキ (4/15)');

  // clear deck
  const btnDeckClear = page.getByRole('button', { name: 'デッキを空にする' });
  await btnDeckClear.click();
  await expect(page.getByText('デッキ内容のクリア Close modal')).toBeInViewport();
  await page.locator('button').filter({ hasText: 'Close modal' }).click();
  await cardUtil.clearAll();
  await expect(page.locator('.table-title-text').nth(1)).toHaveText('デッキ (0/15)');

  // add and delete
  const cardWakaba = page.locator('li').filter({ hasText: 'わかばシューター' });
  await expect(cardWakaba.getByRole('button')).toHaveAttribute('title', 'デッキに追加');
  await cardWakaba.getByRole('button').click();
  await expect(page.locator('.table-title-text').nth(1)).toHaveText('デッキ (1/15)');
  await expect(cardWakaba.getByRole('button')).toHaveCount(2);
  await expect(cardWakaba.getByRole('button').first()).toHaveAttribute('title', 'デッキから削除');
  await page.locator('li').filter({ hasText: 'わかばシューター' }).getByRole('button').nth(1).click();

  await expect(page.locator('.table-title-text').nth(1)).toHaveText('デッキ (0/15)');
  await page.locator('li').filter({ hasText: 'N-ZAP85' }).getByRole('button').click();
  await expect(page.locator('li').filter({ hasText: 'N-ZAP85' }).getByRole('button')).toHaveCount(2);
  await page.locator('li').filter({ hasText: 'N-ZAP85' }).getByRole('button').nth(1).click();
});

test('preserves card row identity and selected display while switching layouts', async ({ page, cardUtil }) => {
  await page.goto('/');

  const table = page.locator('.card-list-container .cardlist_table');
  const card = cardUtil.getCardByIdFromList(1);
  await expect(table).toHaveAttribute('data-layout', 'grid');
  await expect(card).not.toHaveAttribute('data-selected', '1');

  await card.getByRole('button', { name: 'デッキに追加' }).click();
  await expect(card).toHaveAttribute('data-selected', '1');
  await expect(card.getByRole('button', { name: 'デッキに追加' })).toBeHidden();
  await expect(card.getByRole('button', { name: 'デッキから削除' })).toBeVisible();

  const cardHandle = await card.elementHandle();
  await page.locator('.card-list-container [data-button_type="table"]').click();
  await expect(table).toHaveAttribute('data-layout', 'table');
  expect(await card.evaluate((node, previous) => node === previous, cardHandle)).toBe(true);
  await expect(card).toHaveAttribute('data-selected', '1');

  await page.locator('.card-list-container [data-button_type="grid"]').click();
  await expect(table).toHaveAttribute('data-layout', 'grid');
  expect(await card.evaluate((node, previous) => node === previous, cardHandle)).toBe(true);
  await expect(card).toHaveAttribute('data-selected', '1');
});

test('searches filters sorts and clears card list through preserved controls', async ({ page }) => {
  await page.goto('/');

  const list = page.locator('.card-list-container');
  const visibleRows = list.locator('li.cardlist_table_row:not(.card--hidden)');

  await list.locator('.input_cardlist_serch').fill('シューター');
  await list.locator('#min-grid').fill('6');
  await list.locator('#max-grid').fill('12');
  await list.locator('#min-sp').fill('2');
  await list.locator('#max-sp').fill('4');
  await list.locator('.table-sort').selectOption('5');
  await list.locator('.cardlist_serch').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });

  await expect(visibleRows.first()).toContainText('シューター');
  await expect(list.locator('li.cardlist_table_row.card--hidden').first()).toHaveAttribute('data-hidden', 'true');

  const firstSp = Number((await visibleRows.first().locator('.card_sp').innerText()).trim());
  const secondSp = Number((await visibleRows.nth(1).locator('.card_sp').innerText()).trim());
  expect(firstSp).toBeGreaterThanOrEqual(secondSp);

  for (const row of await visibleRows.evaluateAll((nodes) =>
    nodes.slice(0, 5).map((node) => ({
      grid: Number(node.querySelector('.card_gridcount')?.textContent?.trim() ?? '0'),
      sp: Number(node.querySelector('.card_sp')?.textContent?.trim() ?? '0'),
      text: node.textContent ?? '',
    })),
  )) {
    expect(row.text).toContain('シューター');
    expect(row.grid).toBeGreaterThanOrEqual(6);
    expect(row.grid).toBeLessThanOrEqual(12);
    expect(row.sp).toBeGreaterThanOrEqual(2);
    expect(row.sp).toBeLessThanOrEqual(4);
  }

  await list.locator('.button_search_clear').click();
  await expect(list.locator('li.cardlist_table_row.card--hidden')).toHaveCount(0);
});
