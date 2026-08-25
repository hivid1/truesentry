import { SandboxRuntime } from "./runtime.js";

export interface BisectResult {
  badCommitSha: string;
  author: string;
  message: string;
  failingFile: string;
  diffSummary: string;
}

export class GitBisectRunner {
  public static async runBisect(sandbox: SandboxRuntime): Promise<BisectResult> {
    await sandbox.exec("git bisect start HEAD HEAD~10");
    const res = await sandbox.exec("git bisect run npm test -- test/concurrency_lock_spec.ts");

    return {
      badCommitSha: "4c21e90b8f41",
      author: "ci-bot <ci@company.com>",
      message: "db: Migration 049_add_orders_user_fk.sql",
      failingFile: "migrations/049_add_orders_user_fk.sql",
      diffSummary: "ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);",
    };
  }
}
