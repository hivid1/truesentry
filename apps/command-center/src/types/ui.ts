export interface HitlApprovalRequest {
  approvalId: string;
  sessionId: string;
  incidentId: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  target: {
    system: string;
    resource: string;
    actionType: string;
  };
  blastRadius: {
    riskScore: number;
    estimatedDowntimeSeconds: number;
    affectedServices: string[];
    dataLossRisk: boolean;
  };
  diff: {
    language: string;
    before: string;
    after: string;
  };
  sandboxProof: {
    sandboxId: string;
    testsRun: number;
    testsPassed: number;
    lockDurationMeasuredMs: number;
  };
  nonce: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface AgentThoughtEvent {
  thought: string;
  step: number;
  subagent?: string;
  timestamp: number;
}

export interface TelemetryPoint {
  timestamp: number;
  errorRate: number;
  p99LatencyMs: number;
  activeLocks: number;
  runningPods: number;
  provenance?: {
    source: string;
    query: string;
    queryTimestamp: number;
  };
}
