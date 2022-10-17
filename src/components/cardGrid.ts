import { $dom } from "@/utils";
import { decodeInkInfo } from "@/models/card";

function createCell() {
  return $dom(`<div class="cardgrid-cell">`);
}
const fillTypes = ["n-fill", "sp-fill"] as const;
/** カードの塗り範囲をグリッド表現 */
export function createCardGrid(
  g: string | null | undefined,
  sg: string | null | undefined
) {
  const grid = $dom(`<div class="cardgrid">`);
  const cells: HTMLElement[] = [];
  for (let i = 0; i < 64; i++) {
    const cell = createCell();
    cells.push(cell);
    grid.append(cell);
  }
  [g, sg].forEach((g, i) => {
    decodeInkInfo(g).forEach((x) => {
      cells[x].classList.add(fillTypes[i]);
    });
  });
  return grid;
}
