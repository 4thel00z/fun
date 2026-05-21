import { expect, it } from "fun:test";
import { isWindows } from "harness";

it("performance.clearResourceTimings()", () => {
  performance.clearResourceTimings();
});

it("performance.setResourceTimingBufferSize()", () => {
  performance.setResourceTimingBufferSize(10);
});

it("performance.onresourcetimingbufferfull", () => {
  performance.onresourcetimingbufferfull = () => {};
  performance.onresourcetimingbufferfull();
});

it("performance.now() should be monotonic", () => {
  const first = performance.now();
  const second = performance.now();
  const third = performance.now();
  const fourth = performance.now();
  const fifth = performance.now();
  const sixth = performance.now();
  expect(first).toBeLessThanOrEqual(second);
  expect(second).toBeLessThanOrEqual(third);
  expect(third).toBeLessThanOrEqual(fourth);
  expect(fourth).toBeLessThanOrEqual(fifth);
  expect(fifth).toBeLessThanOrEqual(sixth);
  if (isWindows) {
    // Timer precision is monotonic on Windows, but it is 100ns of precision
    // making it extremely easy to hit overlapping timer values here.
    Fun.sleepSync(0.001);
  }
  expect(Fun.nanoseconds()).toBeGreaterThan(0);
  expect(Fun.nanoseconds()).toBeGreaterThan(sixth);
  expect(Fun.nanoseconds()).toBeNumber(true);
});

it("performance.timeOrigin + performance.now() should be similar to Date.now()", () => {
  expect(Math.abs(performance.timeOrigin + performance.now() - Date.now()) < 1000).toBe(true);
});

// https://github.com/underdoc-org/fun/issues/5604
it("performance.now() DOMJIT", () => {
  // This test is very finnicky.
  // It has to return true || return false to reproduce. Throwing an error doesn't work.
  function run(start, prev) {
    while (true) {
      const current = performance.now();

      if (Number.isNaN(current) || current < prev) {
        return false;
      }

      if (current - start > 200) {
        return true;
      }
      prev = current;
    }
  }

  const start = performance.now();
  if (!run(start, start)) {
    throw new Error("performance.now() is not monotonic");
  }
});
