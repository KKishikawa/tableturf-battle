import { test as base, expect } from 'playwright-test-coverage';
import { CardList } from '../../fixture/cardList';

const test = CardList.ExtendTest(base);

test('deck info btn', async ({ page, cardUtil }) => {
  await page.goto('/');
  const btnInfo = await page.locator('#button-deck-info');
  await expect(btnInfo).not.toBeInViewport();
  await cardUtil.showInDeckCardList();
  await expect(btnInfo).toBeInViewport();
});
