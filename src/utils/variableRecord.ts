const convertDict =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
const dataBitCount = 5;
const msb = 0b100000;
const dataBit = 0b11111;

/** 数列を読み込む */
export function readVariableRecord(
  rawstr: string | null | undefined
): number[] {
  if (!rawstr) return [];
  const ret = [];
  let continuous = false;
  for (const char of rawstr) {
    // one char is a 5bit
    const cur_input_raw = convertDict.indexOf(char);
    // return empty array if invalid value
    if (cur_input_raw < 0) return [];
    const cur_input = cur_input_raw & dataBit;
    if (continuous) {
      ret[ret.length - 1] += cur_input << dataBitCount;
    } else {
      ret.push(cur_input);
    }
    continuous = (cur_input_raw & msb) > 0;
  }
  return ret;
}
export function calcVariableRecordLen(
  rawstr: string | null | undefined
): number {
  if (!rawstr) return 0;
  let continuous = false;
  let count = 0;
  for (const char of rawstr) {
    // one char is a 5bit
    const cur_input_raw = convertDict.indexOf(char);
    // return 0 if invalid value
    if (cur_input_raw < 0) return 0;
    if (!continuous) count++;
    continuous = (cur_input_raw & msb) > 0;
  }
  return count;
}
/** 数列を短縮文字列に変換する */
export function writeVariableRecord(
  record: number[] | null | undefined
): string {
  if (!record || record.length < 1) return "";
  const writer = new VariableRecordWriter();
  for (const num of record) {
    writer.write(num);
  }
  return writer.data.join("");
}

class VariableRecordWriter {
  data: string[] = [];
  public write(val: number) {
    const nextVal = val >> dataBitCount;
    const tetra = val & dataBit;
    if (nextVal > 0) {
      this.innerWriteSeq(tetra | msb);
      this.write(nextVal);
    } else {
      this.innerWriteSeq(tetra);
    }
  }
  private innerWriteSeq(val: number) {
    this.data.push(convertDict[val]);
  }
}

/** 数列を読み込む(固定長) */
export function readeFixRecord(rawstr: string | null | undefined): number[] {
  if (!rawstr) return [];
  const ret = [];
  for (const char of rawstr) {
    const cur_input_raw = convertDict.indexOf(char);
    // return empty array if invalid value
    if (cur_input_raw < 0) return [];
    ret.push(cur_input_raw);
  }
  return ret;
}
/** 固定長データから数列の長さを取得する */
export function calcFixRecordLen(rawstr: string | null | undefined): number {
  if (!rawstr) return 0;
  let count = 0;
  for (; count < rawstr.length; count++) {
    // return 0 if invalid value
    if (!convertDict.includes(rawstr[count])) return 0;
  }
  return count;
}

/** 数列を短縮文字列に変換する(固定長) */
export function writeFixRecord(record: number[] | null | undefined): string {
  if (!record || record.length < 1) return "";
  return record.map((r) => convertDict[r]).join("");
}
