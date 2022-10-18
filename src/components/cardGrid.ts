import { render } from "mustache";
import { $dom } from "@/utils";
import { decodeInkInfo } from "@/models/card";
import gridTemplate from "@/template/cardGrid/grid.svg";

/** カードの塗り範囲をグリッド表現 */
export function createCardGrid(
  g: string | null | undefined,
  sg: string | null | undefined
) {
  const k = [g, sg].map((v) => decodeInkInfo(v).map(convertNumGrit));
  const svgText = render(gridTemplate, { g: k[0], sg: k[1] });
  const grid = $dom(`<img src="${svgToDataURI(svgText)}" class="pointer-events-none">`);
  return grid;
}

function convertNumGrit(num: number) {
  return { x: num % 8 * 12, y: ~~(num / 8) * 12 };
}
function svgToDataURI(svgText: string) {
  return "data:image/svg+xml," + encodeURIComponent(svgText);
}
