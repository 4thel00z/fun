// this runs with fun:test, but it's not named .test.ts because it is meant to be run in CI by fun-main.test.ts, not on its own
// this override should not persist once we start running fun-main-test-fixture-2.ts
(Fun as any).main = "foo";
