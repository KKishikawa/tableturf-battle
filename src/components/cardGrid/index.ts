import mustache from "mustache";
import { $dom } from "@/utils";
import { decodeInkInfo } from "@/models/card";
import gridTemplate from "./grid.svg.mustache?raw";

/** カードの塗り範囲をグリッド表現 */
export function createCardGrid(
  g: string | null | undefined,
  sg: string | null | undefined
) {
  const k = [g, sg].map((v) => decodeInkInfo(v).map(convertNumGrit));
  const svgText = mustache.render(gridTemplate, { g: k[0], sg: k[1] });
  const grid = $dom<HTMLImageElement>(`<img draggable=false width=97 height=97>`);
  grid.src = svgToDataURI(svgText);
  return grid;
}

function convertNumGrit(num: number) {
  return { x: num % 8 * 12 + .5, y: ~~(num / 8) * 12 + .5 };
}
function svgToDataURI(svgText: string) {
  return "data:image/svg+xml," + encodeURIComponent(svgText);
}
