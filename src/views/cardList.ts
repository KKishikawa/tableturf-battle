import { render } from "mustache";
import { CardList, DeckInfo, getCardRowInfo } from "@/components/cardList";
import {
  getCardList,
  decodeDeckCode,
  IDeck,
  savetToLS,
  loadFromLS,
  loadFromQuery,
} from "@/models/card";
import { htmlToElement, isValidString, nowYMD } from "@/utils";
import { toInt } from "@/utils/convert";
import * as dialog from "@/components/dialog";
import * as Message from "@/components/message";
import {
  addDeck,
  allDeckInfo,
  deckInfoFromRow,
  getDeckInfoByRowIdx as getDeckInfoByRowIdx,
  replaceDeckInfo,
} from "@/components/deck";
import saveDeckButtonHTML from "@/template/views/saveDeck.html";
import shareButtonHTML from "@/template/views/shareBtn.html";
import saveDeckDialogBodyHTML from "@/template/views/saveDeckDialogBody.html";
import deleteConfHtml from "@/template/views/deleteConf.html";
import loadConfHtml from "@/template/views/deckLoadConf.html";
import { showShareMsg } from "@/components/deckShare";

const allCardManager = new CardList({ search: true, title: "カードリスト" });
allCardManager.addRow(...getCardList().c);
allCardManager.wrapper.classList.add(
  "deck-tab-item--active",
  "card-list-container"
);
const deckManager = new DeckInfo();
deckManager.wrapper.classList.add("deck-container");
const tabBtns = Array.from(document.querySelectorAll(".tab-group .tab"));
/** タブに表示するデッキの枚数カウント表示を更新する */
function showDeckCount() {
  tabBtns[1].innerHTML =
    deckManager.wrapper.querySelector(".table-title-text")!.innerHTML;
}
function removeAllSelectedInfo() {
  ([...allCardManager.body.children] as HTMLElement[]).forEach((tr) => {
    tr.dataset["seleced"] = "";
  });
}
/** デッキを読み込む */
function loadDeck(code: string | null | undefined) {
  const cardInfo = decodeDeckCode(code);
  deckManager.body.innerHTML = "";
  removeAllSelectedInfo();
  cardInfo.forEach((info) => {
    const tr = allCardManager.findRowByNo(info.n);
    if (!tr) return;
    tr.dataset["selected"] = "1";
  });
  deckManager.addRow(...cardInfo);
  showDeckCount();
}

/** デッキをlocalstrageに保存する */
function saveToLocalStrage() {
  window.setTimeout(() => {
    const decks = allDeckInfo();
    savetToLS(decks);
  });
}

{
  // カードクリック
  allCardManager.body.addEventListener("click", (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest(".button-add")) {
        const row = el.closest("tr")!;
        const info = getCardRowInfo(row);
        deckManager.addRow(info);
        showDeckCount();
        row.dataset["selected"] = "1";
      } else if (el.closest(".button-delete")) {
        const row = el.closest("tr")!;
        const no = toInt(row.dataset["card_no"]);
        deckManager.removeRowByNo(no);
        showDeckCount();
        row.dataset["selected"] = "";
      }
    });
  });
  deckManager.body.addEventListener("click", (e) => {
    if (!e.target) return;
    const el = e.target as HTMLElement;
    window.setTimeout(() => {
      if (el.closest(".button-delete")) {
        const row = el.closest("tr")!;
        const no = toInt(row.dataset["card_no"]);
        const r = allCardManager.findRowByNo(no);
        if (r) r.dataset["selected"] = "";
        deckManager.removeRow(row);
        showDeckCount();
      }
    });
  });
}

