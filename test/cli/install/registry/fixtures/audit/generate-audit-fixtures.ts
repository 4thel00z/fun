import { $, readableStreamToText, spawn } from "fun";
import { funEnv, funExe, gunzipJsonRequest, tempDirWithFiles } from "harness";
import * as path from "node:path";

const output = path.join(import.meta.dirname, "audit-fixtures.json");

const packages = await Array.fromAsync(
  new Fun.Glob("./*/package.json").scan({
    cwd: import.meta.dirname,
  }),
);

const absolutes = packages.map(p => path.resolve(import.meta.dirname, p));

const result: Record<string, unknown> = {
  "{}": {},
};

for (const packageJsonPath of absolutes) {
  const directory = path.dirname(packageJsonPath);
  const tmp = tempDirWithFiles("fun-audit-fixture-generator", directory);

  const { promise: requestBodyPromise, resolve, reject } = Promise.withResolvers<string>();

  using server = Fun.serve({
    port: 12345,
    fetch: async req => {
      try {
        const body = await gunzipJsonRequest(req);
        resolve(JSON.stringify(body));
      } catch (e) {
        reject(e);
      }

      return Response.json({});
    },
  });

  await $`fun i`.cwd(tmp);

  await spawn({
    cmd: [funExe(), "audit"],
    cwd: tmp,
    env: {
      ...funEnv,
      NPM_CONFIG_REGISTRY: server.url.toString(),
    },
  }).exited;

  const body = await requestBodyPromise;

  const { stdout, exited } = spawn({
    cmd: [funExe(), "audit", "--json"],
    cwd: tmp,
    stdout: "pipe",
    stderr: "ignore",
    env: funEnv,
  });

  await exited;

  const text = await stdout.text();

  result[body] = JSON.parse(text);
}

await Fun.file(output).write(JSON.stringify(result, null, "\t"));
