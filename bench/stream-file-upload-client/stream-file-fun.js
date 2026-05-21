import { file } from "bun";
console.time("stream-file-fun");
const response = await fetch(process.env.URL ?? "http://localhost:3000", {
  method: "POST",
  body: file(process.env.FILE ?? "hello.txt"),
});
console.timeEnd("stream-file-fun");

console.log("Sent", await response.text(), "bytes");
