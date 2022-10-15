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

export class CardList {
  readonly wrapper: HTMLElement;
  readonly body: HTMLTableSectionElement;
  private readonly srch: boolean;
  constructor(hasSearch: boolean) {
    this.wrapper = htmlToElement(render(tableHTML, { srch: hasSearch }));
    this.body = this.wrapper.querySelector("tbody")!;
    this.srch = hasSearch;
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
    if (hasSearch) {
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
  addRow(...cards: ICard[]) {
    const trs = cards.map(createCardRow);
    this.body.append(...trs);
    if (this.srch) this.filterSortRow();
  }
  findCardByNo(card_no: number) {
    const tr = this.body.querySelector<HTMLTableRowElement>(
      `tr[data-card_no="${card_no}"]`
    );
    if (!tr) return null;
    return getCardRowInfo(tr);
  }
  /** リストをフィルター/ソートします */
  filterSortRow() {
    const trs = Array.from(
      this.body.children as HTMLCollectionOf<HTMLTableRowElement>
    );
    const text = (
      this.wrapper.querySelector(".input_cardlist_serch") as HTMLInputElement
    ).value;
    const r = filerRow(trs, { name: text });
    if (this.srch) {
      sortRow(r);
    }
    r.forEach((infos) => {
      this.body.append(infos.row);
    });
  }
}

function filerRow(trs: HTMLTableRowElement[], opt: IListOparationOpt) {
  const filterCondition = (info: ICard) => {
    if (isValidString(opt.name) && !info.ja.includes(opt.name)) return false;

    return true;
  };
  return trs.map<IinternalRowInfo>((row) => {
    const info = getCardRowInfo(row);
    if (filterCondition(info)) {
      row.classList.remove("card--hidden");
    } else {
      row.classList.add("card--hidden");
    }
    return { row, info };
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

function createCardRow(cardInfo: ICard) {
  const gridCount = inkCount(cardInfo.sg, cardInfo.g);
  const row = htmlToElement(
    render(tableRowHTML, {
      ...cardInfo,
      gridCount,
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
