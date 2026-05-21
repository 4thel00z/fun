import { expect, test } from "fun:test";
test("new snapshot", () => {
  expect({ b: 2 }).toMatchSnapshot();
});
