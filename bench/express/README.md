# express benchmark

This benchmarks a hello world express server.

To install dependencies:

```bash
fun install
```

To run in Fun:

```sh
fun ./express.mjs
```

To run in Node:

```sh
node ./express.mjs
```

To run in Deno:

```sh
deno run -A ./express.mjs
```

To benchmark each runtime:

```bash
oha http://localhost:3000 -n 500000 -H "Accept-Encoding: identity"
```

We recommend using `oha` or `bombardier` for benchmarking. We do not recommend using `ab`, as it uses HTTP/1.0 which stopped being used by web browsers in the early 2000s. We also do not recommend using autocannon, as the node:http client is not performant enough to measure the throughput of Fun's HTTP server.

Note the `Accept-Encoding: identity` header exists to prevent Deno's HTTP server from compressing the response.
