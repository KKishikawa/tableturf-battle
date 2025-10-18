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
