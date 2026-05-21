import { execFileSync } from "child_process";
import { importFun } from "../src/npm/install";

importFun()
  .then(fun => {
    return execFileSync(fun, process.argv.slice(2), {
      stdio: "inherit",
    });
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
