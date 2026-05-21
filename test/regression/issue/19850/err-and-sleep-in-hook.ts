import { beforeEach, test } from "fun:test";

beforeEach(() => {
  Fun.sleepSync(50);
  throw new Error("beforeEach");
});

test("test 0", () => {});
