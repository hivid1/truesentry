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

export interface AgentEvent {
  eventId: string;
  sessionId: string;
  type: "THOUGHT" | "TOOL_CALL" | "TOOL_RESULT" | "SANDBOX_LOG" | "APPROVAL_REQUEST" | "TELEMETRY" | "INCIDENT_RESOLVED";
  timestamp: number;
  subagent?: string;
  payload: Record<string, unknown>;
}

export interface TelemetryPoint {
  timestamp: number;
  errorRate: number;
  p99LatencyMs: number;
  activeLocks: number;
  runningPods: number;
}
