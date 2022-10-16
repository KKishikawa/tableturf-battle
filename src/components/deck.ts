import { render } from "mustache";
import { htmlToElement } from "@/utils";
import deckRowHTML from "@/template/deck/deckRow.html";
import { IDeck } from "@/models/card";

/** デッキを追加します  */
export function addDeck(...deck: IDeck[]) {
  const tbody = document.querySelector(
    "#created_decks tbody"
  ) as HTMLTableSectionElement;
  tbody.append(...deck.map((dc) => htmlToElement(render(deckRowHTML, dc))));
}
/** 行からデッキ情報を読み込みます */
export function deckInfoFromRow(tr: HTMLElement): IDeck {
  const t = tr.getElementsByClassName("deck-name")[0].textContent ?? "";
  const c = tr.dataset["c"];
  const d = tr.getElementsByClassName("edit-date")[0].textContent ?? "";
  return { t, c, d };
}
export function getDeckInfoByRowIdx(idx: number): IDeck {
  const tr = document.querySelector("#created_decks tbody")!.children[
    idx
  ] as HTMLElement;
  return deckInfoFromRow(tr);
}
export function replaceDeckInfo(idx: number, deck: IDeck) {
  const newRow = htmlToElement(render(deckRowHTML, deck));
  const row = document.querySelector("#created_decks tbody")!.children[idx] as HTMLTableRowElement;
  row.replaceWith(newRow);
}

/** すべての行のデータを取得します */
export function allDeckInfo(): IDeck[] {
  const trs = document.querySelector("#created_decks tbody")!
    .children as HTMLCollectionOf<HTMLTableRowElement>;
  return [...trs].map(deckInfoFromRow);
}
