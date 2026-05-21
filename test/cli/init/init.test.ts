import { describe, expect, test } from "fun:test";
import fs, { readdirSync } from "fs";
import { funEnv, funExe, isWindows, tempDirWithFiles } from "harness";
import path from "path";

(isWindows ? describe : describe.concurrent)("fun init", () => {
  test("fun init works", async () => {
    const temp = tempDirWithFiles("fun-init-works", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "-y"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });

    expect(await exited).toBe(0);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
    expect(pkg).toEqual({
      "name": path.basename(temp).toLowerCase().replaceAll(" ", "-"),
      "module": "index.ts",
      "type": "module",
      "private": true,
      "devDependencies": {
        "@types/fun": "latest",
      },
      "peerDependencies": {
        "typescript": "^5",
      },
    });
    const readme = fs.readFileSync(path.join(temp, "README.md"), "utf8");
    expect(readme).toStartWith("# " + path.basename(temp).toLowerCase().replaceAll(" ", "-") + "\n");
    expect(readme).toInclude("v" + Fun.version.replaceAll("-debug", ""));
    expect(readme).toInclude("index.ts");

    expect(fs.existsSync(path.join(temp, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(temp, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "node_modules"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "tsconfig.json"))).toBe(true);
  }, 30_000);

  test("fun init with piped cli", async () => {
    const temp = tempDirWithFiles("fun-init-with-piped-cli", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init"],
      cwd: temp,
      stdio: [new Blob(["\n\n\n\n\n\n\n\n\n\n\n\n"]), "inherit", "inherit"],
      env: funEnv,
    });

    expect(await exited).toBe(0);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
    expect(pkg).toEqual({
      "name": path.basename(temp).toLowerCase().replaceAll(" ", "-"),
      "module": "index.ts",
      "private": true,
      "type": "module",
      "devDependencies": {
        "@types/fun": "latest",
      },
      "peerDependencies": {
        "typescript": "^5",
      },
    });
    const readme = fs.readFileSync(path.join(temp, "README.md"), "utf8");
    expect(readme).toStartWith("# " + path.basename(temp).toLowerCase().replaceAll(" ", "-") + "\n");
    expect(readme).toInclude("v" + Fun.version.replaceAll("-debug", ""));
    expect(readme).toInclude("index.ts");

    expect(fs.existsSync(path.join(temp, "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(temp, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "node_modules"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "tsconfig.json"))).toBe(true);
  }, 30_000);

  test("fun init in folder", async () => {
    const temp = tempDirWithFiles("fun-init-in-folder", {
      "mydir": {
        "index.ts": "// mydir/index.ts",
        "README.md": "// mydir/README.md",
        ".gitignore": "// mydir/.gitignore",
        "package.json": '{ "name": "mydir" }',
        "tsconfig.json": "// mydir/tsconfig.json",
      },
    });
    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "-y", "mydir"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });
    expect(await exited).toBe(0);
    expect(readdirSync(temp).sort()).toEqual(["mydir"]);
    expect(readdirSync(path.join(temp, "mydir")).sort()).toMatchInlineSnapshot(`
    [
      ".gitignore",
      "README.md",
      "fun.lock",
      "index.ts",
      "node_modules",
      "package.json",
      "tsconfig.json",
    ]
  `);
  });

  test("fun init error rather than overwriting file", async () => {
    const temp = tempDirWithFiles("fun-init-error-rather-than-overwriting-file", {
      "mydir": "don't delete me!!!",
    });
    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "-y", "mydir"],
      cwd: temp,
      stdio: ["ignore", "pipe", "pipe"],
      env: funEnv,
    });
    expect(await exited).not.toBe(0);
    expect(readdirSync(temp).sort()).toEqual(["mydir"]);
    expect(await Fun.file(path.join(temp, "mydir")).text()).toBe("don't delete me!!!");
  });

  test("fun init utf-8", async () => {
    const temp = tempDirWithFiles("fun-init-utf-8", {});
    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "-y", "u t f ∞™/subpath"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });
    expect(await exited).toBe(0);
    expect(readdirSync(temp).sort()).toEqual(["u t f ∞™"]);
    expect(readdirSync(path.join(temp, "u t f ∞™")).sort()).toEqual(["subpath"]);
    expect(readdirSync(path.join(temp, "u t f ∞™/subpath")).sort()).toMatchInlineSnapshot(`
    [
      ".gitignore",
      "README.md",
      "fun.lock",
      "index.ts",
      "node_modules",
      "package.json",
      "tsconfig.json",
    ]
  `);
  });

  test("fun init twice", async () => {
    const temp = tempDirWithFiles("fun-init-twice", {});
    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "-y", "mydir"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });
    expect(await exited).toBe(0);
    expect(readdirSync(temp).sort()).toEqual(["mydir"]);
    expect(readdirSync(path.join(temp, "mydir")).sort()).toMatchInlineSnapshot(`
    [
      ".gitignore",
      "README.md",
      "fun.lock",
      "index.ts",
      "node_modules",
      "package.json",
      "tsconfig.json",
    ]
  `);
    await Fun.write(path.join(temp, "mydir/index.ts"), "my edited index.ts");
    await Fun.write(path.join(temp, "mydir/README.md"), "my edited README.md");
    await Fun.write(path.join(temp, "mydir/.gitignore"), "my edited .gitignore");
    await Fun.write(
      path.join(temp, "mydir/package.json"),
      JSON.stringify({
        ...(await Fun.file(path.join(temp, "mydir/package.json")).json()),
        name: "my edited package.json",
      }),
    );
    await Fun.write(path.join(temp, "mydir/tsconfig.json"), `my edited tsconfig.json`);
    const { exited: exited2, stderr } = Fun.spawn({
      cmd: [funExe(), "init", "mydir"],
      cwd: temp,
      stdio: ["ignore", "pipe", "pipe"],
      env: funEnv,
    });
    expect(await exited2).toBe(0);
    expect(await stderr.text()).toMatchInlineSnapshot(`
    "note: package.json already exists, configuring existing project
    "
  `);
    expect(await exited2).toBe(0);
    expect(readdirSync(temp).sort()).toEqual(["mydir"]);
    expect(readdirSync(path.join(temp, "mydir")).sort()).toMatchInlineSnapshot(`
    [
      ".gitignore",
      "README.md",
      "fun.lock",
      "index.ts",
      "node_modules",
      "package.json",
      "tsconfig.json",
    ]
  `);
    expect(await Fun.file(path.join(temp, "mydir/index.ts")).text()).toMatchInlineSnapshot(`"my edited index.ts"`);
    expect(await Fun.file(path.join(temp, "mydir/README.md")).text()).toMatchInlineSnapshot(`"my edited README.md"`);
    expect(await Fun.file(path.join(temp, "mydir/.gitignore")).text()).toMatchInlineSnapshot(`"my edited .gitignore"`);
    expect(await Fun.file(path.join(temp, "mydir/package.json")).json()).toMatchInlineSnapshot(`
    {
      "devDependencies": {
        "@types/fun": "latest",
      },
      "module": "index.ts",
      "name": "my edited package.json",
      "peerDependencies": {
        "typescript": "^5",
      },
      "private": true,
      "type": "module",
    }
  `);
    expect(await Fun.file(path.join(temp, "mydir/tsconfig.json")).text()).toMatchInlineSnapshot(
      `"my edited tsconfig.json"`,
    );
  });

  test("fun init --react works", async () => {
    const temp = tempDirWithFiles("fun-init--react-works", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "--react"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });

    expect(await exited).toBe(0);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
    expect(pkg).toHaveProperty("dependencies.react");
    expect(pkg).toHaveProperty("dependencies.react-dom");
    expect(pkg).toHaveProperty("devDependencies.@types/react");
    expect(pkg).toHaveProperty("devDependencies.@types/react-dom");

    expect(fs.existsSync(path.join(temp, "src"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "src/index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "tsconfig.json"))).toBe(true);
  }, 30_000);

  test("fun init --react=tailwind works", async () => {
    const temp = tempDirWithFiles("fun-init--react=tailwind-works", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "--react=tailwind"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });

    expect(await exited).toBe(0);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
    expect(pkg).toHaveProperty("dependencies.react");
    expect(pkg).toHaveProperty("dependencies.react-dom");
    expect(pkg).toHaveProperty("devDependencies.@types/react");
    expect(pkg).toHaveProperty("devDependencies.@types/react-dom");
    expect(pkg).toHaveProperty("dependencies.fun-plugin-tailwind");

    expect(fs.existsSync(path.join(temp, "src"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "src/index.ts"))).toBe(true);
  }, 30_000);

  test("fun init --react=shadcn works", async () => {
    const temp = tempDirWithFiles("fun-init--react=shadcn-works", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "--react=shadcn"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: funEnv,
    });

    expect(await exited).toBe(0);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, "package.json"), "utf8"));
    expect(pkg).toHaveProperty("dependencies.react");
    expect(pkg).toHaveProperty("dependencies.react-dom");
    expect(pkg).toHaveProperty("dependencies.@radix-ui/react-slot");
    expect(pkg).toHaveProperty("dependencies.class-variance-authority");
    expect(pkg).toHaveProperty("dependencies.clsx");
    expect(pkg).toHaveProperty("dependencies.fun-plugin-tailwind");

    expect(fs.existsSync(path.join(temp, "src"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "src/index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "src/components"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "src/components/ui"))).toBe(true);
  }, 30_000);

  test("fun init --minimal only creates package.json and tsconfig.json", async () => {
    // Regression test for https://github.com/underdoc-org/fun/issues/26050
    // --minimal should not create .cursor/, CLAUDE.md, .gitignore, or README.md
    const temp = tempDirWithFiles("fun-init-minimal", {});

    const { exited } = Fun.spawn({
      cmd: [funExe(), "init", "--minimal", "-y"],
      cwd: temp,
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...funEnv,
        // Simulate Cursor being installed via CURSOR_TRACE_ID env var
        CURSOR_TRACE_ID: "test-trace-id",
      },
    });

    expect(await exited).toBe(0);

    // Should create package.json and tsconfig.json
    expect(fs.existsSync(path.join(temp, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(temp, "tsconfig.json"))).toBe(true);

    // Should NOT create these extra files with --minimal
    expect(fs.existsSync(path.join(temp, "index.ts"))).toBe(false);
    expect(fs.existsSync(path.join(temp, ".gitignore"))).toBe(false);
    expect(fs.existsSync(path.join(temp, "README.md"))).toBe(false);
    expect(fs.existsSync(path.join(temp, "CLAUDE.md"))).toBe(false);
    expect(fs.existsSync(path.join(temp, ".cursor"))).toBe(false);
  });
});
