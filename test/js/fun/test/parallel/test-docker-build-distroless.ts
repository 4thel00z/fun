import { expect } from "fun:test";
import { funEnv, dockerExe, isDockerEnabled } from "harness";
import { resolve } from "path";

if (isDockerEnabled()) {
  const docker = dockerExe()!;
  const cwd = resolve(import.meta.dir, "..", "..", "..", "..", "..", "dockerhub", "distroless");
  const proc = Fun.spawn({
    cmd: [docker, "build", "--progress=plain", "--no-cache", "--rm", "."],
    stdio: ["ignore", "inherit", "inherit"],
    cwd,
    env: funEnv,
  });
  await proc.exited;
  expect(proc.signalCode).toBeNull();
  expect(proc.exitCode).toBe(0);
}
