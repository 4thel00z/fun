import * as Fun from "fun";

await Fun.connect({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLocaleLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  hostname: "adsf",
  port: 324,
});

await Fun.connect({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  hostname: "adsf",
  port: 324,
});

await Fun.connect({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  unix: "asdf",
});

await Fun.connect({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  unix: "asdf",
});

Fun.listen({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  hostname: "adsf",
  port: 324,
});

Fun.listen({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  hostname: "adsf",
  port: 324,
  tls: {
    certFile: "asdf",
    keyFile: "adsf",
  },
});

Fun.listen({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  hostname: "adsf",
  port: 324,
  tls: {
    cert: "asdf",
    key: Fun.file("adsf"),
    ca: Buffer.from("asdf"),
  },
});

Fun.listen({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  unix: "asdf",
});

const listener = Fun.listen({
  data: { arg: "asdf" },
  socket: {
    data(socket) {
      socket.data.arg.toLowerCase();
    },
    open() {
      console.log("asdf");
    },
  },
  unix: "asdf",
});

listener.data.arg = "asdf";
// @ts-expect-error arg is string
listener.data.arg = 234;

// listener.reload({
//   data: {arg: 'asdf'},
// });

listener.reload({
  socket: {
    open() {},
    // ...listener.
  },
});

// Test Socket.reload() type signature (issue #26290)
// The socket instance's reload() method should also accept { socket: handler }
await Fun.connect({
  data: { arg: "asdf" },
  socket: {
    open(socket) {
      // Socket.reload() should accept { socket: handler }, not handler directly
      socket.reload({
        socket: {
          open() {},
          data() {},
        },
      });
    },
    data() {},
  },
  hostname: "localhost",
  port: 1,
});
