import { SandboxRuntime } from "./runtime.js";
import { AstErrorParser } from "./astParser.js";
import { SelfCorrectionState } from "./types.js";

export class SelfCorrectionEngine {
  public static async executeRepairLoop(
    sandbox: SandboxRuntime,
    initialPatch: string,
    maxIterations = 3
  ): Promise<SelfCorrectionState> {
    const state: SelfCorrectionState = {
      iteration: 0,
      maxIterations,
      history: [],
    };

    let currentPatch = initialPatch;

    for (let i = 1; i <= maxIterations; i++) {
      state.iteration = i;
      await sandbox.writeFile("/workspace/patch.sql", currentPatch);
      const res = await sandbox.exec("npm test -- test/concurrency_lock_spec.ts");

      if (res.exitCode === 0) {
        state.history.push({
          attemptedPatch: currentPatch,
          passed: true,
        });
        state.finalPatch = currentPatch;
        return state;
      }

      const parsedError = AstErrorParser.parse(res.stderr || res.stdout);
      state.history.push({
        attemptedPatch: currentPatch,
        error: parsedError,
        passed: false,
      });

      // Self-Correction refinement logic
      if (parsedError.errorType === "LOCK_TIMEOUT") {
        currentPatch = `-- Refined Rollback & Concurrent Index Patch (Iteration ${i + 1})
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_user_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
`;
      }
    }

    return state;
  }
}
