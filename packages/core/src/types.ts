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

export interface RegressionSuiteResult {
  testsPassed: number;
  totalTests: number;
  status: "PASSED" | "FAILED";
  measuredLockMs?: number;
}

export type EvidenceSource =
  | "PROMETHEUS_MCP"
  | "POSTGRES_MCP"
  | "GITHUB_MCP"
  | "GIT_BISECT_RUNNER"
  | "SANDBOX_RUNTIME"
  | "POLICY_ENGINE"
  | "HITL_GATE"
  | "POST_MORTEM_SCRIBE";

export interface EvidenceNode {
  id: string;
  label: string;
  type: "INCIDENT" | "TELEMETRY" | "LOCK" | "DEPLOYMENT" | "BISECT" | "SANDBOX" | "ROOT_CAUSE" | "HITL" | "REMEDIATION" | "RECOVERY";
  status: "ACTIVE" | "VERIFIED" | "BLOCKED" | "COMPLETED";
  detail: string;
  timestamp: number;
  incidentId: string;
  source: EvidenceSource;
  queryOrCommand?: string;
  rawObservation?: Record<string, unknown> | string;
  evidenceHash: string;
  confidence: number;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relation: string;
  evidenceRefHash?: string;
}

export interface EvidenceGraph {
  incidentId: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  summary: string;
  isVerifiedChain?: boolean;
}

export interface AgentEvent {
  eventId: string;
  sessionId: string;
  type: "THOUGHT" | "TOOL_CALL" | "TOOL_RESULT" | "SANDBOX_LOG" | "APPROVAL_REQUEST" | "TELEMETRY" | "EVIDENCE_GRAPH_UPDATE" | "INCIDENT_RESOLVED";
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
  provenance?: {
    source: string;
    query: string;
    queryTimestamp: number;
  };
}
