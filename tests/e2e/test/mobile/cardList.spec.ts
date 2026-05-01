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
  await expect(page.getByText('カードリスト デッキ (4/15)')).toBeInViewport();

  // clear deck
  await page.locator('li').filter({ hasText: 'デッキ (4/15)' }).click();
  const btnDeckClear = page.getByRole('button', { name: 'デッキを空にする' });
  await btnDeckClear.click();
  await expect(page.getByText('デッキ内容のクリア Close modal')).toBeVisible();
  await page.locator('button').filter({ hasText: 'Close modal' }).click();
  await page.locator('li').filter({ hasText: 'カードリスト' }).click();
  await cardUtil.clearAll();
  await expect(page.getByText('カードリスト デッキ (0/15)')).toBeInViewport();

  // add and delete
  const cardWakaba = page.locator('li').filter({ hasText: 'わかばシューター' });
  await expect(cardWakaba.getByRole('button')).toHaveAttribute('title', 'デッキに追加');
  await cardWakaba.getByRole('button').click();
  await expect(page.getByText('カードリスト デッキ (1/15)')).toBeInViewport();
  await expect(cardWakaba.getByRole('button')).toHaveCount(1);
  await expect(cardWakaba.getByRole('button').first()).toHaveAttribute('title', 'デッキから削除');
  await cardUtil.showInDeckCardList();
  await cardUtil.getCardByIdFromInDeckList(3).getByRole('button').click();

  await cardUtil.showCardList();
  await expect(page.getByText('カードリスト デッキ (0/15)')).toBeInViewport();
  await cardUtil.getCardByIdFromList(20).getByRole('button', { name: 'デッキに追加' }).click();
  await cardUtil.getCardByIdFromList(20).getByRole('button', { name: 'デッキから削除' }).click();
  await expect(page.getByText('カードリスト デッキ (0/15)')).toBeInViewport();
});

test('preserves card row identity and selected display while switching layouts on mobile tabs', async ({
  page,
  cardUtil,
}) => {
  await page.goto('/');
  await cardUtil.showCardList();

  const table = page.locator('.card-list-container .cardlist_table');
  const card = cardUtil.getCardByIdFromList(1);
  await expect(table).toHaveAttribute('data-layout', 'grid');

  await card.getByRole('button', { name: 'デッキに追加' }).click();
  await expect(card).toHaveAttribute('data-selected', '1');

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
