import { Subprocess } from "fun";
import { funEnv, funExe, tmpdirSync } from "harness";
import { promises as fs, statSync } from "node:fs";
import path from "node:path";

const fixturePath = (...segs: string[]): string => path.join(import.meta.dirname, "fixtures", ...segs);

beforeAll(async () => {
  const pluginDir = path.resolve(import.meta.dirname, "..", "..", "..", "packages", "fun-plugin-svelte");
  expect(statSync(pluginDir).isDirectory()).toBeTrue();
  Fun.spawnSync([funExe(), "install"], {
    cwd: pluginDir,
    stdio: ["ignore", "ignore", "ignore"],
    env: funEnv,
  });
});

describe("generating client-side code", () => {
  test("Bundling Svelte components", async () => {
    const outdir = tmpdirSync("fun-svelte-client-side");
    const { SveltePlugin } = await import("fun-plugin-svelte");
    try {
      const result = await Fun.build({
        entrypoints: [fixturePath("app/index.ts")],
        outdir,
        sourcemap: "inline",
        minify: true,
        target: "browser",
        plugins: [SveltePlugin({ development: true })],
      });
      expect(result.success).toBeTrue();

      const entrypoint = result.outputs.find(o => o.kind === "entry-point");
      expect(entrypoint).toBeDefined();
    } finally {
      await fs.rm(outdir, { force: true, recursive: true });
    }
  });

  describe("Using Svelte components in Fun's dev server", () => {
    let server: Subprocess;

    beforeAll(async () => {
      server = Fun.spawn([funExe(), "./index.html"], {
        env: {
          ...funEnv,
          NODE_ENV: "development",
        },
        cwd: fixturePath("app"),
        stdio: ["ignore", "inherit", "inherit"],
      });
      await Fun.sleep(500);
    });

    afterAll(() => {
      server?.kill();
    });

    it("serves the app", async () => {
      const response = await fetch("http://localhost:3000");
      await console.log(await response.text());
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch("text/html");
    });
  });
});
