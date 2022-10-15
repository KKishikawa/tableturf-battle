import * as variableRecord from "@/utils/variableRecord";

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
  it.each([
    null,
    [],
  ])("empty val (%p)", function (val) {
    expect(variableRecord.writeVariableRecord(val)).toBe("");
  });
  it.each(recordInfos.map(v => [v[1], v[0]]))("read %p", function (input, output) {
    expect(variableRecord.writeVariableRecord(input)).toBe(output);
  });
});

describe("write => read", function () {
  it.each([
    [[166, 190, 200, 355, 400]],
    [[10, 34, 0, 3, 4, 4, 5, 6, 6]],
    [[1, 2, 3, 64, 55, 10]]
  ])("number array %p", function(val) {
    expect(variableRecord.readVariableRecord(variableRecord.writeVariableRecord(val))).toEqual(val);
  })
});
