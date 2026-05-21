import { join } from "node:path";

import pkg from "../package.json";

const FUN_VERSION = (process.env.FUN_VERSION || Fun.version || process.versions.fun).replace(/^.*v/, "");

await Fun.write(join(import.meta.dir, "../package.json"), JSON.stringify({ ...pkg, version: FUN_VERSION }, null, 2));

// copy CLAUDE.md
let claude = Fun.file(join(import.meta.dir, "../../../src/init/rule.md"));
if (await claude.exists()) {
  let original = await claude.text();
  const endOfFrontMatter = original.lastIndexOf("---\n");
  original = original.replaceAll("node_modules/fun-types/", "");
  if (endOfFrontMatter > -1) {
    original = original.slice(endOfFrontMatter + "---\n".length).trim() + "\n";
  }

  await Fun.write(join(import.meta.dir, "../CLAUDE.md"), original);
}

// Copy docs
const docsDir = join(import.meta.dir, "../docs");
const sourceDocsDir = join(import.meta.dir, "../../../docs");
await Fun.$`rm -rf ${docsDir}`;

const sourceDocFiles = new Fun.Glob("**/*.{md,mdx}").scanSync({ cwd: sourceDocsDir });
for (const file of sourceDocFiles) {
  const content = await Fun.file(join(sourceDocsDir, file)).text();

  const updatedContent = content
    .replace(/\$FUN_LATEST_VERSION/g, FUN_VERSION)
    // Prefix copied doc paths with /docs/ (handles both links and images)
    .replace(
      /(!?\[([^\]]*)\])\(\/(runtime|pm|test|bundler|project|guides|installation|quickstart|typescript|feedback|index)(\/[^)]*)?\)/g,
      "$1(/docs/$3$4)",
    )
    // Convert non-copied content to absolute URLs (images, blog, etc.)
    .replace(/(!?\[([^\]]*)\])\(\/(images|blog)(\/[^)]*)?\)/g, "$1(https://fun.dev/$3$4)")
    .replace(/https:\/\/fun\.com\/docs\/guides\//g, "https://fun.dev/guides/");

  await Fun.write(join(docsDir, file), updatedContent);
}
