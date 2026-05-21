const { spawn } = require("node:child_process");

function exitHandler() {
  console.log("exithHandler called");
}
function closeHandler() {
  console.log("closeHandler called");
}

let funExe = process.execPath;
if ((process.versions.fun || "").endsWith("_debug")) {
  funExe = "fun-debug";
} else if (funExe.endsWith("node")) {
  funExe = "fun";
}

const p = spawn(funExe, ["--version"]);

p.on("exit", exitHandler);
p.on("close", closeHandler);
