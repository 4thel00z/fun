import { FunPlugin } from "fun";
import { readFileSync } from "fs";
import { load } from "js-yaml";

function YamlPlugin(): FunPlugin {
  return {
    name: "fun-plugin-yaml",
    setup(builder) {
      builder.onLoad({ filter: /\.(yaml|yml)$/ }, args => {
        const text = readFileSync(args.path, "utf8");
        const exports = load(text) as Record<string, any>;
        return {
          exports,
          loader: "object",
        };
      });
    },
  };
}

export default YamlPlugin;
