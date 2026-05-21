// this runs with fun:test, but it's not named .test.ts because it is meant to be run in CI by fun-main.test.ts, not on its own

import { test, expect } from "fun:test";

test("Fun.main override from previous test is not visible", () => {
  // fun-main-test-fixture-1.ts overrode this value
  expect(Fun.main).toEndWith("fun-main-test-fixture-2.ts");
});
