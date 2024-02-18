import { CardList, DeckInfo, getCardRowInfo } from '@/components/cardList';
import { getCardList, decodeDeckCode } from '@/models/card';
import { $dom } from '@/utils';
import { toInt } from '@/utils/convert';
import * as dialog from '@/components/dialog';
import * as Message from '@/components/message';
import saveDeckButtonHTML from './saveDeckBtn.html.mustache';
import clearButtonHTML from './clearBtn.html.mustache';

import openSaveDeckDialog from './saveDeckDialog';

declare global {
  interface Window {
    /** 全カード一覧 */
    CardListManager: CardList;
    /** 編集中のデッキ */
    DeckEditManager: DeckInfo;
  }
}

const SelTrAttr = 'selected';

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
/** 全カード一覧のカード選択をすべて解除する */
function deselectCards() {
  ([...cardListManager.body.children] as HTMLElement[]).forEach((tr) => {
    tr.dataset[SelTrAttr] = '';
  });
}
/** デッキを読み込む */
function loadDeck(code: string | null | undefined, id?: string) {
  const cardInfo = decodeDeckCode(code);
  deckEditManager.body.innerHTML = '';
  deselectCards();
  cardInfo.forEach((info) => {
    const tr = cardListManager.findRowByNo(info.n);
    if (!tr) return;
    tr.dataset[SelTrAttr] = '1';
  });
  deckEditManager.addRow(...cardInfo);
  deckEditManager.body.dataset['id'] = id;
}

{
  const rowClassName = 'cardlist_table_row';
  // カードクリック
  cardListManager.body.addEventListener('click', (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest('.button-add')) {
        const row = el.closest<HTMLElement>('.' + rowClassName)!;
        const info = getCardRowInfo(row);
        deckEditManager.addRow(info);
        row.dataset[SelTrAttr] = '1';
      } else if (el.closest('.button-delete')) {
        const row = el.closest<HTMLElement>('.' + rowClassName)!;
        const no = toInt(row.dataset['card_no']);
        deckEditManager.removeRowByNo(no);
        row.dataset[SelTrAttr] = '';
      }
    });
  });
  deckEditManager.body.addEventListener('click', (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest('.button-delete')) {
        const row = el.closest<HTMLElement>('.' + rowClassName)!;
        const no = toInt(row.dataset['card_no']);
        const r = cardListManager.findRowByNo(no);
        if (r) r.dataset[SelTrAttr] = '';
        deckEditManager.removeRow(row);
      }
    });
  });
}

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
