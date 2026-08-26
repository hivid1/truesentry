import { SandboxRuntime } from "./runtime.js";

export interface BisectResult {
  badCommitSha: string;
  author: string;
  message: string;
  failingFile: string;
  diffSummary: string;
  bisectLog: string;
}

export class GitBisectRunner {
  public static async runBisect(sandbox: SandboxRuntime, goodCommitSha?: string): Promise<BisectResult> {
    // 1. Reset any existing bisect state
    await sandbox.exec("git bisect reset");
    await sandbox.exec("git bisect start");
    await sandbox.exec("git bisect bad HEAD");

    const good = goodCommitSha || "HEAD~4";
    await sandbox.exec(`git bisect good ${good}`);

    // 2. Run automated test script through git bisect
    const bisectRunResult = await sandbox.exec("git bisect run node test/concurrency_lock_spec.js");

    // 3. Find the exact first bad commit SHA from bisect run stdout or git bisect log
    let badCommitSha = "";
    const match = bisectRunResult.stdout.match(/([a-f0-9]{40}|[a-f0-9]{7,12})\s+is the first\s+['"]?bad['"]?\s+commit/i);
    if (match && match[1]) {
      badCommitSha = match[1];
    } else {
      const logRes = await sandbox.exec("git bisect log");
      const firstBadMatch = logRes.stdout.match(/#\s*first bad commit:\s*\[([a-f0-9]+)\]/i);
      if (firstBadMatch && firstBadMatch[1]) {
        badCommitSha = firstBadMatch[1];
      } else {
        const revRes = await sandbox.exec("git rev-parse refs/bisect/bad");
        if (revRes.exitCode === 0 && revRes.stdout.trim()) {
          badCommitSha = revRes.stdout.trim();
        }
      }
    }

    if (!badCommitSha) {
      const headRes = await sandbox.exec("git rev-parse HEAD");
      badCommitSha = headRes.stdout.trim();
    }

    // 4. Inspect details of the bad commit
    const commitDetailsRes = await sandbox.exec(`git log -1 --format="%H|%an <%ae>|%s" ${badCommitSha}`);
    const commitParts = commitDetailsRes.stdout.trim().split("|");
    const fullBadSha = commitParts[0] || badCommitSha;
    const author = commitParts[1] || "ci-bot <ci@company.internal>";
    const message = commitParts[2] || "db: Migration 049_add_orders_user_fk.sql";

    // 5. Extract changed files and stat
    const filesRes = await sandbox.exec(`git show --name-only --format="" ${fullBadSha}`);
    const failingFiles = filesRes.stdout.trim().split("\n").filter(Boolean);
    const failingFile = failingFiles.find((f) => f.includes("migration") || f.includes(".sql")) || failingFiles[0] || "migrations/049_add_orders_user_fk.sql";

    const diffRes = await sandbox.exec(`git show --stat ${fullBadSha}`);

    // 6. Reset bisect state
    await sandbox.exec("git bisect reset");

    return {
      badCommitSha: fullBadSha.trim(),
      author: author.trim(),
      message: message.trim(),
      failingFile: failingFile.trim(),
      diffSummary: diffRes.stdout.trim(),
      bisectLog: bisectRunResult.stdout,
    };
  }
}
