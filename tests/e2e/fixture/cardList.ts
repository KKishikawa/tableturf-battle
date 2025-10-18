import type { test, Page } from '@playwright/test';

export class CardList {
  private readonly _page: Page;
  private static CARDLIST_SELECTOR = '.card-list-container';
  private static DECK_SELECTOR = '.deck-container';

  constructor(readonly page: Page) {
    this._page = page;
  }
  /** extends base test */
  public static ExtendTest<T extends typeof test>(baseTest: T) {
    return baseTest.extend<{ cardUtil: CardList }>({
      cardUtil: async ({ page }, use) => {
        const cardList = new CardList(page);
        await use(cardList);
      },
    });
  }

  private _getCardById(selector: string, id: number) {
    return this._page.locator(`${selector} li.cardlist_table_row[data-card_no="${id}"]`);
  }

  getCardByIdFromList(id: number) {
    return this._getCardById(CardList.CARDLIST_SELECTOR, id);
  }
  getCardByIdFromInDeckList(id: number) {
    return this._getCardById(CardList.DECK_SELECTOR, id);
  }
  /** click deck tab (for mobile) */
  async showCardList() {
    await this._page.locator('.tab-group').first().locator('.tab').nth(0).click();
  }
  /** click card list tab (for mobile) */
  async showInDeckCardList() {
    await this._page.locator('.tab-group').first().locator('.tab').nth(1).click();
  }
  async isCardListHidden() {
    return await this._page.getByRole('button', { name: '詳細検索' }).isHidden();
  }
  async isInDeckCardListHidden() {
    return await this._page
      .locator(CardList.DECK_SELECTOR)
      .getByRole('button', { name: 'デッキを空にする' })
      .isHidden();
  }

  async clearAll() {
    const isDeckHidden = await this.isInDeckCardListHidden();
    if (isDeckHidden) {
      await this.showInDeckCardList();
    }
    await this._page.locator(CardList.DECK_SELECTOR).getByRole('button', { name: 'デッキを空にする' }).click();
    await this._page.getByText('OK').click();
    if (isDeckHidden) {
      // restore state
      await this.showCardList();
    }
  }
  async addCard(id: number) {
    const isListHidden = await this.isCardListHidden();
    if (isListHidden) {
      await this.showCardList();
    }
    // const card = this.getCardByIdFromList(id);
    await this.getCardByIdFromList(id).evaluate((node) => node.scrollIntoView());
    await this.getCardByIdFromList(id).getByRole('button').click({
      force: true,
    });
    if (isListHidden) {
      // restore state
      await this.showInDeckCardList();
    }
  }
}
