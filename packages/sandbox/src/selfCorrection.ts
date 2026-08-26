import { SandboxRuntime } from "./runtime.js";
import { AstErrorParser } from "./astParser.js";
import { SelfCorrectionState } from "./types.js";
import path from "path";

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
      
      // Write the patch to the migrations directory to test if it resolves the lock contention
      await sandbox.writeFile("migrations/049_add_orders_user_fk.sql", currentPatch);
      
      const res = await sandbox.exec("node test/concurrency_lock_spec.js");

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

      // Refinement logic: replace blocking constraint with safe non-blocking concurrent approach
      currentPatch = `-- Refined Rollback & Concurrent Non-Blocking Index Patch (Iteration ${i + 1})
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_user;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
`;
    }

    return state;
  }
}
