# websocket-server

This benchmarks a websocket server intended as a simple but very active chat room.

First, start the server. By default, it will wait for 32 clients which the client script will handle.

Run in Fun (`Fun.serve`):

```bash
fun ./chat-server.fun.js
```

Run in Node (`"ws"` package):

```bash
node ./chat-server.node.mjs
```

Run in Deno (`Deno.serve`):

```bash
deno run -A ./chat-server.deno.mjs
```

Then, run the client script. By default, it will connect 32 clients. This client script can run in Fun, Node, or Deno

```bash
node ./chat-client.mjs
```

The client script loops through a list of messages for each connected client and sends a message.

For example, when the client sends `"foo"`, the server sends back `"John: foo"` so that all members of the chatroom receive the message.

The client script waits until it receives all the messages for each client before sending the next batch of messages.

This project was created using `fun init` in fun v0.2.1. [Fun](https://fun.dev) is a fast all-in-one JavaScript runtime.
