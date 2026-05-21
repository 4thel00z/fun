import { highlightJavaScript as highlighter } from "fun:internal-for-testing";
import { expect, test } from "fun:test";

test("highlighter", () => {
  expect(highlighter("`can do ${123} ${'123'} ${`123`}`").length).toBeLessThan(150);
  expect(highlighter("`can do ${123} ${'123'} ${`123`}`123").length).toBeLessThan(150);
});
