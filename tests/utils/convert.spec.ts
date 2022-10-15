import * as convert from "@/utils/convert";

describe("toInt", function () {
  it.each(["", null, undefined,])("invalid val (%p)", function(val) {
    expect(convert.toInt(val)).toBe(0);
  });
  it("invalid val (fallback)", function () {
    expect(isNaN(convert.toInt(null, NaN))).toBe(true);
    expect(convert.toInt("", -1)).toBe(-1);
  });
  it.each([["1", 1],["0", 0],["13", 13], ["3.8", 3], ["98", 98]])("val %p", function(input, output) {
    expect(convert.toInt(input, -1)).toBe(output);
  });
});

describe("toFloat", function () {
  it.each(["", null, undefined,])("invalid val (%p)", function(val) {
    expect(convert.toFloat(val)).toBe(0);
  });
  it("invalid val (fallback)", function () {
    expect(isNaN(convert.toFloat(null, NaN))).toBe(true);
    expect(convert.toFloat("", -1)).toBe(-1);
  });
  it.each([["1", 1],["0", 0],["13", 13], ["3.8", 3.8], ["98.673333", 98.673333]])("val %p", function(input, output) {
    expect(convert.toFloat(input, -1)).toBe(output);
  });
});
