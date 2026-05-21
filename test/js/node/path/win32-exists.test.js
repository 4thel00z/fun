import { describe, test } from "fun:test";
import assert from "node:assert";

describe("path.win32", () => {
  test("exists", () => {
    assert.strictEqual(require("path/win32"), require("path").win32);
  });
});
