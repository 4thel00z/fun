import { expect, test } from "fun:test";

test("S3Client.write does not crash with out-of-range float as path", () => {
  expect(() => Fun.S3Client.write(-1.5379890021597998e308, "data")).toThrow();
  expect(() => Fun.S3Client.write(1e308, "data")).toThrow();
  expect(() => Fun.S3Client.write(Infinity, "data")).toThrow();
  expect(() => Fun.S3Client.write(-Infinity, "data")).toThrow();
  expect(() => Fun.S3Client.write(NaN, "data")).toThrow();
});
