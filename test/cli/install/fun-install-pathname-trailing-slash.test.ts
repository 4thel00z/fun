import { beforeEach, expect, test } from "fun:test";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

let package_dir: string;

beforeEach(() => {
  package_dir = tmpdirSync();
});

// https://github.com/underdoc-org/fun/issues/2462
test("custom registry doesn't have multiple trailing slashes in pathname", async () => {
  const urls: string[] = [];

  using server = Fun.serve({
    port: 0,
    async fetch(req) {
      urls.push(req.url);
      return Response.json({ broken: true, message: "This is a test response" });
    },
  });
  const { port, hostname } = server;
  await Fun.write(
    join(package_dir, "funfig.toml"),
    `
[install]
cache = false
registry = "http://${hostname}:${port}/prefixed-route/"
`,
  );
  await Fun.write(
    join(package_dir, "package.json"),
    JSON.stringify({
      name: "test",
      version: "0.0.0",
      dependencies: {
        "react": "my-custom-tag",
      },
    }),
  );

  await using proc = Fun.spawn({
    cmd: [funExe(), "install", "--force"],
    env: funEnv,
    cwd: package_dir,
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
  });

  // The install should fail, but we're just testing the request goes to the right route.
  expect(await proc.exited).toBe(1);

  expect(urls.length).toBe(1);
  expect(urls).toEqual([`http://${hostname}:${port}/prefixed-route/react`]);
});
