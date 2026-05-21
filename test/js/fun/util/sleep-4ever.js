const sleep = parseFloat(process.argv.at(-1));
console.log("Sleeping for", sleep, "ms");
await Fun.sleep(sleep);
