import { render } from "mustache";
import { isValidString, $dom, mesureWidth } from "@/utils";
import { toInt } from "@/utils/convert";
import {
  ICard,
  RARITY,
  inkCount,
  encodeDeckCode,
  availableInkCount,
  availableSP,
} from "@/models/card";
import { createCardGrid } from "@/components/cardGrid";
import { ModalDialog } from "@/components/dialog";
import tableHTML from "./table.template.html";
import tableRowHTML from "./row.template.html";
import deckInfoHTML from "./deckInfoModalBody.template.html";

interface IinternalSortRowInfo {
  row: HTMLTableRowElement;
  info: ICard;
  gcount: number;
}
type sortJudgeFunc = (
  a: IinternalSortRowInfo,
  b: IinternalSortRowInfo
) => number;
interface IListOparationOpt {
  name?: string;
  maxg: number;
  ming: number;
  maxsp: number;
  minsp: number;
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
    this.wrapper = $dom(
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

      // ソート変更
      (
        this.wrapper.querySelector(".table-sort") as HTMLSelectElement
      ).addEventListener("change", () => {
        this.filterSortRow();
      });
    }
    if (option.search) {
      const form = this.wrapper.querySelector(
        ".cardlist_serch"
      ) as HTMLFormElement;
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
      form
        .querySelector(".button_search_clear")!
        .addEventListener("click", () => {
          form.reset();
          // clearableの状態変更
          form
            .querySelectorAll<HTMLElement>("[data-clearable]")
            .forEach((el) => {
              el.dataset["clearable"] = "";
            });
          this.filterSortRow();
        });
    }
  }
  findRowByNo(card_no: number) {
    return this.body.querySelector<HTMLTableRowElement>(
      `tr[data-card_no="${card_no}"]`
    );
  }
  addRow(...cards: ICard[]) {
    const trs = cards.map((c) => createCardRow(c, this.srch));
    this.filterSortRow(...trs);
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
  filterSortRow(...added: HTMLTableRowElement[]) {
    const trs = [
      ...(this.body.children as HTMLCollectionOf<HTMLTableRowElement>),
      ...added,
    ];
    const infoR = generateSortRowInfo(trs);
    if (this.srch) {
      const text = (
        this.wrapper.querySelector(".input_cardlist_serch") as HTMLInputElement
      ).value;
      const inputs = ["min-grid", "max-grid", "min-sp", "max-sp"].map(
        (idName, idx) => {
          const e = this.wrapper.querySelector(
            `#${idName}`
          ) as HTMLInputElement;
          return toInt(e.value, idx & 1 ? Number.MAX_SAFE_INTEGER : 0);
        }
      );

      filerRow(infoR, {
        name: text,
        ming: inputs[0],
        maxg: inputs[1],
        minsp: inputs[2],
        maxsp: inputs[3],
      });
    }
    const sortVal = (
      this.wrapper.querySelector(".table-sort") as HTMLSelectElement
    ).value;
    infoR.sort(getSortRow(sortVal));
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
    const btnDeckInfo = this.wrapper.querySelector(
      "#button-deck-info"
    ) as HTMLElement;
    btnDeckInfo.onclick = () => {
      const allInfo = [
        ...(this.body.children as HTMLCollectionOf<HTMLTableRowElement>),
      ].map((tr) => {
        const c = getCardRowInfo(tr);
        const gcount = inkCount(c.g, c.sg);
        return { ...c, gcount };
      });
      const gcountr = allInfo.reduce<
        [0, Map<number, number>, Map<number, number>]
      >(
        (a, b) => {
          a[0] += b.gcount;
          a[1].set(b.gcount, (a[1].get(b.gcount) ?? 0) + 1);
          a[2].set(b.sp, (a[2].get(b.sp) ?? 0) + 1);
          return a;
        },
        [
          0,
          new Map(availableInkCount.map((c) => [c, 0])),
          new Map(availableSP.map((c) => [c, 0])),
        ]
      );
      // マス数の分布
      const toStyleHeightLiteral = (n: number) => `style="height:${n}%"`;
      const _gcs = [...gcountr[1]];
      const gMaxCount = Math.max(..._gcs.map((v) => v[1]));
      const gcs = _gcs
        .map((g) => ({ k: g[0], v: toStyleHeightLiteral((g[1] * 100) / gMaxCount) }))
        .sort((a, b) => a.k - b.k);
      // spの分布
      const _sp = [...gcountr[2]];
      const spMax = Math.max(..._sp.map((v) => v[1]));
      const sps = _sp
        .map((g) => ({ k: g[0], v: toStyleHeightLiteral((g[1] * 100) / spMax) }))
        .sort((a, b) => a.k - b.k);
      new ModalDialog({
        title: "デッキ情報",
        bodyHTML: render(deckInfoHTML, {
          count: allInfo.length,
          gcount: gcountr[0],
          gcs,
          sps,
        }),
      });
    };
  }
  removeRowByNo(card_no: number) {
    const row = super.findRowByNo(card_no);
    if (row) this.removeRow(row);
  }
  addRow(...cards: ICard[]): void {
    super.addRow(...cards);
    this.updateCount();
  }
  removeRow(row: HTMLTableRowElement) {
    row.remove();
    this.updateCount();
  }
  /** デッキの枚数をカウントします */
  getCount() {
    return this.body.childElementCount;
  }
  updateCount() {
    const count = this.getCount();
    let icon = "";
    if (count > 15) {
      icon = `<i title="カードが多すぎます" class="fa-solid fa-triangle-exclamation text-yellow-700 dark:text-yellow-800 mr-2"></i>`;
    } else if (count == 15) {
      icon = `<i class="fa-regular fa-circle-check text-green-600 dark:text-green-500 mr-2"></i>`;
    }
    this.wrapper.querySelector(".table-title-text")!.innerHTML =
      icon + generateDeckInfoTitle(count);
  }
  generateDeckCode() {
    const numbers = [...(this.body.children as HTMLCollectionOf<HTMLElement>)]
      .map((e) => toInt(e.dataset["card_no"]))
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    return encodeDeckCode(numbers);
  }
}

