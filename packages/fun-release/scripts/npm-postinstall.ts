import { importFun, optimizeFun } from "../src/npm/install";

importFun()
  .then(path => {
    optimizeFun(path);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
