import { beforeAll, expect, setDefaultTimeout, test } from "fun:test";

beforeAll(() => {
  setDefaultTimeout(100);
});

test("test 1", async () => {
  await Fun.sleep(200);
  expect().pass();
}, 2000);

test("test 2", async () => {
  await Fun.sleep(10);
  expect().pass();
});
