import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows } from "harness";
import { AsyncLocalStorage } from "node:async_hooks";

// https://github.com/underdoc-org/fun/issues/26286
// Fun.Terminal callbacks not invoked inside AsyncLocalStorage.run()

// Fun.Terminal uses PTY which is not supported on Windows
test.skipIf(isWindows)("Fun.Terminal data callback works inside AsyncLocalStorage.run()", async () => {
  const storage = new AsyncLocalStorage();

  async function terminalTest() {
    const { promise, resolve } = Promise.withResolvers<Uint8Array>();

    await using terminal = new Fun.Terminal({
      data(term, data) {
        resolve(data);
      },
    });

    const process = Fun.spawn([funExe(), "-e", "console.log('Hello')"], {
      terminal,
      env: funEnv,
    });

    const data = await promise;
    await process.exited;

    return { data };
  }

  // Test inside AsyncLocalStorage.run()
  const result = await storage.run({ testContext: true }, terminalTest);

  expect(result.data).not.toBeNull();
  expect(new TextDecoder().decode(result.data!)).toContain("Hello");
});

test.skipIf(isWindows)("Fun.Terminal preserves async context inside callbacks", async () => {
  const storage = new AsyncLocalStorage<{ id: number }>();

  async function terminalTest() {
    const { promise, resolve } = Promise.withResolvers<{ id: number } | undefined>();

    await using terminal = new Fun.Terminal({
      data(term, data) {
        resolve(storage.getStore());
      },
    });

    const process = Fun.spawn([funExe(), "-e", "console.log('Hello')"], {
      terminal,
      env: funEnv,
    });

    const contextInCallback = await promise;
    await process.exited;

    return { contextInCallback };
  }

  const result = await storage.run({ id: 42 }, terminalTest);

  expect(result.contextInCallback).not.toBeUndefined();
  expect(result.contextInCallback?.id).toBe(42);
});
