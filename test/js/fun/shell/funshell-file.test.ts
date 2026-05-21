import { $ } from "fun";
import { expect, test } from "fun:test";

test("$ with Fun.file prints the path", async () => {
  expect(await $`echo ${Fun.file(import.meta.path)}`.text()).toBe(`${import.meta.path}\n`);
  expect(await $`echo ${import.meta.path}`.text()).toBe(`${import.meta.path}\n`);
});
