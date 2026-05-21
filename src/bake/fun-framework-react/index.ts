// This file is unused by Fun itself, but rather is a tool for
// contributors to hack on `fun-framework-react` without needing
// to compile fun itself. If changes to this are made, please
// update 'pub fn react' in 'bake.zig'
import type { Bake } from "fun";

export function react(): Bake.Framework {
  return {
    // When the files are embedded in the Fun binary,
    // relative path resolution does not work.
    builtInModules: [
      { import: "fun-framework-react/client.tsx", path: require.resolve("./client.tsx") },
      { import: "fun-framework-react/server.tsx", path: require.resolve("./server.tsx") },
      { import: "fun-framework-react/ssr.tsx", path: require.resolve("./ssr.tsx") },
    ],
    fileSystemRouterTypes: [
      {
        root: "pages",
        clientEntryPoint: "fun-framework-react/client.tsx",
        serverEntryPoint: "fun-framework-react/server.tsx",
        extensions: ["jsx", "tsx"],
        style: "nextjs-pages",
        layouts: true,
        ignoreUnderscores: true,
      },
    ],
    staticRouters: ["public"],
    reactFastRefresh: {
      importSource: "react-refresh/runtime",
    },
    serverComponents: {
      separateSSRGraph: true,
      serverRegisterClientReferenceExport: "registerClientReference",
      serverRuntimeImportSource: "react-server-dom-webpack/server",
    },
    bundlerOptions: {
      ssr: {
        conditions: ["react-server"],
      },
    },
  };
}
