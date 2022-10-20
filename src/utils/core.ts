import { decodeDeckCode } from "@/models/card";

const SelTrAttr = "selected";
/** デッキ編集画面にデッキを読み込む */
export function loadDeck(code: string | null | undefined, id?: string) {
  const cardInfo = decodeDeckCode(code);
  window.DeckEditManager.body.innerHTML = "";
  ([...window.CardListManager.body.children] as HTMLElement[]).forEach((tr) => {
    tr.dataset[SelTrAttr] = "";
  });
  cardInfo.forEach((info) => {
    const tr = window.CardListManager.findRowByNo(info.n);
    if (!tr) return;
    tr.dataset[SelTrAttr] = "1";
  });
  window.DeckEditManager.addRow(...cardInfo);
  window.DeckEditManager.body.dataset["id"] = id;
}
