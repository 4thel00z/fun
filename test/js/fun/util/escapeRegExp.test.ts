import testHelpers from "fun:internal-for-testing";
import { expect, test } from "fun:test";
const { escapeRegExp, escapeRegExpForPackageNameMatching } = testHelpers;

test("escapeRegExp", () => {
  expect(escapeRegExp("\\ ^ $ * + ? . ( ) | { } [ ]")).toBe("\\\\ \\^ \\$ \\* \\+ \\? \\. \\( \\) \\| \\{ \\} \\[ \\]");
  expect(escapeRegExp("foo - bar")).toBe("foo \\x2d bar");
});

test("escapeRegExpForPackageName", () => {
  // same as the other but '*' becomes '.*' instead of '\*'
  expect(escapeRegExpForPackageNameMatching("foo - bar*")).toBe("foo \\x2d bar.*");
  expect(escapeRegExpForPackageNameMatching("\\ ^ $ * + ? . ( ) | { } [ ]")).toBe(
    "\\\\ \\^ \\$ .* \\+ \\? \\. \\( \\) \\| \\{ \\} \\[ \\]",
  );
});
