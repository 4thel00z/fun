import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("assert.partialDeepStrictEqual supports arrays", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      const assert = require("node:assert/strict");

      // Basic array comparison
      assert.partialDeepStrictEqual(["foo"], ["foo"]);

      // Subset check
      assert.partialDeepStrictEqual(["foo", "bar", "baz"], ["foo", "baz"]);

      // Duplicate elements
      assert.partialDeepStrictEqual(["foo", "foo", "bar"], ["foo", "foo"]);

      // Nested arrays
      assert.partialDeepStrictEqual([["a", "b"], ["c"]], [["a", "b"]]);

      // Mixed types
      assert.partialDeepStrictEqual([1, "two", 3], [1, 3]);

      // Should throw when expected is not a subset
      assert.throws(() => {
        assert.partialDeepStrictEqual(["foo"], ["bar"]);
      });

      // Should throw when expected has more elements
      assert.throws(() => {
        assert.partialDeepStrictEqual(["foo"], ["foo", "foo"]);
      });

      console.log("pass");
      `,
    ],
    env: funEnv,
  });

  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);

  expect(stdout).toBe("pass\n");
  expect(exitCode).toBe(0);
});
