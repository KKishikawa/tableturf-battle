import { htmlToElement } from "@/utils";
import { decodeInkInfo } from "@/models/card";

function createCell() {
  const cell = document.createElement("div");
  cell.className = "cardgrid-cell";
  return cell;
}
export const fillTypes = ["n-fill", "sp-fill"] as const;
/** カードの塗り範囲をグリッド表現 */
export class CardGrid {
  readonly element: HTMLElement;
  constructor() {
    this.element = htmlToElement(
      `<div class="cardgrid"><div class="cardgrid-border"></div></div>`
    );
    for (let i = 0; i < 64; i++) {
      this.element.append(createCell());
    }
  }
  /** 設定値をもとにグリッドを塗ります(追加) */
  fill(g: string | null | undefined, sg: string | null | undefined) {
    const cells = this.element.querySelectorAll<HTMLElement>(".cardgrid-cell");
    [g, sg].forEach((g, i) => {
      decodeInkInfo(g).forEach((x) => {
        cells[x].classList.add(fillTypes[i]);
      });
    });
  }
}
