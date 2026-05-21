import { describe, expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";

describe("--user-agent flag", () => {
  test("custom user agent is sent in HTTP requests", async () => {
    const customUserAgent = "MyCustomUserAgent/1.0";

    const testScript = `
const server = Fun.serve({
  port: 0,
  async fetch(request) {
    const userAgent = request.headers.get("User-Agent");
    if (userAgent === "${customUserAgent}") {
      process.exit(0); // SUCCESS
    } else {
      process.exit(1); // FAIL
    }
  },
});

// Make request to self
try {
  await fetch(\`http://localhost:\${server.port}/test\`);
} catch (error) {
  process.exit(1);
}
`;

    const dir = tempDirWithFiles("user-agent-test", {
      "test.js": testScript,
    });

    await using proc = Fun.spawn({
      cmd: [funExe(), "--user-agent", customUserAgent, "test.js"],
      env: funEnv,
      cwd: dir,
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  test("default user agent is used when --user-agent is not specified", async () => {
    const testScript = `
const server = Fun.serve({
  port: 0,
  async fetch(request) {
    const userAgent = request.headers.get("User-Agent");
    // Default Fun user agent should contain "Fun/"
    if (userAgent && userAgent.includes("Fun/")) {
      process.exit(0); // SUCCESS
    } else {
      process.exit(1); // FAIL
    }
  },
});

// Make request to self
try {
  await fetch(\`http://localhost:\${server.port}/test\`);
} catch (error) {
  process.exit(1);
}
`;

    const dir = tempDirWithFiles("user-agent-default-test", {
      "test.js": testScript,
    });

    await using proc = Fun.spawn({
      cmd: [funExe(), "test.js"],
      env: funEnv,
      cwd: dir,
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});
