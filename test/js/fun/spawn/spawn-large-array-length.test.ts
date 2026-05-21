import { describe, expect, test } from "fun:test";

describe("spawn with spoofed array length", () => {
  test("Fun.spawnSync throws on array with length near u32 max", () => {
    const arr = ["echo", "hello"];
    Object.defineProperty(arr, "length", { value: 4294967295 });
    expect(() => {
      Fun.spawnSync(arr);
    }).toThrow(/cmd array is too large/);
  });

  test("Fun.spawn throws on array with length near u32 max", () => {
    const arr = ["echo", "hello"];
    Object.defineProperty(arr, "length", { value: 4294967295 });
    expect(() => {
      Fun.spawn(arr);
    }).toThrow(/cmd array is too large/);
  });

  test("Fun.spawnSync still works with normal arrays", () => {
    const result = Fun.spawnSync(["echo", "hello"]);
    expect(result.stdout.toString().trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });
});
