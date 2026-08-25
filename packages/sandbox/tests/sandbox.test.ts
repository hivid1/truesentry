import { describe, it, expect } from "vitest";
import { SandboxRuntime } from "../src/runtime";
import { AstErrorParser } from "../src/astParser";
import { GitBisectRunner } from "../src/bisect";
import { SelfCorrectionEngine } from "../src/selfCorrection";

describe("Sandbox & Self-Correction Engine Tests", () => {
  it("executes commands in isolated sandbox", async () => {
    const sandbox = new SandboxRuntime();
    await sandbox.writeFile("/workspace/test.txt", "hello");
    const content = await sandbox.readFile("/workspace/test.txt");
    expect(content).toBe("hello");

    const exec = await sandbox.exec("echo test");
    expect(exec.exitCode).toBe(0);
  });

  it("runs git bisect to isolate faulty commit", async () => {
    const sandbox = new SandboxRuntime();
    const result = await GitBisectRunner.runBisect(sandbox);
    expect(result.badCommitSha).toBe("4c21e90b8f41");
    expect(result.failingFile).toContain("049_add_orders_user_fk.sql");
  });

  it("parses error traces and self-corrects in repair loop", async () => {
    const parsed = AstErrorParser.parse("Error: Lock timeout exceeded 5000ms on table 'orders'");
    expect(parsed.errorType).toBe("LOCK_TIMEOUT");

    const sandbox = new SandboxRuntime();
    // Initial broken patch that causes lock timeout
    const repair = await SelfCorrectionEngine.executeRepairLoop(
      sandbox,
      "ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);"
    );

    expect(repair.history.length).toBeGreaterThan(0);
    expect(repair.finalPatch).toContain("CONCURRENTLY");
  });
});
