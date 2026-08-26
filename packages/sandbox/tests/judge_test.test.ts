import { describe, it, expect } from "vitest";
import { SandboxRuntime } from "../src/runtime.js";
import { GitBisectRunner } from "../src/bisect.js";
import { createCheckoutServiceGitFixture } from "../../scenarios/src/fixtures/checkout_repo.js";

describe("Judge Challenge: Arbitrary Bad Commit Dynamic Discovery", () => {
  it("independently discovers the bad commit when fault is injected at Commit #2", async () => {
    const fixture = createCheckoutServiceGitFixture(2);
    const sandbox = new SandboxRuntime("sbx_judge_test_commit2", undefined, {
      workingDirectory: fixture.repoPath,
    });

    const result = await GitBisectRunner.runBisect(sandbox, fixture.initialGoodCommit);
    expect(result.badCommitSha).toBe(fixture.badCommitSha);
    expect(result.failingFile).toContain("048_add_users_role.sql");
    expect(result.message).toContain("048_add_users_role");

    sandbox.cleanup();
  });

  it("independently discovers the bad commit when fault is injected at Commit #3", async () => {
    const fixture = createCheckoutServiceGitFixture(3);
    const sandbox = new SandboxRuntime("sbx_judge_test_commit3", undefined, {
      workingDirectory: fixture.repoPath,
    });

    const result = await GitBisectRunner.runBisect(sandbox, fixture.initialGoodCommit);
    expect(result.badCommitSha).toBe(fixture.badCommitSha);
    expect(result.failingFile).toContain("049_add_orders_user_fk.sql");
    expect(result.message).toContain("049_add_orders_user_fk");

    sandbox.cleanup();
  });

  it("independently discovers the bad commit when fault is injected at Commit #4", async () => {
    const fixture = createCheckoutServiceGitFixture(4);
    const sandbox = new SandboxRuntime("sbx_judge_test_commit4", undefined, {
      workingDirectory: fixture.repoPath,
    });

    const result = await GitBisectRunner.runBisect(sandbox, fixture.initialGoodCommit);
    expect(result.badCommitSha).toBe(fixture.badCommitSha);
    expect(result.failingFile).toContain("050_add_payment_tokens.sql");
    expect(result.message).toContain("050_add_payment_tokens");

    sandbox.cleanup();
  });
});
