import { ArrayBufferSink } from "fun";

const sink = new ArrayBufferSink();

sink.write("hello");
sink.write(" ");
sink.write("world");
sink.write(new TextEncoder().encode("hello again|"));
sink.write(new TextEncoder().encode("😋 Get Emoji — All Emojis to ✂️ Copy and 📋 Paste 👌"));

const string = Buffer.from(sink.end()).toString().repeat(9999);

if (process.env.TEST_STDIO_STRING) {
  const result = string;
  process.stdout.write(result);
} else {
  const result = Buffer.from(string);
  process.stdout.write(result);
}
