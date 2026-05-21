import { spawnSync } from "fun";
import { beforeAll, describe, expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";

let cwd: string;

beforeAll(() => {
  cwd = tempDirWithFiles("--if-present", {
    "present.js": "console.log('Here!');",
    "package.json": JSON.stringify({
      "name": "present",
      "scripts": {
        "present": "echo 'Here!'",
      },
    }),
  });
});

describe("fun", () => {
  test("should error with missing script", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "notpresent"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toMatch(/Script not found/);
    expect(exitCode).toBe(1);
  });
  test("should error with missing module", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "./notpresent.js"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toMatch(/Module not found/);
    expect(exitCode).toBe(1);
  });
  test("should error with missing file", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "/path/to/notpresent.txt"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toMatch(/Module not found/);
    expect(exitCode).toBe(1);
  });
});

describe("fun --if-present", () => {
  test("should not error with missing script", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "--if-present", "notpresent"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should not error with missing module", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "--if-present", "./notpresent.js"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should not error with missing file", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "--if-present", "/path/to/notpresent.txt"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should run present script", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "run", "present"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/Here!/);
    expect(stderr.toString()).not.toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should run present module", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "run", "present.js"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/Here!/);
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
});
