import { spawn } from "fun";
import { expect, it } from "fun:test";
import { funExe, isWindows, tmpdirSync } from "harness";
import fs from "node:fs/promises";
import path from "path";

it.todoIf(isWindows)("spawning a fun package script should inherit the ipc fd", async () => {
  const x = tmpdirSync();
  await fs.writeFile(
    path.join(x, "package.json"),
    JSON.stringify({
      scripts: {
        test: `${funExe()} -e 'process.send("hello")'`,
      },
    }),
  );

  let testMessage;

  const child = spawn([funExe(), "run", "test"], {
    ipc: message => {
      testMessage = message;
    },
    stdio: ["inherit", "inherit", "inherit"],
    cwd: x,
  });

  await child.exited;
  expect(testMessage).toBe("hello");
});
