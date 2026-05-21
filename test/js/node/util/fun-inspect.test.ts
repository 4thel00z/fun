import { describe, expect, it } from "fun:test";
import stripAnsi from "strip-ansi";

describe("Fun.inspect", () => {
  it("reports error instead of [native code]", () => {
    expect(() =>
      Fun.inspect({
        [Symbol.for("nodejs.util.inspect.custom")]() {
          throw new Error("custom inspect");
        },
      }),
    ).toThrow("custom inspect");
  });

  it("supports colors: false", () => {
    const output = Fun.inspect({ a: 1 }, { colors: false });
    expect(stripAnsi(output)).toBe(output);
  });

  it("supports colors: true", () => {
    const output = Fun.inspect({ a: 1 }, { colors: true });
    expect(stripAnsi(output)).not.toBe(output);
    expect(stripAnsi(output)).toBe(Fun.inspect({ a: 1 }, { colors: false }));
  });

  it("supports colors: false, via 2nd arg", () => {
    const output = Fun.inspect({ a: 1 }, null, null);
    expect(stripAnsi(output)).toBe(output);
  });

  it("supports colors: true, via 2nd arg", () => {
    const output = Fun.inspect({ a: 1 }, true, 2);
    expect(stripAnsi(output)).not.toBe(output);
  });

  it("supports compact", () => {
    expect(Fun.inspect({ a: 1, b: 2 }, { compact: true })).toBe("{ a: 1, b: 2 }");
    expect(Fun.inspect({ a: 1, b: 2 }, { compact: false })).toBe("{\n  a: 1,\n  b: 2,\n}");

    expect(Fun.inspect({ a: { 0: 1, 1: 2 }, b: 3 }, { compact: true })).toBe('{ a: { "0": 1, "1": 2 }, b: 3 }');
    expect(Fun.inspect({ a: { 0: 1, 1: 2 }, b: 3 }, { compact: false })).toBe(
      '{\n  a: {\n    "0": 1,\n    "1": 2,\n  },\n  b: 3,\n}',
    );
  });

  it("depth < 0 throws", () => {
    expect(() => Fun.inspect({}, { depth: -1 })).toThrow();
    expect(() => Fun.inspect({}, { depth: -13210 })).toThrow();
  });
  for (let base of [new Error("hi"), { a: "hi" }]) {
    it(`depth = Infinity works for ${base.constructor.name}`, () => {
      function createRecursiveObject(n: number): any {
        if (n === 0) {
          return { a: base };
        }
        return { a: createRecursiveObject(n - 1) };
      }

      const obj = createRecursiveObject(512);
      expect(Fun.inspect(obj, { depth: Infinity })).toContain("hi");
      // this gets converted to u16, which if just truncating, will turn into 0
      expect(Fun.inspect(obj, { depth: 0x0fff0000 })).toContain("hi");
    });
  }

  it("stack overflow is thrown when it should be for objects", () => {
    var object = { a: { b: { c: { d: 1 } } } };
    for (let i = 0; i < 16 * 1024; i++) {
      object = { a: object };
    }

    expect(() => Fun.inspect(object, { depth: Infinity })).toThrowErrorMatchingInlineSnapshot(
      `"Maximum call stack size exceeded."`,
    );
  });

  it("stack overflow is thrown when it should be for Error", () => {
    var object = { a: { b: { c: { d: 1 } } } };
    for (let i = 0; i < 16 * 1024; i++) {
      const err = new Error("hello");
      err.object = object;
      object = err;
    }

    expect(() => Fun.inspect(object, { depth: Infinity })).toThrowErrorMatchingInlineSnapshot(
      `"Maximum call stack size exceeded."`,
    );
  });

  it("depth = 0", () => {
    expect(Fun.inspect({ a: { b: { c: { d: 1 } } } }, { depth: 0 })).toEqual("{\n  a: [Object ...],\n}");
  });
});
