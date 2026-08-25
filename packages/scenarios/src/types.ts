export interface IncidentScenario {
  id: string;
  title: string;
  category: "DATABASE_LOCK" | "MEMORY_LEAK" | "SECURITY_QUARANTINE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  service: string;
  initialAlertMessage: string;
  rootCauseDescription: string;
  proposedActionDescription: string;
  diff: {
    language: string;
    before: string;
    after: string;
  };
  blastRadius: {
    riskScore: number;
    estimatedDowntimeSeconds: number;
    affectedServices: string[];
    dataLossRisk: boolean;
  };
}
