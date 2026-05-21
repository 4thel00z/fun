import { estimateShallowMemoryUsageOf } from "fun:jsc";
import { expect, test } from "fun:test";

test("memory usage of Performance", () => {
  const initial = estimateShallowMemoryUsageOf(performance);
  for (let i = 0; i < 1024; i++) {
    performance.mark(`mark-${i}`);
  }
  const final = estimateShallowMemoryUsageOf(performance);

  for (let i = 1; i < 1024; i++) {
    performance.measure(`measure-${i}`, `mark-${i}`, `mark-${i - 1}`);
  }
  const final2 = estimateShallowMemoryUsageOf(performance);
  expect(final2).toBeGreaterThan(final);
  expect(final).toBeGreaterThan(initial);
});
