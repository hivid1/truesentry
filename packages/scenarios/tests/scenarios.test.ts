import { describe, it, expect } from "vitest";
import { SCENARIO_1_DB_LOCK, SCENARIO_2_MEMORY_LEAK, SCENARIO_3_SECURITY } from "../src";

describe("Benchmark Incident Scenarios Validation", () => {
  it("validates scenario 1 (DB Lock)", () => {
    expect(SCENARIO_1_DB_LOCK.id).toBe("scenario_1_db_lock");
    expect(SCENARIO_1_DB_LOCK.severity).toBe("CRITICAL");
    expect(SCENARIO_1_DB_LOCK.blastRadius.dataLossRisk).toBe(false);
    expect(SCENARIO_1_DB_LOCK.diff.after).toContain("CONCURRENTLY");
  });

  it("validates scenario 2 (Memory Leak)", () => {
    expect(SCENARIO_2_MEMORY_LEAK.id).toBe("scenario_2_memory_leak");
    expect(SCENARIO_2_MEMORY_LEAK.severity).toBe("HIGH");
    expect(SCENARIO_2_MEMORY_LEAK.diff.after).toContain("abort");
  });

  it("validates scenario 3 (Security Quarantine)", () => {
    expect(SCENARIO_3_SECURITY.id).toBe("scenario_3_security_quarantine");
    expect(SCENARIO_3_SECURITY.severity).toBe("CRITICAL");
    expect(SCENARIO_3_SECURITY.blastRadius.riskScore).toBeGreaterThan(90);
  });
});
