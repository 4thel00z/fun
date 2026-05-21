var stdout = Fun.stdout.writer();
var count = 0;
const file = Fun.stdin;

for await (let chunk of file.stream()) {
  stdout.write(chunk);
  await stdout.flush();
  count++;
}

if (count < 2) {
  throw new Error("Expected to receive at least 2 chunks, got " + count);
}
