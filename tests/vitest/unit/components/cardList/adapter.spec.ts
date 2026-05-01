import { afterEach, describe, expect, it } from 'vitest';
import { CardList, DeckInfo, getCardRowInfo } from '@/components/cardList';
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

    expect([...deckInfo.body.querySelectorAll<HTMLElement>('li.cardlist_table_row')].map((row) => row.dataset.card_no)).toEqual([
      '1',
      '2',
    ]);
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
});
