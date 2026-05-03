import { decodeDeckCode } from '@/models/card';
/** デッキ編集画面にデッキを読み込む */
export function loadDeck(code: string | null | undefined, id?: string) {
  const cardInfo = decodeDeckCode(code);
  window.DeckEditManager.clearRows();
  window.DeckEditManager.addRow(...cardInfo);
  window.CardListManager.setSelectedCardNos(cardInfo.map((info) => info.n));
  window.DeckEditManager.body.dataset['id'] = id;
}
