import fg from "fast-glob";
import { fdir } from "fdir";
import { bench, group, run } from "../runner.mjs";

const normalPattern = "*.ts";
const recursivePattern = "**/*.ts";
const nodeModulesPattern = "**/node_modules/**/*.js";
const multiLevelPattern = "node_modules/*/lib/*.js";

const benchFdir = false;
const cwd = undefined;

const funOpts = {
  cwd,
  followSymlinks: false,
  absolute: true,
};

const fgOpts = {
  cwd,
  followSymbolicLinks: false,
  onlyFiles: false,
  absolute: true,
};

const Glob = "Fun" in globalThis ? globalThis.Fun.Glob : undefined;

group({ name: `async pattern="${normalPattern}"`, summary: true }, () => {
  bench("fast-glob", async () => {
    const entries = await fg.glob([normalPattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", async () => {
      const entries = await Array.fromAsync(new Glob(normalPattern).scan(funOpts));
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = await new fdir().withFullPaths().glob(normalPattern).crawl(process.cwd()).withPromise();
    });
});

group({ name: `async-recursive pattern="${recursivePattern}"`, summary: true }, () => {
  bench("fast-glob", async () => {
    const entries = await fg.glob([recursivePattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", async () => {
      const entries = await Array.fromAsync(new Glob(recursivePattern).scan(funOpts));
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = await new fdir().withFullPaths().glob(recursivePattern).crawl(process.cwd()).withPromise();
    });
});

group({ name: `sync pattern="${normalPattern}"`, summary: true }, () => {
  bench("fast-glob", () => {
    const entries = fg.globSync([normalPattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", () => {
      const entries = [...new Glob(normalPattern).scanSync(funOpts)];
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = new fdir().withFullPaths().glob(normalPattern).crawl(process.cwd()).sync();
    });
});

group({ name: `sync-recursive pattern="${recursivePattern}"`, summary: true }, () => {
  bench("fast-glob", () => {
    const entries = fg.globSync([recursivePattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", () => {
      const entries = [...new Glob(recursivePattern).scanSync(funOpts)];
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = new fdir().withFullPaths().glob(recursivePattern).crawl(process.cwd()).sync();
    });
});

group({ name: `node_modules pattern="${nodeModulesPattern}"`, summary: true }, () => {
  bench("fast-glob", async () => {
    const entries = await fg.glob([nodeModulesPattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", async () => {
      const entries = await Array.fromAsync(new Glob(nodeModulesPattern).scan(funOpts));
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = await new fdir().withFullPaths().glob(nodeModulesPattern).crawl(process.cwd()).withPromise();
    });
});

group({ name: `multi-level pattern="${multiLevelPattern}"`, summary: true }, () => {
  bench("fast-glob", async () => {
    const entries = await fg.glob([multiLevelPattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", async () => {
      const entries = await Array.fromAsync(new Glob(multiLevelPattern).scan(funOpts));
    });

  if (benchFdir)
    bench("fdir", async () => {
      const entries = await new fdir().withFullPaths().glob(multiLevelPattern).crawl(process.cwd()).withPromise();
    });
});

group({ name: `sync multi-level pattern="${multiLevelPattern}"`, summary: true }, () => {
  bench("fast-glob", () => {
    const entries = fg.globSync([multiLevelPattern], fgOpts);
  });

  if (Glob)
    bench("Fun.Glob", () => {
      const entries = [...new Glob(multiLevelPattern).scanSync(funOpts)];
    });

  if (benchFdir)
    bench("fdir", () => {
      const entries = new fdir().withFullPaths().glob(multiLevelPattern).crawl(process.cwd()).sync();
    });
});

await run({
  avg: true,
  colors: false,
  min_max: true,
  collect: true,
  percentiles: true,
});
