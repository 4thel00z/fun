import * as os from "node:os";

Fun.serve({
  fetch(req: Request) {
    return new Response(`Hello from ${os.arch()}!`);
  },
});
