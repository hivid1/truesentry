import { SandboxExecResult } from "./types.js";

export class SandboxRuntime {
  public sandboxId: string;
  private virtualFs: Map<string, string> = new Map();
  private onStdoutChunk?: (chunk: string) => void;

  constructor(sandboxId = `sbx_${Math.random().toString(36).substring(7)}`, onStdoutChunk?: (chunk: string) => void) {
    this.sandboxId = sandboxId;
    this.onStdoutChunk = onStdoutChunk;
  }

  public async writeFile(path: string, content: string): Promise<void> {
    this.virtualFs.set(path, content);
  }

  public async readFile(path: string): Promise<string | undefined> {
    return this.virtualFs.get(path);
  }

  public async exec(command: string): Promise<SandboxExecResult> {
    const startTime = Date.now();
    const emit = (str: string) => {
      if (this.onStdoutChunk) {
        this.onStdoutChunk(str);
      }
    };

    emit(`\x1b[36m[TrueForge-Sandbox:${this.sandboxId}]\x1b[0m $ ${command}\n`);

    // Simulated sandbox command dispatcher
    if (command.startsWith("git bisect")) {
      return this.handleGitBisect(command, emit, startTime);
    }

    if (command.includes("test:migrations") || command.includes("npm test")) {
      return this.handleTestExecution(emit, startTime);
    }

    if (command.includes("psql") || command.includes("apply")) {
      emit("\x1b[32mApplying schema migration inside isolated sandbox PostgreSQL instance...\x1b[0m\n");
      emit("CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id); -> OK\n");
      return {
        exitCode: 0,
        stdout: "CREATE INDEX CONCURRENTLY -> OK\nLock time: 0.00ms",
        stderr: "",
        durationMs: Date.now() - startTime,
      };
    }

    emit(`Command '${command}' completed with exit code 0\n`);
    return {
      exitCode: 0,
      stdout: `Execution finished for: ${command}`,
      stderr: "",
      durationMs: Date.now() - startTime,
    };
  }

  private handleGitBisect(command: string, emit: (s: string) => void, startTime: number): SandboxExecResult {
    emit("Bisecting: 4 revisions left to test after this (roughly 2 steps)\n");
    emit("[4c21e90b8f41] db: Migration 049_add_orders_user_fk.sql\n");
    emit("\x1b[31m[FAIL]\x1b[0m orders_concurrency_test: lock timeout exceeded 5000ms\n");
    emit("4c21e90b8f41 is the first bad commit\n");
    emit("commit 4c21e90b8f41\nAuthor: ci-bot <ci@company.com>\nDate: 2026-08-24 02:02:00\n");
    emit("  db: Migration 049_add_orders_user_fk.sql (Exclusive Lock)\n");

    return {
      exitCode: 0,
      stdout: "4c21e90b8f41 is the first bad commit\ncommit 4c21e90b8f41\nAuthor: ci-bot",
      stderr: "",
      durationMs: Date.now() - startTime,
    };
  }

  private handleTestExecution(emit: (s: string) => void, startTime: number): SandboxExecResult {
    const patchContent = this.virtualFs.get("/workspace/patch.sql") || "";
    
    // If patch contains CONCURRENTLY and drops exclusive lock
    if (patchContent.includes("DROP CONSTRAINT") || patchContent.includes("CONCURRENTLY")) {
      emit("\x1b[32m✓\x1b[0m test/orders_load_spec.ts (14 tests)\n");
      emit("\x1b[32m✓\x1b[0m test/concurrency_lock_spec.ts (18 tests) [Lock time: 1.4ms]\n");
      emit("\x1b[32m✓\x1b[0m test/checkout_flow_spec.ts (16 tests)\n\n");
      emit("\x1b[32mTest Suites: 3 passed, 3 total\nTests:       48 passed, 48 total\nSnapshots:   0 total\nTime:        1.428 s\x1b[0m\n");
      return {
        exitCode: 0,
        stdout: "PASS test/concurrency_lock_spec.ts\nTests: 48 passed, 48 total",
        stderr: "",
        durationMs: Date.now() - startTime,
      };
    }

    emit("\x1b[31m✕\x1b[0m test/concurrency_lock_spec.ts (1 failed)\n");
    emit("  ● orders_concurrency_test > should not acquire ExclusiveLock\n");
    emit("    Error: Lock timeout exceeded 5000ms on table 'orders'\n");
    emit("      at Object.<anonymous> (test/concurrency_lock_spec.ts:42:11)\n");
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Error: Lock timeout exceeded 5000ms on table 'orders'\nat test/concurrency_lock_spec.ts:42:11",
      durationMs: Date.now() - startTime,
    };
  }
}
