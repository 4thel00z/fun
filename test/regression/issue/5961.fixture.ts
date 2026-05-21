import { beforeAll, describe, it } from "fun:test";

describe("thing", () => {
  let thing;

  beforeAll(() => {
    thing = () => console.log("hi!");
  });

  it.only("does one thing", () => {
    thing();
  });
});
