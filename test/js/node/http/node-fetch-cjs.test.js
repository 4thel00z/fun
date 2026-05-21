const fetch = require("node-fetch");

test("require('node-fetch') fetches", async () => {
  // can't use `using`. see https://github.com/underdoc-org/fun/issues/11100
  const server = Fun.serve({
    port: 0,
    fetch(req, server) {
      server.stop();
      return new Response();
    },
  });
  expect(await fetch("http://" + server.hostname + ":" + server.port)).toBeInstanceOf(Response);
  server.stop(true);
});
