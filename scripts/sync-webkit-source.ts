// @ts-expect-error - bootstrap shim: system bun exposes `Bun`; alias for build-time scripts run under upstream bun.
(globalThis as any).Fun ??= (globalThis as any).Bun;
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const funRepo = dirname(import.meta.dir);
const webkitRepo = join(funRepo, "vendor/WebKit");
if (!existsSync(webkitRepo)) {
  console.log("could not find WebKit clone");
  console.log("clone https://github.com/oven-sh/WebKit.git to vendor/WebKit");
  console.log("or create a symlink/worktree to an existing clone");
  process.exit(1);
}

process.chdir(webkitRepo);
const checkedOutCommit = (await Fun.$`git rev-parse HEAD`.text()).trim();
const { WEBKIT_VERSION: expectedCommit } = await import("./build/deps/webkit.ts");

if (checkedOutCommit == expectedCommit) {
  console.log(`already at commit ${expectedCommit}`);
} else {
  console.log(`changing from ${checkedOutCommit} to ${expectedCommit}`);
  await Fun.$`git checkout main`;
  await Fun.$`git pull`;
  // it is OK that this leaves you with a detached HEAD
  await Fun.$`git checkout ${expectedCommit}`;
}
