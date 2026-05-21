import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir, tls as validTls } from "harness";
import { join } from "node:path";

// SSLConfig.readFromBlob() used to dupeZ the buffer returned by
// readFileWithOptions(.null_terminated) and never freed the original,
// leaking one buffer the size of each cert/key file every time a TLS
// option was passed as a Fun.file() blob.
test("passing Fun.file() as tls cert/key does not leak file contents", async () => {
  // PEM parsers ignore content after the -----END ...----- marker, so pad
  // the files with trailing junk to make the leak measurable: ~256KB per
  // file, two files per iteration, 100 iterations -> ~50MB expected growth
  // without the fix.
  const padding = Buffer.alloc(256 * 1024, "# padding\n").toString();
  using dir = tempDir("tls-funfile-leak", {
    "cert.pem": validTls.cert + padding,
    "key.pem": validTls.key + padding,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "--smol", join(import.meta.dir, "tls-funfile-leak-fixture.js")],
    env: {
      ...funEnv,
      TLS_CERT_PATH: join(String(dir), "cert.pem"),
      TLS_KEY_PATH: join(String(dir), "key.pem"),
      ITERATIONS: "100",
      WARMUP: "20",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  if (exitCode !== 0) {
    console.error(stderr);
  }
  expect(stderr).toBe("");

  const result = JSON.parse(stdout.trim());
  console.log(`Fun.file() TLS config: ${result.iterations} iterations, growth: ${result.growthMB} MB`);

  // Without the fix this grows ~50MB; with the fix it should stay close to 0.
  expect(result.growthMB).toBeLessThan(15);
  expect(exitCode).toBe(0);
});
