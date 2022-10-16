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

/** デッキコードをカードリストに変換します */
export function decodeDeckCode(code: string | null | undefined) {
  const cardNums = RecordUtil.readVariableRecord(code);
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
  return require("@/../data/v.1.0.0.json") as ICardData;
}

const stragekey = "tableturf_deckV0";
/** ローカルストレージにデッキを保存します */
export function savetToLS(data: IDeck[]) {
  setToStrage(stragekey, data);
}
/** ローカルストレージから保存済みデッキを読み込みます */
export function loadFromLS(): IDeck[] {
  const d = getFromStorage<IDeck[]>(stragekey);
  if (!d) return [];
  return d;
}
