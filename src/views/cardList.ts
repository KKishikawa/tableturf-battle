import Mustache from "mustache";
import { htmlToElement, mesureWidth } from "@/utils";
import { toInt } from "@/utils/convert";
import {
  ICard,
  RARITY,
  inkCount,
  getCardList,
} from "@/models/card";
import * as dialog from "@/components/dialog";
import * as Message from "@/components/message";
import { CardGrid } from "@/components/cardGrid";
import tableRowHTML from "@/template/cardList/row.html";

const cardListTable = document.getElementById(
  "cardlist_table"
) as HTMLTableElement;
const tableBody = cardListTable.getElementsByTagName("tbody")[0];

function loadCardFromRow(tr: HTMLTableRowElement): ICard {
  const card_no = toInt(tr.dataset["card_no"]);
  const card_sp = toInt(tr.querySelector(".card_sp")!.textContent?.trim());
  const card_name = tr.querySelector(".card_name")!.textContent!.trim();
  const rarity = toInt(tr.dataset["card_rarity"]);
  const sg = tr.dataset["card_spx"];
  const g = tr.dataset["card_px"];
  return {
    g,
    sg,
    n: card_no,
    ja: card_name,
    sp: card_sp,
    r: rarity,
  };
}
function deleteRow(tr: HTMLTableRowElement) {
  const card_no = toInt(tr.dataset["card_no"]);
  const card_name = tr.querySelector(".card_name")!.textContent!;
  dialog
    .confirm({
      title: "カードリストの削除",
      message: `No.${card_no} ${card_name} をリストから削除しますか？`,
    })
    .then(
      () => {
        tr.remove();
        // バックグラウンドで自動保存を実行する
        window.setTimeout(saveCardList.bind(null, true));
        Message.success(`No.${card_no} ${card_name} を削除しました。`);
      },
      () => {
        Message.info("削除をキャンセルしました。");
      }
    );
}

export function findCardByNo(card_no: number) {
  const tr = tableBody.querySelector<HTMLTableRowElement>(
    `tr[data-card_no="${card_no}"]`
  );
  if (!tr) return null;
  return loadCardFromRow(tr);
}
export function tryAddCard(cardInfo: ICard) {
  const newTr = createCardRow(cardInfo);
  const trs = Array.from(tableBody.children).reverse() as HTMLTableRowElement[];
  let targetEl: HTMLTableRowElement | undefined;
  for (const cur_tr of trs) {
    const curCardNo = toInt(cur_tr.dataset["card_no"]);
    if (curCardNo === cardInfo.n) {
      // if same, replace it
      cur_tr.replaceWith(newTr);
      return;
    }
    if (curCardNo < cardInfo.n) {
      targetEl = cur_tr;
      break;
    }
  }
  if (!targetEl) {
    // if new is smaller than any element
    tableBody.prepend(newTr);
    return;
  }
  // find some smaller
  tableBody.insertBefore(newTr, targetEl.nextSibling);
}

/** リストをフィルターします */
function filterSortRow() {
  const trs = Array.from(
    tableBody.children as HTMLCollectionOf<HTMLTableRowElement>
  );
  const text = (
    document.getElementById("input_cardlist_serch") as HTMLInputElement
  ).value;

  const searchCondition = (info: ICard) => {
    if (!info.ja.includes(text)) return false;

    return true;
  };

  trs.forEach((tr) => {
    const info = loadCardFromRow(tr);
    if (searchCondition(info)) {
      tr.classList.remove("hidden");
    } else {
      tr.classList.add("hidden");
    }
  });
}

function createCardRow(cardInfo: ICard) {
  const gridCount = inkCount(cardInfo.sg, cardInfo.g);
  const row = htmlToElement(
    Mustache.render(tableRowHTML, {
      ...cardInfo,
      gridCount,
      rarity_label(this: ICard) {
        return RARITY[this.r];
      },
    })
  );
  const clientNameWidth = mesureWidth(cardInfo.ja, "text-sm font-bold");
  if (clientNameWidth > 152) {
    const scale = 152 / clientNameWidth;
    (
      row.querySelector(".card_name *") as HTMLElement
    ).style.cssText = `--tw-scale-x:${scale};--tw-scale-y:${scale};`;
  }
  const cardGrid = new CardGrid();
  cardGrid.fill(cardInfo.g, cardInfo.sg);
  row.prepend(cardGrid.element);
  return row;
}
/** ブラウザにカードリストの情報を保存します */
export function saveCardList(isAutoSaveAction?: boolean) {
  // if (isAutoSaveAction) {
  //   // 自動保存アクションの場合は、自動保存が有効か確認する
  //   if (
  //     !(document.getElementById("autosave_cardlist") as HTMLInputElement)
  //       .checked
  //   )
  //     return;
  // }
  // try {
  //   const cards = (Array.from(tableBody.children) as HTMLTableRowElement[]).map(
  //     loadCardFromRow
  //   );
  //   saveToLocalStorage(cards);
  //   if (isAutoSaveAction) {
  //     Message.info("ブラウザに保存しているカードリストを更新しました。");
  //   } else {
  //     Message.success("ブラウザにカードリストを保存しました。");
  //   }
  // } catch (error) {
  //   console.log(error);
  //   if (isAutoSaveAction) {
  //     Message.warn("ブラウザに保存しているカードリストの更新に失敗しました。");
  //   } else {
  //     Message.error("ブラウザへのカードリストの保存に失敗しました。");
  //   }
  // }
}

// component process
{
  // tableBody内のbuttonクリックイベント
  // tableBody.addEventListener("click", function (e) {
  //   if (!e.target || !(e.target instanceof HTMLElement)) return;
  //   const button = e.target.closest("button");
  //   if (!button) return;
  //   const tr = button.closest("tr");
  //   if (!tr) return;
  // });

  // レイアウト変更
  const layoutButtons =
    document.querySelectorAll<HTMLElement>("[data-button_type]");
  layoutButtons.forEach((el) => {
    el.addEventListener("click", function () {
      layoutButtons.forEach((el) => el.classList.remove("button-active"));
      this.classList.add("button-active");
      const layoutName = this.dataset["button_type"]!;
      cardListTable.dataset["layout"] = layoutName;
    });
  });

  // 検索
  const form = document.getElementById("cardlist_serch")!;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    filterSortRow();
  });
  form.querySelectorAll(".input-clear").forEach((el) =>
    el.addEventListener("click", () => {
      setTimeout(()=> {
        // クリア処理後に処理をするために、イベントハンドリング処理終了後に処理を実行する。
        filterSortRow();
      });
    })
  );
}
// initialize
{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getCardList().c
    .sort((a, b) => a.n - b.n)
    .forEach((c) => {
      const tr = createCardRow(c);
      tableBody.append(tr);
    });
}
