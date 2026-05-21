process.exitCode = 1;

(async () => {
  await Fun.$`${process.execPath} -e "console.log('hi')"`;
  process.exit(0);
})();
