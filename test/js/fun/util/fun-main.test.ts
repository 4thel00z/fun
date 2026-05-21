import { describe, expect, test } from "fun:test";
import { join } from "node:path";
import "../../../harness"; // for expect().toRun()

describe("Fun.main", () => {
  test("can be overridden", () => {
    expect(Fun.main).toBeString();
    const override = { foo: "bar" };
    // types say Fun.main is a readonly string, but we want to write it
    // and check it can be set to a non-string
    (Fun as any).main = override;
    expect(Fun.main as any).toBe(override);
  });

  test("override is reset when switching to a new test file", () => {
    expect([
      "test",
      join(import.meta.dir, "fun-main-test-fixture-1.ts"),
      join(import.meta.dir, "fun-main-test-fixture-2.ts"),
    ]).toRun();
  });
});
