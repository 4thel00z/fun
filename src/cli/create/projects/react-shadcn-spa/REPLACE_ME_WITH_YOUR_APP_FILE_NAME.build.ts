import tailwind from "fun-plugin-tailwind";
import { rm } from "node:fs/promises";
import path from "node:path";

const outdir = path.join(import.meta.dir, "dist");
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Fun.Glob("*.html").scanSync(import.meta.dir)].map(f => path.join(import.meta.dir, f));

const result = await Fun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

for (const output of result.outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}
