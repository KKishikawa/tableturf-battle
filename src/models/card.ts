// import { getFromStorage, setToStrage, saveJson } from "@/utils";
import { getFromStorage, setToStrage } from "@/utils";
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
export interface IDeck {
  /** デッキコード */
  c?: string;
  /** デッキ名 */
  t: string;
  /** デッキ保存日時 */
  d: string;
  /** デッキid */
  id?: string;
}

export const RARITY = ["コモン", "レア", "フレッシュ"];
/** 塗り座標数列を情報文字列に変換します */
export function encodeInkInfo(val: number[] | null | undefined) {
  const d = RecordUtil.writeFixRecord(val);
  return d != "" ? d : undefined;
}
/** 塗り情報文字列を座標配列に復元します */
export function decodeInkInfo(val: string | null | undefined) {
  return RecordUtil.readFixRecord(val);
}
/** 塗れる数をカウントします */
export function inkCount(...g: (string | null | undefined)[]) {
  return g.reduce((init, g) => init + RecordUtil.calcFixRecordLen(g), 0);
}

/** デッキコードをカードリストに変換します */
export function decodeDeckCode(code: string | null | undefined) {
  const cardNums = [...new Set(RecordUtil.readVariableRecord(code))];
  const cardList = getCardList();
  return cardNums.reduce<ICard[]>((arr, n) => {
    const card = cardList.c.find((cc) => cc.n == n);
    if (card) arr.push(card);
    return arr;
  }, []);
}
/** カードNoリストをデッキコードに変換します */
export function encodeDeckCode(cards: number[]) {
  return RecordUtil.writeVariableRecord(cards);
}

/** ファイルからカードリスト情報を読み込みます */
export function getCardList() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@/../data/v.4.0.0.json") as ICardData;
}
export const availableInkCount = [
  ...new Set(getCardList().c.map((c) => inkCount(c.g, c.sg))),
].sort((a, b) => a - b);
export const availableSP = [
  ...new Set(getCardList().c.map(c => c.sp))
].sort((a, b) => a - b);

const stragekey = "tableturf_deckV0";
/** ローカルストレージにデッキを保存します */
export function saveToLS(data: IDeck[]) {
  setToStrage(stragekey, data);
}
/** ローカルストレージから保存済みデッキを読み込みます */
export function loadFromLS(): IDeck[] {
  const d = getFromStorage<IDeck[]>(stragekey);
  if (!d) return [];
  return d;
}

/** URLからデッキを読み込む */
export function loadFromQuery() {
  const query = new URLSearchParams(window.location.search);
  const code = query.get("c");
  return code;
}
/** urlを共有用URLを作成します */
export function createShareURL(code: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("c", code);
  return url.href;
}
