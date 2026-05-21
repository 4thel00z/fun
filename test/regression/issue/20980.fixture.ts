import { beforeEach, it, expect } from "fun:test";
beforeEach(async () => {
  await Fun.sleep(100);
  throw 5;
});
it("test 0", () => {
  expect(1).toBe(0);
});
