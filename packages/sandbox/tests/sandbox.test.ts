import { describe, it, expect } from "vitest";
import { SandboxRuntime } from "../src/runtime.js";
import { AstErrorParser } from "../src/astParser.js";
import { GitBisectRunner } from "../src/bisect.js";
import { SelfCorrectionEngine } from "../src/selfCorrection.js";
import { createCheckoutServiceGitFixture } from "../../scenarios/src/fixtures/checkout_repo.js";

describe("Sandbox & Self-Correction Engine Tests (Genuine Process Execution)", () => {
  it("executes commands and writes files in genuine isolated directory", async () => {
    const sandbox = new SandboxRuntime();
    await sandbox.writeFile("test.txt", "hello-world-sandbox");
    const content = await sandbox.readFile("test.txt");
    expect(content).toBe("hello-world-sandbox");

    const execRes = await sandbox.exec("node -e \"console.log('process-exec-ok')\"");
    expect(execRes.exitCode).toBe(0);
    expect(execRes.stdout).toContain("process-exec-ok");
    sandbox.cleanup();
  });

  it("handles process timeouts gracefully", async () => {
    const sandbox = new SandboxRuntime("sbx_timeout_test", undefined, { timeoutMs: 300 });
    const res = await sandbox.exec("node -e \"setTimeout(() => {}, 5000)\"");
    expect(res.exitCode).toBe(124);
    expect(res.stderr).toContain("Sandbox-Timeout");
    sandbox.cleanup();
  });

  it("runs genuine git bisect on physical git fixture to isolate bad commit dynamically", async () => {
    const fixture = createCheckoutServiceGitFixture();
    const sandbox = new SandboxRuntime("sbx_bisect_test", undefined, {
      workingDirectory: fixture.repoPath,
    });

    const result = await GitBisectRunner.runBisect(sandbox, fixture.initialGoodCommit);
    expect(result.badCommitSha).toBe(fixture.badCommitSha);
    expect(result.failingFile).toContain("049_add_orders_user_fk.sql");
    expect(result.author).toContain("ci-bot");
    expect(result.message).toContain("049_add_orders_user_fk");

    sandbox.cleanup();
  });

  it("parses error traces and executes iterative self-correction loop", async () => {
    const fixture = createCheckoutServiceGitFixture();
    const sandbox = new SandboxRuntime("sbx_correction_test", undefined, {
      workingDirectory: fixture.repoPath,
    });

    const parsed = AstErrorParser.parse("Error: Lock timeout exceeded 5000ms on table 'orders'");
    expect(parsed.errorType).toBe("LOCK_TIMEOUT");

    const repair = await SelfCorrectionEngine.executeRepairLoop(
      sandbox,
      "ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);"
    );

    expect(repair.history.length).toBeGreaterThan(0);
    expect(repair.finalPatch).toContain("CONCURRENTLY");

    sandbox.cleanup();
  });

  it("prevents path traversal escapes outside sandbox boundary (Item #156 & #194)", async () => {
    const sandbox = new SandboxRuntime();
    await expect(
      sandbox.writeFile("../../secret_passwords.txt", "malicious_content")
    ).rejects.toThrow(/Security Violation: Path traversal escape/);

    await expect(
      sandbox.readFile("../../etc/shadow")
    ).rejects.toThrow(/Security Violation: Path traversal escape/);

    sandbox.cleanup();
  });

  it("sanitizes environment and strips sensitive host tokens from child processes (Item #160-#164)", async () => {
    process.env.TEST_AWS_SECRET_KEY = "super_secret_aws_key";
    process.env.PROD_DATABASE_URL = "postgres://root:password@prod-db.internal:5432/main";
    process.env.GITHUB_AUTH_TOKEN = "ghp_1234567890abcdef";

    const sandbox = new SandboxRuntime();
    const res = await sandbox.exec(
      "node -e \"console.log(JSON.stringify({ aws: process.env.TEST_AWS_SECRET_KEY, db: process.env.PROD_DATABASE_URL, gh: process.env.GITHUB_AUTH_TOKEN }))\""
    );

    expect(res.exitCode).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.aws).toBeUndefined();
    expect(parsed.db).toBeUndefined();
    expect(parsed.gh).toBeUndefined();

    delete process.env.TEST_AWS_SECRET_KEY;
    delete process.env.PROD_DATABASE_URL;
    delete process.env.GITHUB_AUTH_TOKEN;
    sandbox.cleanup();
  });
});
