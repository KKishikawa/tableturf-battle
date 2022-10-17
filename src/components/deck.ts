import { render } from "mustache";
import { $dom } from "@/utils";
import deckRowHTML from "@/template/deck/deckRow.html";
import { IDeck } from "@/models/card";
import { writeVariableRecord } from "@/utils/variableRecord";

/** デッキを追加します  */
export function addDeck(...deck: IDeck[]) {
  const tbody = document.querySelector(
    "#created_decks tbody"
  ) as HTMLTableSectionElement;
  tbody.prepend(...deck.map((dc) => $dom(render(deckRowHTML, dc))));
}
/** 行からデッキ情報を読み込みます */
export function deckInfoFromRow(tr: HTMLElement): IDeck {
  const t = tr.getElementsByClassName("deck-name")[0].textContent ?? "";
  const c = tr.dataset["c"];
  const d = tr.getElementsByClassName("edit-date")[0].textContent ?? "";
  const id = tr.dataset["id"];
  return { t, c, d, id };
}
export function getDeckInfoByRowIdx(idx: number): IDeck {
  const tr = document.querySelector("#created_decks tbody")!.children[
    idx
  ] as HTMLElement;
  return deckInfoFromRow(tr);
}
export function replaceDeckInfo(idx: number, deck: IDeck) {
  const newRow = $dom(render(deckRowHTML, deck));
  const row = document.querySelector("#created_decks tbody")!.children[
    idx
  ] as HTMLTableRowElement;
  row.replaceWith(newRow);
}

/** すべての行のデータを取得します */
export function allDeckInfo(): IDeck[] {
  const trs = document.querySelectorAll<HTMLElement>(
    "#created_decks tbody tr:not(.nocontent)"
  );
  return [...trs].map(deckInfoFromRow);
}
/** デッキIDを作成する */
export function generateDeckId() {
  const c = writeVariableRecord([new Date().valueOf()]);
  console.log(c);
  return c;
}
