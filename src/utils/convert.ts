/**
 * 10進数文字列を整数値に変換します
 * @param str 変化する値
 * @param fallbackNum 変換できなかった場合に代わりにこの値を返却します。デフォルトは0
 */
export function toInt(str: string | null | undefined, fallbackNum = 0) {
  if (str == null) return fallbackNum;
  const val = parseInt(str, 10);
  if (isFinite(val)) return val;
  return fallbackNum;
}
/**
 * 10進数文字列を浮動小数値に変換します
 * @param str 変化する値
 * @param fallbackNum 変換できなかった場合に代わりにこの値を返却します。デフォルトは0
 */
export function toFloat(str: string | null | undefined, fallbackNum = 0) {
  if (str == null) return fallbackNum;
  const val = parseFloat(str);
  if (isFinite(val)) return val;
  return fallbackNum;
}
