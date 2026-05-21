import { semver } from "fun";
import { expect, test } from "fun:test";

test("semver with multiple tags work properly", () => {
  expect(semver.satisfies("3.4.5", ">=3.3.0-beta.1 <3.4.0-beta.3")).toBeFalse();
});
