(async () => {
  await Fun.sleep(10);
  console.log("event loop was not killed");
})();
