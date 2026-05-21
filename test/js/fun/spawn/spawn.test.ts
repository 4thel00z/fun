import { ArrayBufferSink, readableStreamToText, spawn, spawnSync } from "fun";
import { beforeAll, describe, expect, it } from "fun:test";
import {
  gcTick as _gcTick,
  funEnv,
  funExe,
  getMaxFD,
  isBroken,
  isMacOS,
  isPosix,
  isWindows,
  shellExe,
  tmpdirSync,
  withoutAggressiveGC,
} from "harness";
import { closeSync, fstatSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path, { join } from "path";

let tmp: string;

beforeAll(() => {
  tmp = tmpdirSync();
});

function createHugeString() {
  const buf = Buffer.allocUnsafe("hello".length * 100 * 500 + "hey".length);
  buf.fill("hello");
  buf.write("hey", buf.length - "hey".length);
  return buf.toString();
}

for (let [gcTick, label] of [
  [_gcTick, "gcTick"],
  // [() => {}, "no gc tick"],
] as const) {
  Fun.gc(true);
  describe(label, () => {
    describe("spawnSync", () => {
      const hugeString = "hello".repeat(50000).slice();

      it("as an array", () => {
        const { stdout } = spawnSync(["node", "-e", "console.log('hi')"]);
        gcTick();
        // stdout is a Buffer
        const text = stdout!.toString();
        expect(text).toBe("hi\n");
        gcTick();
      });

      it("Uint8Array works as stdin", async () => {
        const { stdout, stderr } = spawnSync({
          cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
          stdin: new TextEncoder().encode(hugeString),
        });
        gcTick();
        const text = stdout!.toString();
        if (text !== hugeString) {
          expect(text).toHaveLength(hugeString.length);
          expect(text).toBe(hugeString);
        }
        expect(stderr!.byteLength).toBe(0);
        gcTick();
      });

      it("check exit code", async () => {
        const { exitCode: exitCode1 } = spawnSync({
          cmd: [funExe(), "-e", "process.exit(0)"],
        });
        gcTick();
        const { exitCode: exitCode2 } = spawnSync({
          cmd: [funExe(), "-e", "process.exit(1)"],
        });
        gcTick();
        expect(exitCode1).toBe(0);
        expect(exitCode2).toBe(1);
        gcTick();
      });

      it("throws errors for invalid arguments", async () => {
        expect(() => {
          spawnSync({
            cmd: ["node", "-e", "console.log('hi')"],
            cwd: "./this-should-not-exist",
          });
        }).toThrow("no such file or directory");
      });
    });

    describe("spawn", () => {
      const hugeString = createHugeString();

      it("as an array", async () => {
        gcTick();
        await (async () => {
          const { stdout } = spawn(["node", "-e", "console.log('hello')"], {
            stdout: "pipe",
            stderr: "ignore",
            stdin: "ignore",
          });
          gcTick();
          const text = await stdout.text();
          expect(text).toBe("hello\n");
        })();
        gcTick();
      });

      it("as an array with options object", async () => {
        gcTick();
        const { stdout } = spawn({
          cmd: [funExe(), "-e", "console.log(process.env.FOO)"],
          cwd: tmp,
          env: {
            ...process.env,
            FOO: "bar",
          },
          stdin: null,
          stdout: "pipe",
          stderr: null,
        });
        gcTick();
        const text = await stdout.text();
        expect(text).toBe("bar\n");
        gcTick();
      });

      it("Uint8Array works as stdin", async () => {
        const stdinPath = join(tmpdirSync(), "stdin.txt");
        gcTick();
        const { exited } = spawn({
          cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
          stdin: new TextEncoder().encode(hugeString),
          stdout: Fun.file(stdinPath),
        });
        gcTick();
        await exited;
        expect(readFileSync(stdinPath, "utf8")).toBe(hugeString);
        gcTick();
      });

      it("check exit code", async () => {
        const exitCode1 = await spawn({
          cmd: [funExe(), "-e", "process.exit(0)"],
        }).exited;
        gcTick();
        const exitCode2 = await spawn({
          cmd: [funExe(), "-e", "process.exit(1)"],
        }).exited;
        gcTick();
        expect(exitCode1).toBe(0);
        expect(exitCode2).toBe(1);
        gcTick();
      });

      it("nothing to stdout and sleeping doesn't keep process open 4ever", async () => {
        const proc = spawn({
          cmd: [shellExe(), "-c", "sleep 0.1"],
        });
        gcTick();
        for await (const _ of proc.stdout) {
          throw new Error("should not happen");
        }
        gcTick();
      });

      it("check exit code from onExit", async () => {
        const count = isWindows ? 100 : 1000;

        for (let i = 0; i < count; i++) {
          var exitCode1, exitCode2;
          await new Promise<void>(resolve => {
            var counter = 0;
            spawn({
              cmd: [funExe(), "-e", "process.exit(0)"],
              stdin: "ignore",
              stdout: "ignore",
              stderr: "ignore",
              onExit(subprocess, code) {
                exitCode1 = code;
                counter++;
                if (counter === 2) {
                  resolve();
                }
              },
            });

            spawn({
              cmd: [funExe(), "-e", "process.exit(1)"],
              stdin: "ignore",
              stdout: "ignore",
              stderr: "ignore",
              onExit(subprocess, code) {
                exitCode2 = code;
                counter++;

                if (counter === 2) {
                  resolve();
                }
              },
            });
          });

          expect(exitCode1).toBe(0);
          expect(exitCode2).toBe(1);
        }
      }, 60_000_0);

      // FIXME: fix the assertion failure
      it.skip("Uint8Array works as stdout", () => {
        gcTick();
        const stdout_buffer = new Uint8Array(11);
        const { stdout } = spawnSync(["node", "-e", "console.log('hello world')"], {
          stdout: stdout_buffer,
          stderr: null,
          stdin: null,
        });
        gcTick();
        const text = new TextDecoder().decode(stdout);
        const text2 = new TextDecoder().decode(stdout_buffer);
        expect(text).toBe("hello world");
        expect(text2).toBe("hello world");
        gcTick();
      });

      it.skip("Uint8Array works as stdout when is smaller than output", () => {
        gcTick();
        const stdout_buffer = new Uint8Array(5);
        const { stdout } = spawnSync(["node", "-e", "console.log('hello world')"], {
          stdout: stdout_buffer,
          stderr: null,
          stdin: null,
        });
        gcTick();
        const text = new TextDecoder().decode(stdout);
        const text2 = new TextDecoder().decode(stdout_buffer);
        expect(text).toBe("hello");
        expect(text2).toBe("hello");
        gcTick();
      });

      it.skip("Uint8Array works as stdout when is the exactly size than output", () => {
        gcTick();
        const stdout_buffer = new Uint8Array(12);
        const { stdout } = spawnSync(["node", "-e", "console.log('hello world')"], {
          stdout: stdout_buffer,
          stderr: null,
          stdin: null,
        });
        gcTick();
        const text = new TextDecoder().decode(stdout);
        const text2 = new TextDecoder().decode(stdout_buffer);
        expect(text).toBe("hello world\n");
        expect(text2).toBe("hello world\n");
        gcTick();
      });

      it.skip("Uint8Array works as stdout when is larger than output", () => {
        gcTick();
        const stdout_buffer = new Uint8Array(15);
        const { stdout } = spawnSync(["node", "-e", "console.log('hello world')"], {
          stdout: stdout_buffer,
          stderr: null,
          stdin: null,
        });
        gcTick();
        const text = new TextDecoder().decode(stdout);
        const text2 = new TextDecoder().decode(stdout_buffer);
        expect(text).toBe("hello world\n");
        expect(text2).toBe("hello world\n\u0000\u0000\u0000");
        gcTick();
      });

      it("Blob works as stdin", async () => {
        const stdinPath = join(tmpdirSync(), "stdin.txt");
        gcTick();
        const { exited } = spawn({
          cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
          stdin: new Blob([new TextEncoder().encode(hugeString)]),
          stdout: Fun.file(stdinPath),
        });

        await exited;
        expect(readFileSync(stdinPath, "utf8")).toBe(hugeString);
      });

      it("Fun.file() works as stdout", async () => {
        rmSync(tmp + "out.123.txt", { force: true });
        gcTick();
        const { exited } = spawn({
          cmd: ["node", "-e", "console.log('hello')"],
          stdout: Fun.file(tmp + "out.123.txt"),
        });

        await exited;
        gcTick();
        expect(await Fun.file(tmp + "out.123.txt").text()).toBe("hello\n");
      });

      it("Fun.file() works as stdin", async () => {
        const stdinPath = join(tmpdirSync(), "stdin.txt");
        writeFileSync(stdinPath, "hello there!");
        gcTick();
        const { stdout } = spawn({
          cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
          stdout: "pipe",
          stdin: Fun.file(stdinPath),
        });
        gcTick();
        expect(await readableStreamToText(stdout!)).toBe("hello there!");
      });

      it("Fun.file() works as stdin and stdout", async () => {
        const stdinPath = join(tmpdirSync(), "stdout.txt");
        writeFileSync(stdinPath, "hello!");
        gcTick();
        const stdoutPath = join(tmpdirSync(), "stdin.txt");
        writeFileSync(stdoutPath, "wrong!");
        gcTick();

        const { exited } = spawn({
          cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
          stdout: Fun.file(stdoutPath),
          stdin: Fun.file(stdinPath),
        });
        gcTick();
        await exited;
        expect(await Fun.file(stdinPath).text()).toBe("hello!");
        gcTick();
        expect(await Fun.file(stdoutPath).text()).toBe("hello!");
      });

      it("stdout can be read", async () => {
        const filePath = join(tmpdirSync(), "out.txt");
        await Fun.write(filePath, hugeString);
        gcTick();
        const promises = new Array(10);
        const statusCodes = new Array(10);
        for (let i = 0; i < promises.length; i++) {
          const { stdout, exited } = spawn({
            cmd: [funExe(), "-e", `require('fs').createReadStream(${JSON.stringify(filePath)}).pipe(process.stdout)`],
            stdout: "pipe",
            stdin: "ignore",
            stderr: "inherit",
          });

          gcTick();

          promises[i] = readableStreamToText(stdout!);
          statusCodes[i] = exited;
          gcTick();
        }

        const outputs = await Promise.all(promises);
        const statuses = await Promise.all(statusCodes);

        withoutAggressiveGC(() => {
          for (let i = 0; i < outputs.length; i++) {
            const output = outputs[i];
            const status = statuses[i];
            expect(status).toBe(0);
            if (output !== hugeString) {
              expect(output.length).toBe(hugeString.length);
            }
            expect(output).toBe(hugeString);
          }
        });
      });

      it("kill(SIGKILL) works", async () => {
        const process = spawn({
          cmd: [shellExe(), "-c", "sleep 1000"],
          stdout: "pipe",
        });
        gcTick();
        const prom = process.exited;
        process.kill("SIGKILL");
        await prom;
      });

      it("kill() works", async () => {
        const process = spawn({
          cmd: [shellExe(), "-c", "sleep 1000"],
          stdout: "pipe",
        });
        gcTick();
        const prom = process.exited;
        process.kill();
        await prom;
      });

      it("stdin can be read and stdout can be written", async () => {
        const proc = spawn({
          cmd: ["node", "-e", "process.stdin.setRawMode?.(true); process.stdin.pipe(process.stdout)"],
          stdout: "pipe",
          stdin: "pipe",
          lazy: true,
          stderr: "inherit",
        });

        var stdout = proc.stdout;
        var reader = stdout.getReader();
        proc.stdin!.write("hey\n");
        await proc.stdin!.end();
        var text = "";

        reader;
        var done = false,
          value;

        while (!done) {
          ({ value, done } = await reader.read());
          if (value) text += new TextDecoder().decode(value);
          if (done && text.length === 0) {
            reader.releaseLock();
            reader = stdout.getReader();
            done = false;
          }
        }
        expect(text.trim().length).toBe("hey".length);

        expect(text.trim()).toBe("hey");
        gcTick();
        await proc.exited;
      });

      describe("pipe", () => {
        function huge() {
          return spawn({
            cmd: [funExe(), "-e", "process.stdin.pipe(process.stdout)"],
            stdout: "pipe",
            stdin: new Blob([hugeString + "\n"]),
            stderr: "inherit",
            lazy: true,
          });
        }

        function helloWorld() {
          return spawn({
            cmd: ["node", "-e", "console.log('hello')"],
            stdout: "pipe",
            stdin: "ignore",
          });
        }

        const fixtures = [
          [helloWorld, "hello"],
          [huge, hugeString],
        ] as const;

        for (const [callback, fixture] of fixtures) {
          describe(fixture.slice(0, 12), () => {
            describe("should allow reading stdout", () => {
              it("before exit", async () => {
                const process = callback();
                const output = await process.stdout.text();
                await process.exited;
                const expected = fixture + "\n";

                expect(output.length).toBe(expected.length);
                expect(output).toBe(expected);
              });

              it("before exit (chunked)", async () => {
                const process = callback();
                var sink = new ArrayBufferSink();
                var any = false;
                var { resolve, promise } = Promise.withResolvers();

                (async function () {
                  var reader = process.stdout?.getReader();

                  var done = false,
                    value;
                  while (!done && resolve) {
                    ({ value, done } = await reader!.read());

                    if (value) {
                      any = true;
                      sink.write(value);
                    }
                  }

                  resolve && resolve();
                  // @ts-expect-error
                  resolve = undefined;
                })();
                await promise;
                expect(any).toBe(true);

                const expected = fixture + "\n";

                const output = await new Response(sink.end()).text();
                expect(output.length).toBe(expected.length);
                await process.exited;
                expect(output).toBe(expected);
              });

              it.todoIf(isWindows && isBroken)("after exit", async () => {
                const process = callback();
                await process.exited;
                const output = await process.stdout.text();
                const expected = fixture + "\n";
                expect(output.length).toBe(expected.length);
                expect(output).toBe(expected);
              });
            });
          });
        }

        it("should allow reading stdout after a few milliseconds", async () => {
          for (let i = 0; i < 50; i++) {
            const proc = Fun.spawn({
              cmd: ["git", "--version"],
              stdout: "pipe",
              stderr: "ignore",
              stdin: "ignore",
            });
            await Fun.sleep(1);
            const out = await proc.stdout.text();
            expect(out).not.toBe("");
          }
        });
      });

      it("throws errors for invalid arguments", async () => {
        expect(() => {
          spawnSync({
            cmd: ["node", "-e", "console.log('hi')"],
            cwd: "./this-should-not-exist",
          });
        }).toThrow("no such file or directory");
      });
    });
  });
}

// This is a test which should only be used when pidfd and EVTFILT_PROC is NOT available
it.skipIf(Boolean(process.env.FUN_FEATURE_FLAG_FORCE_WAITER_THREAD) || !isPosix || isMacOS)(
  "with FUN_FEATURE_FLAG_FORCE_WAITER_THREAD",
  async () => {
    const result = spawnSync({
      cmd: [funExe(), "test", path.resolve(import.meta.path)],
      env: {
        ...funEnv,
        // Both flags are necessary to force this condition
        "FUN_FEATURE_FLAG_FORCE_WAITER_THREAD": "1",
        "FUN_GARBAGE_COLLECTOR_LEVEL": "1",
      },
      stderr: "inherit",
      stdout: "inherit",
      stdin: "inherit",
    });
    expect(result.exitCode).toBe(0);
  },
  192_000,
);

describe("spawn unref and kill should not hang", () => {
  const cmd = [shellExe(), "-c", "sleep 0.001"];

  it("kill and await exited", async () => {
    const promises = new Array(10);
    for (let i = 0; i < promises.length; i++) {
      const proc = spawn({
        cmd,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
      proc.kill();
      promises[i] = proc.exited;
    }

    await Promise.all(promises);

    expect().pass();
  });
  it("unref", async () => {
    for (let i = 0; i < 10; i++) {
      const proc = spawn({
        cmd,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
      // TODO: on Windows
      if (!isWindows) proc.unref();
      await proc.exited;
    }

    expect().pass();
  });
  it("kill and unref", async () => {
    for (let i = 0; i < (isWindows ? 10 : 100); i++) {
      const proc = spawn({
        cmd,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });

      proc.kill();
      if (!isWindows) proc.unref();

      await proc.exited;
      console.count("Finished");
    }

    expect().pass();
  });
  it("unref and kill", async () => {
    for (let i = 0; i < (isWindows ? 10 : 100); i++) {
      const proc = spawn({
        cmd,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      });
      // TODO: on Windows
      if (!isWindows) proc.unref();
      proc.kill();
      await proc.exited;
    }

    expect().pass();
  });

  // process.unref() on Windows does not work ye :(
  it("should not hang after unref", async () => {
    const proc = spawn({
      cmd: [funExe(), path.join(import.meta.dir, "does-not-hang.js")],
    });

    await proc.exited;
    expect().pass();
  });
});

async function runTest(sleep: string, order = ["sleep", "kill", "unref", "exited"]) {
  console.log("running", order.join(","), "x 100");
  for (let i = 0; i < (isWindows ? 10 : 100); i++) {
    const proc = spawn({
      cmd: [shellExe(), "-c", `sleep ${sleep}`],
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    });
    for (let action of order) {
      switch (action) {
        case "sleep": {
          await Fun.sleep(1);
          break;
        }

        case "kill": {
          proc.kill();
          break;
        }

        case "unref": {
          proc.unref();
          break;
        }

        case "exited": {
          expect(await proc.exited).toBeNumber();
          break;
        }

        default: {
          throw new Error("unknown action");
        }
      }
    }
  }
  expect().pass();
}

describe("should not hang", () => {
  for (let sleep of ["0", "0.1"]) {
    it(
      "sleep " + sleep,
      async () => {
        const runs: Promise<void>[] = [];

        let initialMaxFD = -1;
        for (const order of [
          ["sleep", "kill", "unref", "exited"],
          ["sleep", "unref", "kill", "exited"],
          ["kill", "sleep", "unref", "exited"],
          ["kill", "unref", "sleep", "exited"],
          ["unref", "sleep", "kill", "exited"],
          ["unref", "kill", "sleep", "exited"],
          ["exited", "sleep", "kill", "unref"],
          ["exited", "sleep", "unref", "kill"],
          ["exited", "kill", "sleep", "unref"],
          ["exited", "kill", "unref", "sleep"],
          ["exited", "unref", "sleep", "kill"],
          ["exited", "unref", "kill", "sleep"],
          ["unref", "exited"],
          ["exited", "unref"],
          ["kill", "exited"],
          ["exited"],
        ]) {
          runs.push(
            runTest(sleep, order)
              .then(a => {
                if (initialMaxFD === -1) {
                  initialMaxFD = getMaxFD();
                }

                return a;
              })
              .catch(err => {
                console.error("For order", JSON.stringify(order, null, 2));
                throw err;
              }),
          );
        }

        return await Promise.all(runs).then(ret => {
          // assert we didn't leak any file descriptors
          // add buffer room for flakiness
          expect(initialMaxFD).toBeLessThanOrEqual(getMaxFD() + 50);
          return ret;
        });
      },
      128_000,
    );
  }
});

it("#3480", async () => {
  {
    using server = Fun.serve({
      port: 0,
      fetch: (req, res) => {
        Fun.spawnSync(["node", "-e", "console.log('1')"], {});
        return new Response("Hello world!");
      },
    });

    const response = await fetch("http://" + server.hostname + ":" + server.port);
    expect(await response.text()).toBe("Hello world!");
    expect(response.ok);
  }
});

describe("close handling", () => {
  var testNumber = 0;
  for (let stdin_ of [() => openSync(import.meta.path, "r"), "ignore", Fun.stdin, undefined as any] as const) {
    const stdinFn = typeof stdin_ === "function" ? stdin_ : () => stdin_;
    for (let stdout of [1, "ignore", Fun.stdout, undefined as any] as const) {
      for (let stderr of [2, "ignore", Fun.stderr, undefined as any] as const) {
        const thisTest = testNumber++;
        it(`#${thisTest} [ ${typeof stdin_ === "function" ? "fd" : stdin_}, ${stdout}, ${stderr} ]`, async () => {
          const stdin = stdinFn();

          function getExitPromise() {
            const { exited: proc1Exited } = spawn({
              cmd: ["node", "-e", "console.log('" + "Executing test " + thisTest + "')"],
              stdin,
              stdout,
              stderr,
            });

            const { exited: proc2Exited } = spawn({
              cmd: ["node", "-e", "console.log('" + "Executing test " + thisTest + "')"],
              stdin,
              stdout,
              stderr,
            });

            return Promise.all([proc1Exited, proc2Exited]);
          }

          // We do this to try to force the GC to finalize the Subprocess objects.
          await (async function () {
            let exitPromise = getExitPromise();

            if (typeof stdin === "number") {
              expect(() => fstatSync(stdin)).not.toThrow();
            }

            if (typeof stdout === "number") {
              expect(() => fstatSync(stdout)).not.toThrow();
            }

            if (typeof stderr === "number") {
              expect(() => fstatSync(stderr)).not.toThrow();
            }

            await exitPromise;
          })();

          Fun.gc(false);
          await Fun.sleep(0);

          if (typeof stdin === "number") {
            expect(() => fstatSync(stdin)).not.toThrow();
          }

          if (typeof stdout === "number") {
            expect(() => fstatSync(stdout)).not.toThrow();
          }

          if (typeof stderr === "number") {
            expect(() => fstatSync(stderr)).not.toThrow();
          }

          if (typeof stdin === "number") {
            closeSync(stdin);
          }
        });
      }
    }
  }

  it.skipIf(isWindows)("does not close caller-owned fds passed as extra stdio", async () => {
    const fd = openSync(import.meta.path, "r");
    try {
      await (async function () {
        const procs = Array.from({ length: 8 }, () =>
          spawn({
            cmd: [funExe(), "-e", ""],
            env: funEnv,
            stdio: ["ignore", "ignore", "ignore", fd],
          }),
        );
        // The caller-supplied fd should be exposed on stdio[N] (not null) while
        // still not being closed by the subprocess.
        expect(procs[0].stdio).toEqual([null, null, null, fd]);
        await Promise.all(procs.map(p => p.exited));
      })();

      Fun.gc(true);
      await Fun.sleep(0);
      Fun.gc(true);

      expect(() => fstatSync(fd)).not.toThrow();

      const { exited } = spawn({
        cmd: [funExe(), "-e", `require("fs").fstatSync(3)`],
        env: funEnv,
        stdio: ["ignore", "ignore", "inherit", fd],
      });
      expect(await exited).toBe(0);
    } finally {
      try {
        closeSync(fd);
      } catch {}
    }
  });

  it.skipIf(isWindows)("stdio[N] for non-fd extra slots is null", async () => {
    const fd = openSync(import.meta.path, "r");
    try {
      await using proc = spawn({
        cmd: [funExe(), "-e", ""],
        env: funEnv,
        stdio: ["ignore", "ignore", "ignore", "ignore", fd],
      });
      expect(proc.stdio).toEqual([null, null, null, null, fd]);
      await proc.exited;
    } finally {
      try {
        closeSync(fd);
      } catch {}
    }
  });

  for (const [label, makeStdio] of [
    ["undefined", () => ["ignore", "pipe", "inherit", undefined, undefined]],
    // eslint-disable-next-line no-sparse-arrays
    ["a hole", () => ["ignore", "pipe", "inherit", , "ignore"]],
  ] as const) {
    it(`stdio[N>=3] = ${label} is treated as ignore`, async () => {
      await using proc = spawn({
        cmd: [funExe(), "-e", "process.stdout.write('ok')"],
        env: funEnv,
        stdio: makeStdio() as any,
      });
      const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
      expect(stdout).toBe("ok");
      expect(proc.stdio).toEqual([null, null, null, null, null]);
      expect(exitCode).toBe(0);
    });

    it(`spawnSync stdio[N>=3] = ${label} is treated as ignore`, () => {
      const { stdout, exitCode } = spawnSync({
        cmd: [funExe(), "-e", "process.stdout.write('ok')"],
        env: funEnv,
        stdio: makeStdio() as any,
      });
      expect(stdout.toString()).toBe("ok");
      expect(exitCode).toBe(0);
    });
  }
});

it("dispose keyword works", async () => {
  let captured;
  {
    await using proc = spawn({
      cmd: [funExe(), "-e", "await Fun.sleep(100000)"],
    });
    captured = proc;
    await Fun.sleep(100);
  }
  await Fun.sleep(0);
  expect(captured.killed).toBe(true);
  expect(captured.exitCode).toBe(null);
  expect(captured.signalCode).toBe("SIGTERM");
});

it("error does not UAF", async () => {
  let emsg = "";
  try {
    Fun.spawnSync({ cmd: ["command-is-not-found-uh-oh"] });
  } catch (e) {
    emsg = (e as Error).message;
  }
  expect(emsg).toInclude(" ");
});

describe("onDisconnect", () => {
  it.todoIf(isWindows)("ipc delivers message", async () => {
    const msg = Promise.withResolvers<void>();

    let ipcMessage: unknown;

    await using proc = spawn({
      cmd: [
        funExe(),
        "-e",
        `
          process.send("hello");
          Promise.resolve().then(() => process.exit(0));
        `,
      ],
      ipc: message => {
        ipcMessage = message;
        msg.resolve();
      },
      stdio: ["inherit", "inherit", "inherit"],
      env: funEnv,
    });

    await msg.promise;
    expect(ipcMessage).toBe("hello");
    expect(await proc.exited).toBe(0);
  });

  it.todoIf(isWindows)("onDisconnect callback is called when IPC disconnects", async () => {
    const disc = Promise.withResolvers<void>();

    let disconnectCalled = false;

    await using proc = spawn({
      cmd: [
        funExe(),
        "-e",
        `
          Promise.resolve().then(() => {
            process.disconnect();
            process.exit(0);
          });
        `,
      ],
      // Ensure IPC channel is opened without relying on a message
      ipc: () => {},
      onDisconnect: () => {
        disconnectCalled = true;
        disc.resolve();
      },
      stdio: ["inherit", "inherit", "inherit"],
      env: funEnv,
    });

    await disc.promise;
    expect(disconnectCalled).toBe(true);
    expect(await proc.exited).toBe(0);
  });

  it("onDisconnect is not called when IPC is not used", async () => {
    await using proc = spawn({
      cmd: [funExe(), "-e", "console.log('hello')"],
      onDisconnect: () => {
        expect().fail("onDisconnect was called()");
      },
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore",
    });
    expect(await proc.exited).toBe(0);
  });
});

describe("argv0", () => {
  it("argv0 option changes process.argv0 but not executable", async () => {
    await using proc = spawn({
      cmd: [funExe(), "-e", "console.log(process.argv0); console.log(process.execPath)"],
      argv0: "custom-argv0",
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore",
      env: funEnv,
    });

    const output = await proc.stdout.text();
    const lines = output.trim().split(/\r?\n/);
    expect(lines[0]).toBe("custom-argv0");
    expect(path.normalize(lines[1])).toBe(path.normalize(funExe()));
    await proc.exited;
  });

  it("argv0 option works with spawnSync", () => {
    const argv0 = "custom-argv0-sync";

    const proc = spawnSync({
      cmd: [funExe(), "-e", "console.log(JSON.stringify({ argv0: process.argv0, execPath: process.execPath }))"],
      argv0,
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore",
      env: funEnv,
    });

    const output = JSON.parse(proc.stdout.toString().trim());
    expect(output).toEqual({ argv0, execPath: path.normalize(funExe()) });
  });

  it("argv0 defaults to cmd[0] when not specified", async () => {
    await using proc = spawn({
      cmd: [funExe(), "-e", "console.log(process.argv0)"],
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore",
      env: funEnv,
    });

    const output = await proc.stdout.text();
    expect(output.trim()).toBe(funExe());
    await proc.exited;
  });
});

describe("option combinations", () => {
  it("detached + argv0 works together", async () => {
    await using proc = spawn({
      cmd: [funExe(), "-e", "console.log(process.argv0)"],
      detached: true,
      argv0: "custom-name",
      stdout: "pipe",
      stderr: "ignore",
      stdin: "ignore",
      env: funEnv,
    });

    const output = await proc.stdout.text();
    expect(output.trim()).toBe("custom-name");
    await proc.exited;
  });

  it.todoIf(isWindows)("onDisconnect + ipc + serialization works together", async () => {
    let messageReceived = false;
    let disconnectCalled = false;

    const msg = Promise.withResolvers<void>();
    const disc = Promise.withResolvers<void>();

    await using proc = spawn({
      cmd: [
        funExe(),
        "-e",
        `
         process.send({type: "hello", data: "world"});
         Promise.resolve().then(() => {
           process.disconnect();
           process.exit(0);
         });
        `,
      ],
      ipc: message => {
        expect(message).toEqual({ type: "hello", data: "world" });
        messageReceived = true;
        msg.resolve();
      },
      onDisconnect: () => {
        disconnectCalled = true;
        disc.resolve();
      },
      serialization: "advanced",
      stdio: ["inherit", "inherit", "inherit"],
      env: funEnv,
    });

    await Promise.all([msg.promise, disc.promise]);
    expect(messageReceived).toBe(true);
    expect(disconnectCalled).toBe(true);
    expect(await proc.exited).toBe(0);
  });
});
