import { test as base, expect } from 'playwright-test-coverage';
import { CardList } from '../../fixture/cardList';

const test = CardList.ExtendTest(base);

const SELECTOR_SPECIAL_POINT = '.bg-amber-500';
const SELECTOR_CELL_COUNT = '.bg-violet-500';
const BAR_HEIGHT = 64;

test('check deck info', async ({ page, cardUtil }) => {
  await page.goto('/');
  if (await cardUtil.isInDeckCardListHidden()) {
    await cardUtil.showInDeckCardList();
  }
  await page.locator('#button-deck-info').click();
  await expect(page.getByText('デッキ情報')).toBeInViewport();
  await expect(page.getByTitle('17', { exact: true })).toBeVisible();
  await expect(page.getByTitle('4', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('5', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('6', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('11', { exact: true }).locator(SELECTOR_CELL_COUNT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('12', { exact: true }).locator(SELECTOR_CELL_COUNT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('17', { exact: true }).locator(SELECTOR_CELL_COUNT)).not.toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await page.locator('button').filter({ hasText: 'Close modal' }).click();
  await expect(page.getByText('デッキ情報')).not.toBeInViewport();
  await cardUtil.addCard(1);
  await cardUtil.addCard(198);
  await cardUtil.addCard(220);
  await page.locator('#button-deck-info').click();
  await expect(page.getByTitle('4', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('5', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('6', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('11', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('12', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('17', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
});

test('check deck info2', async ({ page, cardUtil }) => {
  await page.goto('/');

  await cardUtil.addCard(78);
  await cardUtil.addCard(70);
  await cardUtil.addCard(189);
  await cardUtil.addCard(232);

  await cardUtil.addCard(94);

  await cardUtil.addCard(127);
  await cardUtil.addCard(113);

  if (await cardUtil.isInDeckCardListHidden()) {
    await cardUtil.showInDeckCardList();
  }
  await page.locator('#button-deck-info').click();
  await expect(page.getByTitle('1', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT / 2}px`,
  );
  await expect(page.getByTitle('3', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('5', { exact: true }).locator(SELECTOR_SPECIAL_POINT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT / 4}px`,
  );

  await expect(page.getByTitle('2', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT / 2}px`,
  );
  await expect(page.getByTitle('12', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT}px`,
  );
  await expect(page.getByTitle('14', { exact: true }).locator(SELECTOR_CELL_COUNT)).toHaveCSS(
    'height',
    `${BAR_HEIGHT / 4}px`,
  );
});