{
  // タブ切り替え
  const tabGroup = document.querySelector(".deck-tab-items") as HTMLElement;
  tabGroup.append(allCardManager.wrapper, deckManager.wrapper);
  const tabItems = Array.from(tabGroup.querySelectorAll(".deck-tab-item"));

  tabBtns.forEach((tabBtn, idx) =>
    tabBtn.addEventListener("click", () => {
      tabBtns.forEach((b, bIdx) => {
        if (bIdx == idx) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
      tabItems.forEach((tabItem, itemIdx) => {
        if (idx == itemIdx) {
          tabItem.classList.add("deck-tab-item--active");
        } else {
          tabItem.classList.remove("deck-tab-item--active");
        }
      });
    })
  );
}

{
  // デッキ保存
  const btnWrapper =
    deckManager.wrapper.getElementsByClassName("action-wrapper")[0];
  const saveButton = htmlToElement(saveDeckButtonHTML);
  const shareButton = htmlToElement(shareButtonHTML);
  shareButton.onclick = function () {
    const deckCode = deckManager.generateDeckCode();
    if (isValidString(deckCode)) {
      showShareMsg(deckCode);
    } else {
      Message.error("デッキにカードが含まれていません。");
    }
  };
  btnWrapper.append(saveButton);
  btnWrapper.append(shareButton);
  saveButton.addEventListener("click", function () {
    const decks = allDeckInfo().map((d, idx) => ({ ...d, idx }));
    const saveDialog = new dialog.ModalDialog({
      title: "デッキの保存先指定",
      bodyHTML: render(saveDeckDialogBodyHTML, { decks }),
      onClose: () => {
        Message.info("保存操作をキャンセルしました。");
      },
      buttons: [
        {
          label: "保存",
          primary: true,
        },
        {
          label: "キャンセル",
          action: "close",
        },
      ],
    });
    const form = saveDialog.element.getElementsByTagName("form")[0];
    const saveFunc = () => {
      (document.activeElement as HTMLElement)?.blur();
      const selected = toInt(
        (form.elements.namedItem("saveTo") as RadioNodeList).value,
        -1
      );
      const getSaveInfo = (): IDeck => {
        return {
          d: nowYMD(),
          t: (document.getElementById("input_deck_name") as HTMLInputElement)
            .value,
          c: deckManager.generateDeckCode(),
        };
      };
      if (selected > -1) {
        const info = getDeckInfoByRowIdx(selected);
        dialog
          .confirm({
            title: "上書きの確認",
            message: `${info.t}　を上書きしますが、よろしいですか？`,
          })
          .then(
            () => {
              replaceDeckInfo(selected, getSaveInfo());
              saveToLocalStrage();
              Message.success("上書き保存しました。");
              saveDialog.closeModal(true);
            },
            () => {
              Message.info("キャンセルしました。");
            }
          );
      } else {
        // 新規作成
        addDeck(getSaveInfo());
        saveToLocalStrage();
        Message.success("保存しました。");
        saveDialog.closeModal(true);
      }
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      saveFunc();
    });
    saveDialog.element
      .getElementsByClassName("modal-action")[0]
      .addEventListener("click", () => {
        saveFunc();
      });
    const radios = saveDialog.element.getElementsByClassName(`deck-radio-item`);
    [...radios].forEach((radio) => {
      radio.addEventListener("change", function (this: HTMLInputElement) {
        const input = document.getElementById(
          "input_deck_name"
        ) as HTMLInputElement;
        if (!isValidString(input.value)) {
          input.value = this.dataset["name"] ?? "";
        }
      });
    });
  });
}

{
  // デッキ一覧
  window.setTimeout(() => {
    const data = loadFromLS();
    addDeck(...data);
  });
  const tbody = document.querySelector(
    "#created_decks tbody"
  ) as HTMLTableSectionElement;
  tbody.addEventListener("click", function (e) {
    if (!e.target) return;
    const button = (e.target as HTMLElement).closest<HTMLElement>(".button");
    if (!button) return;
    const tr = button.closest("tr") as HTMLTableRowElement;
    const info = deckInfoFromRow(tr);
    switch (button.dataset["action"]) {
      case "edit":
        (async () => {
          try {
            if (deckManager.getCount() > 0) {
              const ret = await dialog
                .confirm({
                  title: "デッキ読み込み",
                  html: render(loadConfHtml, info),
                })
                .then(
                  () => true,
                  () => false
                );
              if (!ret) {
                Message.info("読み込みをキャンセルしました。");
                return;
              }
            }
            loadDeck(info.c);
            Message.success("デッキを読み込みました。");
          } catch {
            Message.error("デッキの読み込みに失敗しました。");
          }
        })();
        break;
      case "delete":
        dialog
          .confirm({
            title: "デッキ削除",
            html: render(deleteConfHtml, info),
          })
          .then(
            () => {
              tr.remove();
              saveToLocalStrage();
              Message.success("削除しました。");
            },
            () => {
              Message.info("キャンセルしました。");
            }
          )
          .catch(() => {
            Message.error("削除処理に失敗しました。");
          });
        break;
      case "share":
        if (isValidString(info.c)) {
          showShareMsg(info.c);
        } else {
          Message.error("選択したデッキにはカードが含まれていません。");
        }
        break;
    }
  });
}


{
  // urlからデッキを読み込む
  const code = loadFromQuery();
  if (isValidString(code)) {
    try {
      loadDeck(code);
      Message.info("URLからデッキを読み込みました。");
    } catch (error) {

    }
  }
}
