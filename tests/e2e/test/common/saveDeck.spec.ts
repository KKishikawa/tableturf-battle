import { test as base, expect } from 'playwright-test-coverage';
import { CardList } from '../../fixture/cardList';

const test = CardList.ExtendTest(base);

test('save deck', async ({ page, cardUtil }) => {
  await page.goto('/');
  // save deck
  await cardUtil.addCard(56);
  await cardUtil.addCard(57);
  await cardUtil.addCard(61);
  if (await cardUtil.isInDeckCardListHidden()) {
    await cardUtil.showInDeckCardList();
  }
  await page.getByRole('button', { name: ' ' }).click();
  await expect(page.locator('#app-modal_container')).toContainText('デッキの保存');
  await expect(page.getByPlaceholder('デッキ名')).toBeEmpty();
  await page.getByPlaceholder('デッキ名').fill('test123');
  await page.locator('#app-modal_container').getByText('キャンセル').click();
  await expect(page.locator('#app-modal_container').getByText('デッキの保存')).toBeHidden();

  await page.getByRole('button', { name: ' ' }).click();
  await page.getByPlaceholder('デッキ名').fill('test123');
  await page.locator('#app-modal_container').getByText('保存', { exact: true }).click();
  await expect(page.locator('#app-modal_container')).toContainText('保存しました。');

  await page.getByRole('button', { name: '作成済みデッキ ' }).click();
  await expect(page.getByRole('row')).toContainText('test123 編集: ');

  // check deck code
  await page.getByRole('button', { name: '' }).click();
  await expect(page.locator('#app-modal_container')).toContainText('デッキコード');
  await expect(page.locator('label').filter({ hasText: 'デッキコード' }).locator('..').locator('input')).toHaveValue(
    'U1V1Z1',
  );
  await page.locator('button').filter({ hasText: 'Close modal' }).click();

  // delete deck
  await page.getByTitle('デッキを削除する').click();
  await expect(page.locator('#app-modal_container')).toContainText('を削除しますか？');
  await page.getByText('OK').click();
  await expect(page.locator('#app-modal_container')).toContainText('削除しました。');
  await expect(page.getByRole('cell')).toContainText('作成済みのものはありません。');

  // save and load check
  await page.getByRole('button', { name: ' ' }).click();
  await page.getByPlaceholder('デッキ名').fill('test123');
  await page.locator('#app-modal_container').getByText('保存', { exact: true }).click();
  await expect(page.locator('#app-modal_container')).toContainText('保存しました。');
  await cardUtil.clearAll();
  await page.getByRole('button', { name: '' }).click();
  await expect(page.locator('#app-modal_container')).toContainText('デッキを読み込みました。');
  await expect(cardUtil.getCardByIdFromInDeckList(56)).toBeVisible();
  await expect(cardUtil.getCardByIdFromInDeckList(57)).toBeVisible();
  await expect(cardUtil.getCardByIdFromInDeckList(61)).toBeVisible();

  // overwrite
  await cardUtil.addCard(1);
  await page.getByRole('button', { name: ' ' }).click();
  await page.locator('label').filter({ hasText: 'test123 ' }).click();
  await page.locator('#app-modal_container').getByText('保存', { exact: true }).click();
  await page.getByText('上書きの確認').click();
  await expect(page.locator('#app-modal_container')).toContainText('上書きの確認');
  await page.getByText('OK').click();
  await expect(page.locator('#app-modal_container')).toContainText('上書き保存しました。');
  await cardUtil.clearAll();
  await page.getByRole('button', { name: '' }).click();
  await expect(cardUtil.getCardByIdFromInDeckList(1)).toBeVisible();

  // reload
  await page.reload();
  await page.getByRole('button', { name: '作成済みデッキ ' }).click();
  await expect(page.getByRole('row')).toContainText('test123 編集: ');
});
