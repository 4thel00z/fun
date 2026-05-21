for (let i = 0; i <= 25; i++) {
  await Fun.write(Fun.stderr, i + "\n");
  await Fun.sleep(10);
}
