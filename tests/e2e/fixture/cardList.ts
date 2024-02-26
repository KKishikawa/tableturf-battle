import type { test, Page, Locator } from '@playwright/test';

export class CardList {
  private readonly _page: Page;
  private readonly _cardListContainer: Locator;
  private readonly _deckContainer: Locator;

  get cardListContainer() {
    return this._cardListContainer;
  }
  get deckContainer() {
    return this._deckContainer;
  }

  constructor(readonly page: Page) {
    this._page = page;
    this._cardListContainer = page.locator('.card-list-container');
    this._deckContainer = page.locator('.deck-container');
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

  private static getCardById(list: Locator, id: number) {
    return list.locator(`li.cardlist_table_row[data-card_no="${id}"]`);
  }

  getCardByIdFromList(id: number) {
    return CardList.getCardById(this._cardListContainer, id);
  }
  getCardByIdFromInDeckList(id: number) {
    return CardList.getCardById(this._deckContainer, id);
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
    return await this._deckContainer.getByRole('button', { name: '' }).isHidden();
  }

  async clearAll() {
    const isDeckHidden = await this.isInDeckCardListHidden();
    if (isDeckHidden) {
      await this.showInDeckCardList();
    }
    await this._deckContainer.getByRole('button', { name: '' }).click();
    await this._page.getByText('OK').click();
    if (isDeckHidden) {
      // restore state
      this.showCardList();
    }
  }
  async addCard(id: number) {
    const isListHidden = await this.isCardListHidden();
    if (isListHidden) {
      await this.showCardList();
    }
    const card = await this.getCardByIdFromList(id);
    await card.getByRole('button').click();
    if (isListHidden) {
      // restore state
      this.showInDeckCardList();
    }
  }
}
