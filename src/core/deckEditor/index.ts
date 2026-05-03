import { CardList, DeckInfo } from '@/components/cardList';
import { type ICard, getCardList, decodeDeckCode } from '@/models/card';
import { $dom } from '@/utils';
import { toInt } from '@/utils/convert';
import * as dialog from '@/components/dialog';
import * as Message from '@/components/message';
import saveDeckButtonHTML from './saveDeckBtn.html.mustache?raw';
import clearButtonHTML from './clearBtn.html.mustache?raw';

import openSaveDeckDialog from './saveDeckDialog';

declare global {
  interface Window {
    /** 全カード一覧 */
    CardListManager: CardList;
    /** 編集中のデッキ */
    DeckEditManager: DeckInfo;
  }
}

const cardListManager = new CardList({ search: true, title: 'カードリスト' });
cardListManager.addRow(...getCardList().c);
cardListManager.wrapper.classList.add('deck-tab-item--active', 'card-list-container');
const deckEditManager = new DeckInfo();
deckEditManager.wrapper.classList.add('deck-container');

window.CardListManager = cardListManager;
window.DeckEditManager = deckEditManager;

const tabBtns = [...document.querySelectorAll('.tab-group .tab')];
const defaultShowDeckCountFunc = deckEditManager.showCount.bind(deckEditManager);
/* デッキ情報表示メソッドをオーバーライドする */
deckEditManager.showCount = () => {
  defaultShowDeckCountFunc();
  tabBtns[1].innerHTML = deckEditManager.wrapper.querySelector('.table-title-text')!.innerHTML;
};
/** デッキを読み込む */
function loadDeck(code: string | null | undefined, id?: string) {
  const cardInfo = decodeDeckCode(code);
  deckEditManager.clearRows();
  deckEditManager.addRow(...cardInfo);
  cardListManager.setSelectedCardNos(cardInfo.map((info) => info.n));
  deckEditManager.body.dataset['id'] = id;
}

function addCardToDeck(info: ICard) {
  deckEditManager.addRow(info);
  cardListManager.setCardSelected(info.n, true);
}

function removeCardFromDeck(cardNo: number) {
  deckEditManager.removeRowByNo(cardNo);
  cardListManager.setCardSelected(cardNo, false);
}

function removeDeckRow(row: HTMLElement) {
  const no = toInt(row.dataset['card_no']);
  deckEditManager.removeRow(row);
  cardListManager.setCardSelected(no, false);
}

cardListManager.wrapper.addEventListener('item-action', (event) => {
  const { action, item, itemId } = (event as CustomEvent).detail;
  if (action === 'add') {
    addCardToDeck(item as ICard);
  } else if (action === 'delete') {
    removeCardFromDeck(toInt(itemId));
  }
});

deckEditManager.wrapper.addEventListener('item-action', (event) => {
  const { action, itemId } = (event as CustomEvent).detail;
  if (action !== 'delete') return;

  const row = deckEditManager.findRowByNo(toInt(itemId));
  if (row) removeDeckRow(row);
});

{
  // タブ切り替え
  const tabGroup = document.querySelector('.deck-tab-items') as HTMLElement;
  tabGroup.append(cardListManager.wrapper, deckEditManager.wrapper);
  const tabItems = [...tabGroup.querySelectorAll('.deck-tab-item')];
  const tabActiveClassName = 'active';
  const tabItemActiveClassName = 'deck-tab-item--active';
  tabBtns.forEach((tabBtn, idx) =>
    tabBtn.addEventListener('click', () => {
      tabBtns.forEach((b, bIdx) => {
        if (bIdx == idx) {
          b.classList.add(tabActiveClassName);
        } else {
          b.classList.remove(tabActiveClassName);
        }
      });
      tabItems.forEach((tabItem, itemIdx) => {
        if (idx == itemIdx) {
          tabItem.classList.add(tabItemActiveClassName);
        } else {
          tabItem.classList.remove(tabItemActiveClassName);
        }
      });
    }),
  );
}

{
  // デッキ保存
  const btnWrapper = deckEditManager.wrapper.getElementsByClassName('action-wrapper')[0];
  const saveButton = $dom(saveDeckButtonHTML);
  const clearButton = $dom(clearButtonHTML);
  clearButton.onclick = function () {
    dialog
      .confirm({
        title: 'デッキ内容のクリア',
        message: '編集中のデッキの内容をクリアしますか？',
      })
      .then(
        () => {
          // 空情報を読み込ませる
          loadDeck(null);
          Message.success('編集中のデッキをクリアしました。');
        },
        () => {},
      );
  };
  btnWrapper.append(saveButton);
  btnWrapper.append(clearButton);
  saveButton.addEventListener('click', openSaveDeckDialog);
}
