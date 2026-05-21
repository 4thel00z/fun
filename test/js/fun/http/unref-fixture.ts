const server = Fun.serve({
  fetch(req: Request) {
    return new Response(`Echo: ${req.url}`);
  },
  port: 0,
});

setTimeout(() => {
  server.unref();
}, 1);

process.once("beforeExit", () => {
  server.stop();
});
