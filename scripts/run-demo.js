const { spawn } = require("child_process");
const path = require("path");

console.log("\n=======================================================");
console.log("⚡ TrueSentry: Autonomous SRE Incident Responder");
console.log("   Powered by TrueForge Agent Harness (TrueFoundry)");
console.log("=======================================================\n");

console.log("📦 Starting TrueForge Harness Server (Port 8790)...");
const harness = spawn("node", [path.join(__dirname, "../packages/core/dist/server.js")], {
  stdio: "inherit",
  shell: true,
});

setTimeout(() => {
  console.log("\n🚀 Starting SRE Operations Command Center (Port 3000)...");
  const ui = spawn("npm", ["run", "dev", "--workspace=@truesentry/command-center"], {
    stdio: "inherit",
    shell: true,
  });

  process.on("SIGINT", () => {
    harness.kill();
    ui.kill();
    process.exit();
  });
}, 1500);
