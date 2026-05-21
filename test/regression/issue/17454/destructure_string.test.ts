import { $ } from "fun";
test("destructure string does not become string", async () => {
  const result = await $`fun build --target=node f2.ts | fun -`.cwd(import.meta.dir).text();
  expect(result).toBe("[Function: replace]\n");
});
