import { renderToReadableStream as renderToReadableStreamFun } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.browser";
import { bench, group, run } from "../runner.mjs";

const App = () => (
  <div>
    <h1>Hello, world!</h1>
    <p>This is a React component This is a React component This is a React component This is a React component.</p>
    <p>This is a React component This is a React component This is a React component This is a React component.</p>
    <p>This is a React component This is a React component This is a React component This is a React component.</p>
    <p>This is a React component This is a React component This is a React component This is a React component.</p>
    <p>This is a React component This is a React component This is a React component This is a React component.</p>
  </div>
);

group("new Response(stream).text()", () => {
  bench("react-dom/server.browser", async () => await new Response(await renderToReadableStream(<App />)).text());
  bench("react-dom/server.fun", async () => await new Response(await renderToReadableStreamFun(<App />)).text());
});

group("new Response(stream).arrayBuffer()", () => {
  bench(
    "react-dom/server.browser",
    async () => await new Response(await renderToReadableStream(<App />)).arrayBuffer(),
  );
  bench("react-dom/server.fun", async () => await new Response(await renderToReadableStreamFun(<App />)).arrayBuffer());
});

group("new Response(stream).bytes()", () => {
  bench("react-dom/server.browser", async () => await new Response(await renderToReadableStream(<App />)).bytes());
  bench("react-dom/server.fun", async () => await new Response(await renderToReadableStreamFun(<App />)).bytes());
});

group("new Response(stream).blob()", () => {
  bench("react-dom/server.browser", async () => await new Response(await renderToReadableStream(<App />)).blob());
  bench("react-dom/server.fun", async () => await new Response(await renderToReadableStreamFun(<App />)).blob());
});

await run();
