// import { getFromStorage, setToStrage, saveJson } from "@/utils";
import * as RecordUtil from "@/utils/variableRecord";
export interface ICardData {
  /** バージョン */
  v: 0;
  c: ICard[];
}
export interface ICard {
  /** カードno */
  n: number;
  /** sp必要数 */
  sp: number;
  /** 日本語名 */
  ja: string;
  /** spマス */
  sg?: string;
  /** sp以外マス */
  g?: string;
  /** レア度 */
  r: number;
}

export const RARITY = ["コモン", "レア", "フレッシュ"];
/** 塗り座標数列を情報文字列に変換します */
export function encodeInkInfo(val: number[] | null | undefined) {
  const d = RecordUtil.writeFixRecord(val);
  return d != "" ? d : undefined;
}
/** 塗り情報文字列を座標配列に復元します */
export function decodeInkInfo(val: string | null | undefined) {
  return RecordUtil.readeFixRecord(val);
}
/** 塗れる数をカウントします */
export function inkCount(...g: (string | null | undefined)[]) {
  return g.reduce((init, g) => init + RecordUtil.calcFixRecordLen(g), 0);
}

/** ファイルからカードリスト情報を読み込みます */
export function getCardList() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@/../data/v.1.0.0.json") as ICardData;
}
// export async function loadFromFile(
//   file: File | Blob | null
// ): Promise<ICard[] | null> {
//   if (!file) return null;
//   try {
//     const json = await file.text();
//     const d = JSON.parse(json);
//     return d.c;
//   } catch (error) {
//     console.log(error);
//     return null;
//   }
// }
