import mustache from 'mustache';
import { $dom } from '@/utils';
import { IDeck, saveToLS } from '@/models/card';
import { writeVariableRecord } from '@/utils/variableRecord';
import deckRowHTML from './deckRow.html.mustache';

/** デッキを追加します  */
export function addDeck(...deck: IDeck[]) {
  const tbody = document.querySelector('#created_decks tbody') as HTMLTableSectionElement;
  tbody.prepend(...deck.map((dc) => $dom(mustache.render(deckRowHTML, dc))));
}
/** 行からデッキ情報を読み込みます */
export function deckInfoFromRow(tr: HTMLElement): IDeck {
  const t = tr.getElementsByClassName('deck-name')[0].textContent ?? '';
  const c = tr.dataset['c'];
  const d = tr.getElementsByClassName('edit-date')[0].textContent ?? '';
  const id = tr.dataset['id'];
  return { t, c, d, id };
}
export function getDeckInfoByRowIdx(idx: number): IDeck {
  const tr = document.querySelector('#created_decks tbody')!.children[idx] as HTMLElement;
  return deckInfoFromRow(tr);
}
export function replaceDeckInfo(idx: number, deck: IDeck) {
  const newRow = $dom(mustache.render(deckRowHTML, deck));
  const row = document.querySelector('#created_decks tbody')!.children[idx] as HTMLTableRowElement;
  row.replaceWith(newRow);
}

/** すべての行のデータを取得します */
export function allDeckInfo(): IDeck[] {
  const trs = document.querySelectorAll<HTMLElement>('#created_decks tbody tr:not(.nocontent)');
  return [...trs].map(deckInfoFromRow);
}
/** デッキをlocalstrageに保存する */
export function saveDeckToLS() {
  window.setTimeout(() => {
    const decks = allDeckInfo();
    saveToLS(decks);
  });
}
/** デッキIDを作成する */
export function generateDeckId() {
  const c = writeVariableRecord([new Date().valueOf()]);
  return c;
}
