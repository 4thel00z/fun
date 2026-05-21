const args = process.argv.slice(2);
const timeout = parseInt(args[0] || "0", 1);
Fun.sleepSync(timeout * 1000);
