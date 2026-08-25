export type PolicyDecision = "ALLOW_AUTONOMOUS" | "REQUIRE_APPROVAL" | "HARD_BLOCK";

export class PolicyEngine {
  public static evaluate(actionType: string, isDestructive: boolean, riskScore: number): PolicyDecision {
    if (actionType.includes("DROP DATABASE") || actionType.includes("DELETE WITHOUT WHERE")) {
      return "HARD_BLOCK";
    }

    if (isDestructive || riskScore > 30 || actionType.includes("ROLLBACK") || actionType.includes("RESTART")) {
      return "REQUIRE_APPROVAL";
    }

    return "ALLOW_AUTONOMOUS";
  }
}
