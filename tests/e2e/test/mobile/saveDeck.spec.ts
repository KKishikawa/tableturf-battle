import { test as base, expect } from 'playwright-test-coverage';
import { CardList } from '../../fixture/cardList';

const test = CardList.ExtendTest(base);

test('save deck btn', async ({page, cardUtil}) => {
    await page.goto("/");
    const btnSave = await page.getByRole('button', { name: ' ' });
    await expect(btnSave).not.toBeInViewport();
    await cardUtil.showInDeckCardList();
    await expect(btnSave).toBeInViewport();
});
