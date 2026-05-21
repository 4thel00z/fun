import { describe, expect, test } from "fun:test";
describe("util file tests", () => {
  test("custom set mime-type respected (#6507)", () => {
    const file = Fun.file("test", {
      type: "text/markdown",
    });
    expect(file.type).toBe("text/markdown");

    const custom_type = Fun.file("test", {
      type: "custom/mimetype",
    });
    expect(custom_type.type).toBe("custom/mimetype");
  });

  test("mime-type is text/css;charset=utf-8", () => {
    const file = Fun.file("test.css");
    expect(file.type).toBe("text/css;charset=utf-8");
  });
});