function generateSortRowInfo(
  trs: HTMLTableRowElement[]
): IinternalSortRowInfo[] {
  return trs.map((row) => {
    const info = getCardRowInfo(row);
    const gcount = toInt(
      row.querySelector(".card_gridcount")!.textContent?.trim()
    );
    return { row, info, gcount };
  });
}
function filerRow(trs: IinternalSortRowInfo[], opt: IListOparationOpt) {
  const filterCondition = (info: IinternalSortRowInfo) => {
    if (isValidString(opt.name) && !info.info.ja.includes(opt.name))
      return false;
    if (info.gcount > opt.maxg || info.gcount < opt.ming) return false;
    if (info.info.sp > opt.maxsp || info.info.sp < opt.minsp) return false;
    return true;
  };
  return trs.map<IinternalSortRowInfo>((t) => {
    if (filterCondition(t)) {
      t.row.classList.remove("card--hidden");
    } else {
      t.row.classList.add("card--hidden");
    }
    return t;
  });
}

const noAsc: sortJudgeFunc = (a, b) => a.info.n - b.info.n;
const gJudge: sortJudgeFunc = (a, b) => a.gcount - b.gcount;
const spJudge: sortJudgeFunc = (a, b) => a.info.sp - b.info.sp;
const rarityJudge: sortJudgeFunc = (a, b) => a.info.r - b.info.r;

const gcountAsc: sortJudgeFunc = (a, b) => {
  let inf = gJudge(a, b);
  if (inf != 0) return inf;
  inf = spJudge(a, b);
  if (inf != 0) return inf;
  return noAsc(a, b);
};
const spAsc: sortJudgeFunc = (a, b) => {
  let inf = spJudge(a, b);
  if (inf != 0) return inf;
  inf = gJudge(a, b);
  if (inf != 0) return inf;
  return noAsc(a, b);
};
const rarityAsc: sortJudgeFunc = (a, b) => {
  const inf = rarityJudge(a, b);
  if (inf != 0) return inf;
  return gcountAsc(a, b);
};
function getSortRow(orderType: string): sortJudgeFunc {
  switch (orderType) {
    case "1":
      return (a, b) => noAsc(b, a);
    case "2":
      return gcountAsc;
    case "3":
      return (a, b) => gcountAsc(b, a);
    case "4":
      return spAsc;
    case "5":
      return (a, b) => spAsc(b, a);
    case "6":
      return rarityAsc;
    case "7":
      return (a, b) => rarityAsc(b, a);
    default:
      return noAsc;
  }
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
  const gridCount = inkCount(cardInfo.g, cardInfo.sg);
  const row = $dom(
    render(tableRowHTML, {
      ...cardInfo,
      gridCount,
      notDeck,
      rarity: RARITY[cardInfo.r],
    })
  );
  const clientNameWidth = mesureWidth(cardInfo.ja, "text-sm font-bold");
  if (clientNameWidth > 148) {
    const scale = 148 / clientNameWidth;
    (
      row.querySelector(".card_name *") as HTMLElement
    ).style.cssText = `--tw-scale-x:${scale};--tw-scale-y:${scale};`;
  }
  const cardGrid = createCardGrid(cardInfo.g, cardInfo.sg);
  row.querySelector(".grid__wrapper")!.prepend(cardGrid);
  return row as HTMLTableRowElement;
}
