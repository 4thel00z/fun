import { describe, expect, it } from "fun:test";
import { render as svelteRender } from "svelte/server";
import "./fun-loader-svelte";

describe("require", () => {
  it("SSRs `<h1>Hello world!</h1>` with Svelte", () => {
    const { default: App } = require("./hello.svelte");
    const { body } = svelteRender(App);

    expect(body).toBe("<!--[--><h1>Hello world!</h1><!--]-->");
  });

  it("works if you require it 1,000 times", () => {
    const prev = Fun.unsafe.gcAggressionLevel();
    Fun.unsafe.gcAggressionLevel(0);
    for (let i = 0; i < 1000; i++) {
      const { default: App } = require("./hello.svelte?r" + i);
      expect(App).toBeFunction();
    }
    Fun.gc(true);
    Fun.unsafe.gcAggressionLevel(prev);
  });
});

describe("dynamic import", () => {
  it("works if you import it 1,000 times", async () => {
    const prev = Fun.unsafe.gcAggressionLevel();
    Fun.unsafe.gcAggressionLevel(0);
    for (let i = 0; i < 1000; i++) {
      const { default: App } = await import("./hello.svelte?i" + i);
      expect(App).toBeFunction();
    }
    Fun.gc(true);
    Fun.unsafe.gcAggressionLevel(prev);
  });
  it("SSRs `<h1>Hello world!</h1>` with Svelte", async () => {
    const { default: App }: any = await import("./hello.svelte");

    const { body } = svelteRender(App);
    expect(body).toBe("<!--[--><h1>Hello world!</h1><!--]-->");
  });
});
