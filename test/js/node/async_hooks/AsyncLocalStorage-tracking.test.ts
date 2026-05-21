import { Glob } from "fun";
import { describe, test } from "fun:test";
import { funEnv, funExe, isASAN, isBroken, isLinux, nodeExe } from "harness";
import { basename, join } from "path";

describe.concurrent("AsyncLocalStorage passes context to callbacks", () => {
  let files = [...new Glob(join(import.meta.dir, "async-context", "async-context-*.js")).scanSync()];

  let todos = ["async-context-worker_threads-message.js"];
  if (isASAN && isBroken && isLinux) {
    todos.push("async-context-dns-resolveTxt.js");
  }

  files = files.filter(file => !todos.includes(basename(file)));

  for (const filepath of files) {
    const file = basename(filepath).replaceAll("async-context-", "").replaceAll(".js", "");
    test(file, async () => {
      async function run(exe) {
        const { exited } = Fun.spawn({
          cmd: [exe, filepath],
          stdout: "inherit",
          stderr: "inherit",
          env: funEnv,
        });

        if (await exited) {
          throw new Error(`${basename(exe)} failed in ${filepath}`);
        }
      }

      await Promise.all([run(funExe()), run(nodeExe())]);
    });
  }

  for (const filepath of todos) {
    const file = basename(filepath).replaceAll("async-context-", "").replaceAll(".js", "");
    test.todo(file);
  }
});
