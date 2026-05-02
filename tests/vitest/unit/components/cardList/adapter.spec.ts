import { afterEach, describe, expect, it } from 'vitest';
import { CardList, DeckInfo, getCardRowInfo } from '@/components/cardList';
import { createCardListSearchModel, createCardListSearchUi } from '@/components/cardList/searchAdapter';
import type { ICard } from '@/models/card';

const cards: ICard[] = [
  { n: 1, r: 0, sp: 2, ja: 'Alpha', g: '10', sg: '' },
  { n: 2, r: 1, sp: 3, ja: 'Beta', g: '11', sg: '' },
];

describe('CardList SearchCollectionView adapter', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts the preserved toolbar and table structure in light DOM', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    cardList.addRow(...cards);
    document.body.append(cardList.wrapper);

    expect(cardList.wrapper.tagName.toLowerCase()).toBe('search-collection-view');
    expect(cardList.wrapper.classList.contains('deck-tab-item')).toBe(true);
    expect(cardList.wrapper.classList.contains('table__wrapper')).toBe(true);
    expect(cardList.wrapper.firstElementChild?.classList.contains('table-caption-title')).toBe(true);

    const table = cardList.wrapper.querySelector<HTMLElement>('.cardlist_table');
    expect(table).not.toBeNull();
    expect(table?.dataset.layout).toBe('grid');
    expect(table?.dataset.mode).toBe('grid');
    expect(table?.previousElementSibling?.classList.contains('table-caption-title')).toBe(true);
    expect(table?.querySelector('.cardlist_table_head + ul.cardlist_table_body')).not.toBeNull();
    expect(cardList.body.tagName.toLowerCase()).toBe('ul');
  });

  it('renders CardList rows as li.cardlist_table_row roots with compatibility data', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    cardList.addRow(...cards);
    document.body.append(cardList.wrapper);

    const rows = [...cardList.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.dataset.itemId)).toEqual(['1', '2']);
    expect(rows.map((row) => row.dataset.card_no)).toEqual(['1', '2']);
    expect(rows.map((row) => row.dataset.card_rarity)).toEqual(['0', '1']);
    expect(rows.map((row) => row.dataset.card_spx)).toEqual(['', '']);
    expect(rows.map((row) => row.dataset.card_px)).toEqual(['10', '11']);
    expect(rows[0]?.getAttribute('role')).toBe('listitem');
    expect(rows[0]?.querySelector('.button-add')?.getAttribute('data-action')).toBe('add');
    expect(rows[0]?.querySelector('.button-delete')?.getAttribute('data-action')).toBe('delete');
    expect(getCardRowInfo(rows[1]!)).toEqual(cards[1]);
  });

  it('switches grid and table modes through SearchCollectionView while preserving row nodes', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    cardList.addRow(...cards);
    document.body.append(cardList.wrapper);

    const table = cardList.wrapper.querySelector<HTMLElement>('.cardlist_table')!;
    const rowsBefore = [...cardList.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')];

    cardList.wrapper.querySelector<HTMLButtonElement>('[data-button_type="table"]')!.click();

    expect(table.dataset.layout).toBe('table');
    expect(table.dataset.mode).toBe('table');
    expect([...cardList.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')]).toEqual(rowsBefore);

    cardList.wrapper.querySelector<HTMLButtonElement>('[data-button_type="grid"]')!.click();

    expect(table.dataset.layout).toBe('grid');
    expect(table.dataset.mode).toBe('grid');
    expect([...cardList.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')]).toEqual(rowsBefore);
  });

  it('keeps selected row display compatible with data-selected equals 1', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    cardList.addRow(...cards);
    document.body.append(cardList.wrapper);

    cardList.setSelectedCardNos([2]);

    expect(cardList.findRowByNo(1)?.hasAttribute('data-selected')).toBe(false);
    expect(cardList.findRowByNo(2)?.getAttribute('data-selected')).toBe('1');
  });

  it('keeps DeckInfo item state synchronized when rows are removed by element', () => {
    const deckInfo = new DeckInfo();
    deckInfo.addRow(...cards);
    document.body.append(deckInfo.wrapper);

    deckInfo.removeRow(deckInfo.findRowByNo(1)!);

    expect(deckInfo.findRowByNo(1)).toBeNull();
    expect(deckInfo.findRowByNo(2)).not.toBeNull();
    expect(deckInfo.getCount()).toBe(1);

    deckInfo.addRow(cards[0]!);

    expect(
      [...deckInfo.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')].map((row) => row.dataset.card_no),
    ).toEqual(['1', '2']);
  });

  it('exposes DeckInfo toolbar actions before rows are added', () => {
    const deckInfo = new DeckInfo();

    expect(deckInfo.wrapper.querySelector('#button-deck-info')).not.toBeNull();
    expect(deckInfo.wrapper.querySelector('.action-wrapper')).not.toBeNull();
    expect(deckInfo.wrapper.querySelector('.table-title-text')?.textContent).toBe('デッキ (0/15)');
  });

  it('clears rows through the adapter item state', () => {
    const deckInfo = new DeckInfo();
    deckInfo.addRow(...cards);
    document.body.append(deckInfo.wrapper);

    deckInfo.clearRows();

    expect(deckInfo.body.children).toHaveLength(0);
    expect(deckInfo.getCount()).toBe(0);
    expect(deckInfo.wrapper.querySelector('.table-title-text')?.textContent).toBe('デッキ (0/15)');

    deckInfo.addRow(cards[0]!);

    expect(deckInfo.body.children).toHaveLength(1);
    expect(deckInfo.findRowByNo(1)).not.toBeNull();
  });

  it('ignores duplicate DeckInfo rows so adapter item ids stay unique', () => {
    const deckInfo = new DeckInfo();
    deckInfo.addRow(cards[0]!, cards[0]!);
    document.body.append(deckInfo.wrapper);

    expect(deckInfo.body.children).toHaveLength(1);
    expect(deckInfo.getCount()).toBe(1);

    deckInfo.addRow(cards[0]!);

    expect(deckInfo.body.children).toHaveLength(1);
    expect(deckInfo.getCount()).toBe(1);
  });

  it('filters and sorts CardList rows from item data instead of rendered DOM text', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    cardList.wrapper.searchModel = createCardListSearchModel();
    cardList.addRow(
      { n: 10, r: 1, sp: 5, ja: 'Short Shooter', g: '1', sg: '' },
      { n: 20, r: 0, sp: 1, ja: 'Long Charger', g: '1111', sg: '' },
      { n: 30, r: 2, sp: 3, ja: 'Short Roller', g: '11', sg: '' },
    );
    document.body.append(cardList.wrapper);

    cardList.findRowByNo(10)!.querySelector<HTMLElement>('.card_name')!.textContent = 'DOM Mismatch';
    cardList.findRowByNo(20)!.querySelector<HTMLElement>('.card_name')!.textContent = 'Short DOM Only';
    cardList.findRowByNo(30)!.querySelector<HTMLElement>('.card_sp')!.textContent = '99';

    cardList.wrapper.setSearchState({
      query: 'Short',
      sort: '4',
      filters: {
        minGrid: 0,
        maxGrid: 2,
        minSp: 0,
        maxSp: Number.MAX_SAFE_INTEGER,
      },
    });

    const rows = [...cardList.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')];
    expect(rows.map((row) => row.dataset.card_no)).toEqual(['20', '30', '10']);
    expect(rows.map((row) => row.hidden)).toEqual([true, false, false]);
    expect(rows.map((row) => row.dataset.hidden)).toEqual(['true', 'false', 'false']);
    expect(rows.map((row) => row.classList.contains('card--hidden'))).toEqual([true, false, false]);
  });

  it('drives SearchCollectionView search state from the preserved CardList toolbar controls', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    document.body.append(cardList.wrapper);
    const states: unknown[] = [];
    cardList.wrapper.addEventListener('search-state-change', (event) => {
      states.push((event as CustomEvent).detail.state);
    });
    cardList.wrapper.searchModel = createCardListSearchModel();
    cardList.wrapper.searchUi = createCardListSearchUi(cardList.wrapper, true);

    const searchInput = cardList.wrapper.querySelector<HTMLInputElement>('.input_cardlist_serch')!;
    const minGrid = cardList.wrapper.querySelector<HTMLInputElement>('#min-grid')!;
    const maxGrid = cardList.wrapper.querySelector<HTMLInputElement>('#max-grid')!;
    const minSp = cardList.wrapper.querySelector<HTMLInputElement>('#min-sp')!;
    const maxSp = cardList.wrapper.querySelector<HTMLInputElement>('#max-sp')!;
    const sort = cardList.wrapper.querySelector<HTMLSelectElement>('.table-sort')!;
    const form = cardList.wrapper.querySelector<HTMLFormElement>('.cardlist_serch')!;

    searchInput.value = 'Shooter';
    minGrid.value = '2';
    maxGrid.value = '8';
    minSp.value = '1';
    maxSp.value = '4';
    sort.value = '5';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const lastState = states[states.length - 1];
    expect(lastState).toEqual({
      query: 'Shooter',
      sort: '5',
      filters: {
        minGrid: 2,
        maxGrid: 8,
        minSp: 1,
        maxSp: 4,
      },
    });

    cardList.wrapper.querySelector<HTMLButtonElement>('.button_search_clear')!.click();

    expect(searchInput.value).toBe('');
    expect(minGrid.value).toBe('');
    expect(maxGrid.value).toBe('');
    expect(minSp.value).toBe('');
    expect(maxSp.value).toBe('');
    expect(states[states.length - 1]).toEqual({
      query: '',
      sort: '5',
      filters: {
        minGrid: 0,
        maxGrid: Number.MAX_SAFE_INTEGER,
        minSp: 0,
        maxSp: Number.MAX_SAFE_INTEGER,
      },
    });
  });

  it('keeps the hidden CardList search UI sentinel stable across search state updates', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    document.body.append(cardList.wrapper);
    cardList.wrapper.searchModel = createCardListSearchModel();
    cardList.wrapper.searchUi = createCardListSearchUi(cardList.wrapper, true);

    const sentinel = cardList.wrapper.querySelector('.cardlist-search-adapter');
    cardList.wrapper.setSearchState({ query: 'Shooter' });
    cardList.wrapper.setSearchState({ query: 'Roller' });

    expect(cardList.wrapper.querySelector('.cardlist-search-adapter')).toBe(sentinel);
  });

  it('syncs state through the form onsubmit hook used by the shared input clear handler', () => {
    const cardList = new CardList({ search: true, title: 'カードリスト' });
    document.body.append(cardList.wrapper);
    const states: unknown[] = [];
    cardList.wrapper.addEventListener('search-state-change', (event) => {
      states.push((event as CustomEvent).detail.state);
    });
    cardList.wrapper.searchModel = createCardListSearchModel();
    cardList.wrapper.searchUi = createCardListSearchUi(cardList.wrapper, true);

    const searchInput = cardList.wrapper.querySelector<HTMLInputElement>('.input_cardlist_serch')!;
    const form = cardList.wrapper.querySelector<HTMLFormElement>('.cardlist_serch')!;

    searchInput.value = 'Shooter';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(states[states.length - 1]).toMatchObject({ query: 'Shooter' });

    searchInput.value = '';
    form.onsubmit?.(new SubmitEvent('submit'));

    expect(states[states.length - 1]).toMatchObject({ query: '' });
  });
});
