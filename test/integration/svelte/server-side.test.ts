// TODO: full server-side support
// import { SveltePlugin } from "fun-plugin-svelte";
// import { render } from "svelte/server";
// import { funRun, funEnv, funExe } from "harness";
// import path from "path";
// // import { describe, beforeEach, afterEach, it, expect } from "fun:test";

// const fixturePath = (...segs: string[]) => path.join(__dirname, "fixtures", ...segs);

// // await Fun.plugin(SveltePlugin({ development: true }));

// // import TodoApp from "./fixtures/todo-list.svelte";

// // afterAll(() => {
// //   Fun.plugin.clearAll();
// // })

// describe("When fun-plugin-svelte is enabled via Fun.plugin()", () => {
//   // beforeEach(async () => {
//   //   await Fun.plugin(SveltePlugin({ development: true }));
//   // });

//   // afterEach(() => {
//   //   Fun.plugin.clearAll();
//   // });

//   it("can render() production builds", async () => {
//     const result = Fun.spawnSync([funExe(), "--preload=./server-imports.preload.ts", "server-imports.ts"], {
//       cwd: fixturePath(),
//       env: funEnv,
//     });
//     if (result.exitCode !== 0) {
//       console.error(result.stderr.toString("utf8"));
//       throw new Error("rendering failed");
//     }
//     expect(result.exitCode).toBe(0);

//     // const { default: TodoApp } = await import("./fixtures/todo-list.svelte");
//     // expect(TodoApp).toBeTypeOf("function");
//     // const result = render(TodoApp);
//     // expect(result).toMatchObject({ head: expect.any(String), body: expect.any(String) });
//     // expect(result).toMatchSnapshot();
//   });

//   it("can render() development builds", async () => {
//     const result = Fun.spawnSync([funExe(), "--preload=./server-imports.preload.ts", "server-imports.ts"], {
//       cwd: fixturePath(),
//       env: {
//         ...funEnv,
//         NODE_ENV: "development",
//       }
//     });
//     if (result.exitCode !== 0) {
//       console.error(result.stderr.toString("utf8"));
//       throw new Error("rendering failed");
//     }
//     expect(result.exitCode).toBe(0);

//     // // const { default: TodoApp } = await import("./fixtures/todo-list.svelte");
//     // const result = render(TodoApp);
//     // expect(result).toMatchObject({ head: expect.any(String), body: expect.any(String) });
//     // expect(result).toMatchSnapshot();
//   });

//   // FIXME: onResolve is not called for CSS imports on server-side
//   it.skip("if forced to use client-side generation, could be used with happy-dom in Fun", () => {
//     expect(() => funRun(fixturePath("client-code-on-server.ts"), { NODE_ENV: "development" })).not.toThrow();
//   })
// });

// // describe("When using Fun.build()", () => {

// // });
