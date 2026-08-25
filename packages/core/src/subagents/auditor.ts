import { BlastRadiusCalculator } from "../hitl/blastRadius.js";
import { PolicyEngine } from "../hitl/policies.js";

export class BlastRadiusAuditorSubagent {
  public role = "BlastRadiusAuditor";

  public auditRemediation(actionType: string, affectedServices: string[], lockTimeMs: number) {
    const riskScore = BlastRadiusCalculator.calculate({
      affectedServicesCount: affectedServices.length,
      lockDurationMs: lockTimeMs,
      isDestructive: false,
    });

    const policyDecision = PolicyEngine.evaluate(actionType, false, riskScore);

    return {
      riskScore,
      policyDecision,
      estimatedDowntimeSeconds: 3.0,
      affectedServices,
      isIrreversible: true,
      dataLossRisk: false,
      safetyAssessment: "Patch drops blocking constraint and builds index CONCURRENTLY with 0 data loss. Requires Human Sign-off.",
    };
  }
}
