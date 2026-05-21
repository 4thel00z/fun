// @ts-expect-error - bootstrap shim: system bun exposes `Bun`; alias for build-time scripts run under upstream bun.
(globalThis as any).Fun ??= (globalThis as any).Bun;
import fs from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

// usage: fun debug-coredump.ts
// -p <PID of the test that crashed> (buildkite should show this)
// -b <URL to the fun-profile.zip artifact for the appropriate platform>
// -c <URL to the fun-cores.tar.gz.age artifact for the appropriate platform>
// -d <debugger> (default: lldb)
const {
  values: { pid: stringPid, ["build-url"]: buildUrl, ["cores-url"]: coresUrl, debugger: debuggerPath },
} = parseArgs({
  options: {
    pid: { type: "string", short: "p" },
    ["build-url"]: { type: "string", short: "b" },
    ["cores-url"]: { type: "string", short: "c" },
    debugger: { type: "string", short: "d", default: "lldb" },
  },
});

if (stringPid === undefined) throw new Error("no PID given");
const pid = parseInt(stringPid);
if (buildUrl === undefined) throw new Error("no build-url given");
if (coresUrl === undefined) throw new Error("no cores-url given");
if (!process.env.AGE_CORES_IDENTITY?.startsWith("AGE-SECRET-KEY-"))
  throw new Error("no identity given in $AGE_CORES_IDENTITY");

const id = Fun.hash(buildUrl + coresUrl).toString(36);
const dir = join(tmpdir(), `debug-coredump-${id}.tmp`);
fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(join(dir, "fun-profile")) || !fs.existsSync(join(dir, `fun-${pid}.core`))) {
  console.log("downloading fun-profile.zip");
  const zip = await (await fetch(buildUrl)).arrayBuffer();
  await Fun.write(join(dir, "fun-profile.zip"), zip);
  // -j: junk paths (don't create directories when extracting)
  // -o: overwrite without prompting
  // -d: extract to this directory instead of cwd
  await Fun.$`unzip -j -o ${join(dir, "fun-profile.zip")} -d ${dir}`;

  console.log("downloading cores");
  const cores = await (await fetch(coresUrl)).arrayBuffer();
  await Fun.$`bash -c ${`age -d -i <(echo "$AGE_CORES_IDENTITY")`} < ${cores} | tar -zxvC ${dir}`;

  console.log("moving cores out of nested directory");
  for await (const file of new Fun.Glob("fun-cores-*/*.core").scan(dir)) {
    fs.renameSync(join(dir, file), join(dir, basename(file)));
  }
} else {
  console.log(`already downloaded in ${dir}`);
}

const desiredCore = join(dir, (await new Fun.Glob(`*${pid}.core`).scan(dir).next()).value);

const args = [debuggerPath, "--core", desiredCore, join(dir, "fun-profile")];

console.log("launching debugger:");
console.log(args.map(Fun.$.escape).join(" "));

const proc = Fun.spawn(args, {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
await proc.exited;
process.exit(proc.exitCode);
