import * as variableRecord from "@/utils/variableRecord";
{
  const recordInfos: [string, number[]][] = [
    ["1c3f", [1, 12, 3, 15]],
    ["0", [0]],
    ["174g3", [1, 7, 4, 16, 3]],
  ];
  describe("readVariableRecord", function () {
    it.each(["", null, "qq@w", "1x+t", "0fff(6z133", undefined])(
      "invalid string (%p) ",
      function (val) {
        expect(variableRecord.readVariableRecord(val)).toEqual([]);
      }
    );
    it.each(recordInfos)("read %p", function (input, output) {
      expect(variableRecord.readVariableRecord(input)).toEqual(output);
    });
  });

  describe("writeVariableRecord", function () {
    it.each([null, []])("empty val (%p)", function (val) {
      expect(variableRecord.writeVariableRecord(val)).toBe("");
    });
    it.each(recordInfos.map((v) => [v[1], v[0]]))(
      "read %p",
      function (input, output) {
        expect(variableRecord.writeVariableRecord(input)).toBe(output);
      }
    );
  });
}
{
  const recordInfos: [string, number[]][] = [
    ["1c3f", [1, 12, 3, 15]],
    ["0", [0]],
    ["174g3", [1, 7, 4, 16, 3]],
  ];
  describe("readVariableRecord", function () {
    it.each(["", null, "qq@w", "1x+t", "0fff(6z133", undefined])(
      "invalid string (%p) ",
      function (val) {
        expect(variableRecord.readFixRecord(val)).toEqual([]);
      }
    );
    it.each(recordInfos)("read %p", function (input, output) {
      expect(variableRecord.readFixRecord(input)).toEqual(output);
    });
  });


  describe("writeVariableRecord", function () {
    it.each([null, []])("empty val (%p)", function (val) {
      expect(variableRecord.writeFixRecord(val)).toBe("");
    });
    it.each(recordInfos.map((v) => [v[1], v[0]]))(
      "read %p",
      function (input, output) {
        expect(variableRecord.writeFixRecord(input)).toBe(output);
      }
    );
  });
}

describe("calcVariableRecordLen", function () {
  const fixRecordInfo = [
    [["dkEN0-", 4]],
    [["1あれ", 0]],
    [[null, 0]],
    [[undefined, 0]]
  ] as const;
  it.each(fixRecordInfo)("string %p", function ([val, len]) {
    expect(
      variableRecord.calcVariableRecordLen(val)
    ).toEqual(len);
  });
});
describe("calcFixRecordLen", function () {
  const fixRecordInfo = [
    [["dkEN0-", 6]],
    [["1あれ", 0]],
    [[null, 0]],
    [[undefined, 0]]
  ] as const;
  it.each(fixRecordInfo)("string %p", function ([val, len]) {
    expect(
      variableRecord.calcFixRecordLen(val)
    ).toEqual(len);
  });
});
describe("write => read", function () {
  it.each([
    [[166, 190, 200, 355, 400]],
    [[10, 34, 0, 3, 4, 4, 5, 6, 6]],
    [[1, 2, 3, 64, 55, 10]],
  ])("number array %p", function (val) {
    expect(
      variableRecord.readVariableRecord(variableRecord.writeVariableRecord(val))
    ).toEqual(val);
  });
});
describe("write => read (fixed)", function () {
  it.each([
    [[]],
    [[8, 10, 21, 3, 50]],
    [[10, 34, 0, 3, 4, 4, 5, 6, 6]],
    [[1, 2, 3, 63, 55, 10]],
  ])("number array %p", function (val) {
    expect(
      variableRecord.readFixRecord(variableRecord.writeFixRecord(val))
    ).toEqual(val);
  });
});
