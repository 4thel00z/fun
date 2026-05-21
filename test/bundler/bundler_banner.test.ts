import { describe, expect } from "fun:test";
import { itBundled } from "./expectBundled";

describe("bundler", () => {
  itBundled("banner/CommentBanner", {
    banner: "// developed with love in SF",
    files: {
      "/a.js": `console.log("Hello, world!")`,
    },
    onAfterBundle(api) {
      api.expectFile("out.js").toContain("// developed with love in SF");
    },
  });
  itBundled("banner/MultilineBanner", {
    banner: `"use client";
// This is a multiline banner
// It can contain multiple lines of comments or code`,
    files: {
      /* js*/ "index.js": `console.log("Hello, world!")`,
    },
    onAfterBundle(api) {
      api.expectFile("out.js").toContain(`"use client";
// This is a multiline banner
// It can contain multiple lines of comments or code`);
    },
  });
  itBundled("banner/UseClientBanner", {
    banner: '"use client";',
    files: {
      /* js*/ "index.js": `console.log("Hello, world!")`,
    },
    onAfterBundle(api) {
      api.expectFile("out.js").toContain('"use client";');
    },
  });

  itBundled("banner/BannerWithCJSAndTargetFun", {
    banner: "// Copyright 2024 Example Corp",
    format: "cjs",
    target: "fun",
    backend: "api",
    outdir: "/out",
    minifyWhitespace: true,
    files: {
      "a.js": `module.exports = 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      expect(content).toMatchInlineSnapshot(`
        "// @fun @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Copyright 2024 Example Corp
        module.exports=1;})
        "
      `);
    },
  });

  itBundled("banner/HashbangBannerWithCJSAndTargetFun", {
    banner: "#!/usr/bin/env -S node --enable-source-maps\n// Additional banner content",
    format: "cjs",
    target: "fun",
    backend: "api",
    outdir: "/out",
    minifyWhitespace: true,
    files: {
      "/a.js": `module.exports = 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      expect(content).toMatchInlineSnapshot(`
        "#!/usr/bin/env -S node --enable-source-maps
        // @fun @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Additional banner content
        module.exports=1;})
        "
      `);
    },
  });

  itBundled("banner/SourceHashbangWithBannerAndCJSTargetFun", {
    banner: "// Copyright 2024 Example Corp",
    format: "cjs",
    target: "fun",
    outdir: "/out",
    minifyWhitespace: true,
    backend: "api",
    files: {
      "/a.js": `#!/usr/bin/env node
module.exports = 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      expect(content).toMatchInlineSnapshot(`
        "#!/usr/bin/env node
        // @fun @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Copyright 2024 Example Corp
        module.exports=1;})
        "
      `);
    },
  });

  itBundled("banner/BannerWithESMAndTargetFun", {
    banner: "// Copyright 2024 Example Corp",
    format: "esm",
    target: "fun",
    backend: "api",
    minifyWhitespace: true,
    files: {
      "/a.js": `export default 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("out.js");
      // @fun comment should come first, then banner
      const funCommentIndex = content.indexOf("// @fun");
      const bannerIndex = content.indexOf("// Copyright 2024 Example Corp");

      expect(funCommentIndex).toBe(0);
      expect(bannerIndex).toBeGreaterThan(funCommentIndex);
      // No CJS wrapper in ESM format
      expect(content).not.toContain("(function(exports, require, module, __filename, __dirname)");
      expect(content).toMatchInlineSnapshot(`
        "// @fun
        // Copyright 2024 Example Corp
        var a_default=1;export{a_default as default};
        "
      `);
    },
  });

  itBundled("banner/HashbangBannerWithESMAndTargetFun", {
    banner: "#!/usr/bin/env -S node --enable-source-maps\n// Additional banner content",
    format: "esm",
    target: "fun",
    backend: "api",
    outdir: "/out",
    minifyWhitespace: true,
    files: {
      "/a.js": `export default 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      expect(content).toMatchInlineSnapshot(`
        "#!/usr/bin/env -S node --enable-source-maps
        // @fun
        // Additional banner content
        var a_default=1;export{a_default as default};
        "
      `);
    },
  });

  itBundled("banner/BannerWithBytecodeAndCJSTargetFun", {
    banner: "// Copyright 2024 Example Corp",
    format: "cjs",
    target: "fun",
    backend: "api",
    bytecode: true,
    minifyWhitespace: true,
    outdir: "/out",
    files: {
      "/a.js": `module.exports = 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      expect(content).toMatchInlineSnapshot(`
        "// @fun @bytecode @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Copyright 2024 Example Corp
        module.exports=1;})
        "
      `);
      // @fun @bytecode @fun-cjs comment should come first, then CJS wrapper, then banner
      const funBytecodeIndex = content.indexOf("// @fun @bytecode @fun-cjs");
      const wrapperIndex = content.indexOf("(function(exports, require, module, __filename, __dirname) {");
      const bannerIndex = content.indexOf("// Copyright 2024 Example Corp");

      expect(funBytecodeIndex).toBe(0);
      expect(wrapperIndex).toBeGreaterThan(funBytecodeIndex);
      expect(bannerIndex).toBeGreaterThan(wrapperIndex);
    },
  });

  itBundled("banner/HashbangBannerWithBytecodeAndCJSTargetFun", {
    banner: "#!/usr/bin/env fun\n// Production build",
    format: "cjs",
    target: "fun",
    bytecode: true,
    backend: "api",
    outdir: "/out",
    minifyWhitespace: true,
    files: {
      "/a.js": `module.exports = 1;`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");

      expect(content).toMatchInlineSnapshot(`
        "#!/usr/bin/env fun
        // @fun @bytecode @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Production build
        module.exports=1;})
        "
      `);
    },
  });

  itBundled("banner/SourceHashbangWithBytecodeAndCJSTargetFun", {
    banner: "// Copyright 2024 Example Corp",
    format: "cjs",
    target: "fun",
    bytecode: true,
    outdir: "/out",
    minifyWhitespace: true,
    backend: "api",
    files: {
      "/a.js": `#!/usr/bin/env fun
module.exports = 1;
console.log("fun!");`,
    },
    onAfterBundle(api) {
      const content = api.readFile("/out/a.js");
      // Shebang from source should come first, then @fun pragma
      expect(content).toMatchInlineSnapshot(`
        "#!/usr/bin/env fun
        // @fun @bytecode @fun-cjs
        (function(exports, require, module, __filename, __dirname) {// Copyright 2024 Example Corp
        module.exports=1;console.log("fun!");})
        "
      `);
    },
    run: {
      stdout: "fun!\n",
    },
  });
});
