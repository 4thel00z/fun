var writer = Fun.stdout.writer();
setInterval(() => {
  writer.write("Wrote to stdout\n");
}, 20);
