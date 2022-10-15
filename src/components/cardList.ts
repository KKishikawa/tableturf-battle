import { render } from "mustache";
import { isValidString, htmlToElement, mesureWidth } from "@/utils";
import { toInt } from "@/utils/convert";
import { ICard, RARITY, inkCount } from "@/models/card";
import { CardGrid } from "@/components/cardGrid";
import tableHTML from "@/template/cardList/table.html";
import tableRowHTML from "@/template/cardList/row.html";

interface IinternalRowInfo {
  row: HTMLTableRowElement;
  info: ICard;
}
interface IListOparationOpt {
  name?: string;
}

export interface ICardListOption {
  search: boolean;
  title: string;
}
export class CardList {
  readonly wrapper: HTMLElement;
  readonly body: HTMLTableSectionElement;
  protected readonly srch: boolean;
  constructor(option: ICardListOption) {
    this.wrapper = htmlToElement(
      render(tableHTML, { srch: option.search, title: option.title })
    );
    this.body = this.wrapper.querySelector("tbody")!;
    this.srch = option.search;
    {
      // レイアウト変更ボタン
      const layoutButtons =
        this.wrapper.querySelectorAll<HTMLElement>("[data-button_type]");
      layoutButtons.forEach((el) => {
        el.addEventListener("click", (e) => {
          const table = this.wrapper.querySelector("table") as HTMLTableElement;
          layoutButtons.forEach((el) => el.classList.remove("button-active"));
          const button = e.currentTarget as HTMLButtonElement;
          button.classList.add("button-active");
          const layoutName = button.dataset["button_type"]!;
          table.dataset["layout"] = layoutName;
        });
      });
    }
    if (option.search) {
      const form = this.wrapper.querySelector(".cardlist_serch")!;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.filterSortRow();
      });
      form.querySelectorAll(".input-clear").forEach((el) =>
        el.addEventListener("click", () => {
          setTimeout(() => {
            // クリア処理後に処理をするために、イベントハンドリング処理終了後に処理を実行する。
            this.filterSortRow();
          });
        })
      );
    }
  }
  findRowByNo(card_no: number) {
    return this.body.querySelector<HTMLTableRowElement>(
      `tr[data-card_no="${card_no}"]`
    );
  }
  addRow(...cards: ICard[]) {
    const trs = cards.map((c) => createCardRow(c, this.srch));
    this.body.append(...trs);
    this.filterSortRow();
  }
  findCardByNo(card_no: number) {
    const tr = this.findRowByNo(card_no);
    if (!tr) return null;
    return getCardRowInfo(tr);
  }
  removeRowByNo(card_no: number) {
    this.findRowByNo(card_no)?.remove();
  }
  /** リストをフィルター/ソートします */
  filterSortRow() {
    const trs = Array.from(
      this.body.children as HTMLCollectionOf<HTMLTableRowElement>
    );
    const infoR = generateRowInfo(trs);
    if (this.srch) {
      const text = (
        this.wrapper.querySelector(".input_cardlist_serch") as HTMLInputElement
      ).value;
      filerRow(infoR, { name: text });
    }
    sortRow(infoR);
    infoR.forEach((infos) => {
      this.body.append(infos.row);
    });
  }
  checkRow(tr?: HTMLTableRowElement) {
    const tableRows = Array.from(this.body.childNodes) as HTMLTableRowElement[];
    tableRows.forEach((row) => {
      if (row == tr) {
        tr.dataset["selected"] = "1";
      } else {
        row.dataset["selected"] = undefined;
      }
    });
  }
}

function generateDeckInfoTitle(count: number) {
  return `デッキ (${count}/15)`;
}
export class DeckInfo extends CardList {
  constructor() {
    super({ search: false, title: generateDeckInfoTitle(0) });
  }
  removeRowByNo(card_no: number) {
    const row = super.findRowByNo(card_no);
    if (row) this.removeRow(row);
  }
  addRow(...cards: ICard[]): void {
    super.addRow(...cards);
    this.internalSetTitleAndCount();
  }
  removeRow(row: HTMLTableRowElement) {
    row.remove();
    this.internalSetTitleAndCount();
  }
  protected internalSetTitleAndCount() {
    const count = this.body.children.length;
    let icon = "";
    if (count > 15) {
      icon = `<i title="カードが多すぎます" class="fa-solid fa-triangle-exclamation text-yellow-700 dark:text-yellow-800 mr-2"></i>`;
    } else if (count == 15) {
      icon = `<i class="fa-regular fa-circle-check text-green-600 dark:text-green-500 mr-2"></i>`;
    }
    this.wrapper.querySelector(".table-title-text")!.innerHTML = icon + generateDeckInfoTitle(count);
  }
}

function generateRowInfo(trs: HTMLTableRowElement[]): IinternalRowInfo[] {
  return trs.map((row) => {
    const info = getCardRowInfo(row);
    return { row, info };
  });
}
function filerRow(trs: IinternalRowInfo[], opt: IListOparationOpt) {
  const filterCondition = (info: ICard) => {
    if (isValidString(opt.name) && !info.ja.includes(opt.name)) return false;

    return true;
  };
  return trs.map<IinternalRowInfo>((t) => {
    if (filterCondition(t.info)) {
      t.row.classList.remove("card--hidden");
    } else {
      t.row.classList.add("card--hidden");
    }
    return t;
  });
}

function sortRow(rows: IinternalRowInfo[]) {
  return rows.sort((a, b) => {
    return a.info.n - b.info.n;
  });
}

/** 行の内容からカードの情報に変換する */
export function getCardRowInfo(tr: HTMLTableRowElement): ICard {
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

function createCardRow(cardInfo: ICard, notDeck: boolean) {
  const gridCount = inkCount(cardInfo.sg, cardInfo.g);
  const row = htmlToElement(
    render(tableRowHTML, {
      ...cardInfo,
      gridCount,
      notDeck,
      rarity: RARITY[cardInfo.r],
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
  row.querySelector(".grid__wrapper")!.prepend(cardGrid.element);
  return row;
}
