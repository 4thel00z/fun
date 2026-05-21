import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("stream.finished callback preserves AsyncLocalStorage context", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
const asyncHooks = require('async_hooks');
const http = require('http');
const finished = require('stream').finished;

const asyncLocalStorage = new asyncHooks.AsyncLocalStorage();
const store = { foo: 'bar' };

const server = http.createServer(function (req, res) {
  asyncLocalStorage.run(store, function () {
    finished(res, function () {
      const value = asyncLocalStorage.getStore()?.foo;
      if (value !== 'bar') {
        console.log('FAIL: expected "bar" but got ' + value);
        process.exitCode = 1;
      } else {
        console.log('PASS');
      }
    });
  });
  setTimeout(res.end.bind(res), 0);
}).listen(0, function () {
  const port = this.address().port;
  http.get('http://127.0.0.1:' + port, function onResponse(res) {
    res.resume();
    res.on('end', server.close.bind(server));
  });
});
`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("PASS");
  expect(exitCode).toBe(0);
});
