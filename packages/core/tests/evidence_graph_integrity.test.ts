import { describe, it, expect } from "vitest";
import { EvidenceGraphValidator, EvidenceGraphIntegrityViolation } from "../src/hitl/graph_validator.js";
import { EvidenceGraph, EvidenceNode } from "../src/types.js";
import { PolicyEngine } from "../src/hitl/policies.js";

describe("🛡️ Evidence Graph Cryptographic Provenance & Causality Invariant Suite", () => {
  const incidentId = "INC-0824-DB-LOCK";

  it("1. Generates deterministic SHA-256 evidence hash from raw observations", () => {
    const node1 = EvidenceGraphValidator.createNode({
      id: "node_telemetry_1",
      label: "Prometheus Error Rate",
      type: "TELEMETRY",
      status: "VERIFIED",
      detail: "HTTP 500 error spike: 38.4%",
      incidentId,
      source: "PROMETHEUS_MCP",
      queryOrCommand: `rate(http_requests_total{status=~"5.."}[5m])`,
      rawObservation: { errorRate: 0.384, p99LatencyMs: 1420 },
      timestamp: 1724500000000,
    });

    expect(node1.evidenceHash).toHaveLength(64);
    expect(EvidenceGraphValidator.verifyNodeHash(node1)).toBe(true);

    // Node hash mismatch if observation or query is altered
    const tamperedObsNode = { ...node1, rawObservation: { errorRate: 0.01 } };
    expect(EvidenceGraphValidator.verifyNodeHash(tamperedObsNode)).toBe(false);
  });

  it("2. Invariant: Rejects skipping OS sandbox reproduction (telemetry -> root cause forbidden)", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const telemetryNode = EvidenceGraphValidator.createNode({
      id: "node_telemetry",
      label: "Prometheus Error 38.4%",
      type: "TELEMETRY",
      status: "VERIFIED",
      detail: "Error rate spike",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const fakeRootCauseNode = EvidenceGraphValidator.createNode({
      id: "node_root_cause",
      label: "ROOT CAUSE CONFIRMED (UNVERIFIED)",
      type: "ROOT_CAUSE",
      status: "VERIFIED",
      detail: "Asserted without running tests",
      incidentId,
      source: "SANDBOX_RUNTIME",
    });

    const unverifiedGraph: EvidenceGraph = {
      incidentId,
      summary: "Invalid Graph Skipping Sandbox",
      nodes: [incidentNode, telemetryNode, fakeRootCauseNode],
      edges: [
        { from: "node_incident", to: "node_telemetry", relation: "triggers" },
        { from: "node_telemetry", to: "node_root_cause", relation: "asserts_directly" },
      ],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(unverifiedGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
    try {
      EvidenceGraphValidator.assertValidGraph(unverifiedGraph);
    } catch (e: any) {
      expect(e.rule).toBe("UNVERIFIED_ROOT_CAUSE");
    }
  });

  it("3. Invariant: Rejects HITL request without prior confirmed root cause", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const hitlNode = EvidenceGraphValidator.createNode({
      id: "node_hitl",
      label: "HITL Gate",
      type: "HITL",
      status: "ACTIVE",
      detail: "Premature approval request",
      incidentId,
      source: "HITL_GATE",
    });

    const prematureGraph: EvidenceGraph = {
      incidentId,
      summary: "Premature HITL Graph",
      nodes: [incidentNode, hitlNode],
      edges: [{ from: "node_incident", to: "node_hitl", relation: "shortcuts" }],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(prematureGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
  });

  it("4. Invariant: Rejects REMEDIATION without VERIFIED approved HITL token", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const sandboxNode = EvidenceGraphValidator.createNode({
      id: "node_sandbox",
      label: "Sandbox",
      type: "SANDBOX",
      status: "VERIFIED",
      detail: "12/12 passed",
      incidentId,
      source: "SANDBOX_RUNTIME",
      rawObservation: { testsPassed: 12, totalTests: 12 },
    });

    const rootCauseNode = EvidenceGraphValidator.createNode({
      id: "node_root_cause",
      label: "Root Cause",
      type: "ROOT_CAUSE",
      status: "VERIFIED",
      detail: "Lock found",
      incidentId,
      source: "SANDBOX_RUNTIME",
    });

    const unapprovedHitlNode = EvidenceGraphValidator.createNode({
      id: "node_hitl",
      label: "HITL Gate (BLOCKED)",
      type: "HITL",
      status: "BLOCKED",
      detail: "Human rejected",
      incidentId,
      source: "HITL_GATE",
    });

    const unapprovedRemediation = EvidenceGraphValidator.createNode({
      id: "node_remediation",
      label: "Remediation Execution",
      type: "REMEDIATION",
      status: "VERIFIED",
      detail: "Attempting execution anyway",
      incidentId,
      source: "POSTGRES_MCP",
    });

    const rogueGraph: EvidenceGraph = {
      incidentId,
      summary: "Rogue Execution Graph",
      nodes: [incidentNode, sandboxNode, rootCauseNode, unapprovedHitlNode, unapprovedRemediation],
      edges: [
        { from: "node_sandbox", to: "node_root_cause", relation: "confirms" },
        { from: "node_root_cause", to: "node_hitl", relation: "requires_approval" },
        { from: "node_hitl", to: "node_remediation", relation: "forces_execution" },
      ],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(rogueGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
    try {
      EvidenceGraphValidator.assertValidGraph(rogueGraph);
    } catch (e: any) {
      expect(e.rule).toBe("UNAUTHORIZED_REMEDIATION");
    }
  });

  it("5. Invariant: Rejects RECOVERY without independent Prometheus MCP re-query", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const sandboxNode = EvidenceGraphValidator.createNode({
      id: "node_sandbox",
      label: "Sandbox",
      type: "SANDBOX",
      status: "VERIFIED",
      detail: "12/12 passed",
      incidentId,
      source: "SANDBOX_RUNTIME",
      rawObservation: { testsPassed: 12, totalTests: 12 },
    });

    const rootCauseNode = EvidenceGraphValidator.createNode({
      id: "node_root_cause",
      label: "Root Cause",
      type: "ROOT_CAUSE",
      status: "VERIFIED",
      detail: "Lock found",
      incidentId,
      source: "SANDBOX_RUNTIME",
    });

    const hitlNode = EvidenceGraphValidator.createNode({
      id: "node_hitl",
      label: "HITL Gate",
      type: "HITL",
      status: "VERIFIED",
      detail: "Approved",
      incidentId,
      source: "HITL_GATE",
    });

    const remediationNode = EvidenceGraphValidator.createNode({
      id: "node_remediation",
      label: "Remediation",
      type: "REMEDIATION",
      status: "VERIFIED",
      detail: "Executed",
      incidentId,
      source: "POSTGRES_MCP",
    });

    // Invalid source: claiming recovery from fake source
    const fakeRecoveryNode = EvidenceGraphValidator.createNode({
      id: "node_recovery",
      label: "Fake Recovery",
      type: "RECOVERY",
      status: "COMPLETED",
      detail: "Asserted without query",
      incidentId,
      source: "GITHUB_MCP" as any, // Not Prometheus!
    });

    const invalidRecoveryGraph: EvidenceGraph = {
      incidentId,
      summary: "Invalid Recovery Graph",
      nodes: [incidentNode, sandboxNode, rootCauseNode, hitlNode, remediationNode, fakeRecoveryNode],
      edges: [
        { from: "node_sandbox", to: "node_root_cause", relation: "confirms" },
        { from: "node_root_cause", to: "node_hitl", relation: "requires_approval" },
        { from: "node_hitl", to: "node_remediation", relation: "authorizes" },
        { from: "node_remediation", to: "node_recovery", relation: "fakes_health" },
      ],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(invalidRecoveryGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
  });

  it("6. Adversarial Agent Probe: The model can be manipulated; the execution boundary cannot", () => {
    // Injected prompt tricking LLM:
    const poisonedModelProposal = "DROP DATABASE production;";

    // Downstream Policy Engine strictly evaluates the proposal before any HITL or execution:
    const policyDecision = PolicyEngine.evaluateSql(poisonedModelProposal);

    expect(policyDecision.allowed).toBe(false);
    expect(policyDecision.policyAction).toBe("BLOCK");
    expect(policyDecision.reasons[0]).toContain("Dropping databases or entire tables is strictly forbidden");
  });

  it("7. Provenance Attack: Mutating source identity fails SHA-256 evidence validation", () => {
    const validNode = EvidenceGraphValidator.createNode({
      id: "node_telemetry_valid",
      label: "Prometheus Error Rate",
      type: "TELEMETRY",
      status: "VERIFIED",
      detail: "38.4% error rate",
      incidentId,
      source: "PROMETHEUS_MCP",
      queryOrCommand: `rate(http_requests_total{status=~"5.."}[5m])`,
      rawObservation: { errorRate: 0.384 },
      timestamp: 1724500000000,
    });

    // Attacker mutates source to a spoofed server while keeping hash
    const spoofedSourceNode: EvidenceNode = {
      ...validNode,
      source: "POSTGRES_MCP" as any, // Mismatched source identity!
    };

    expect(EvidenceGraphValidator.verifyNodeHash(spoofedSourceNode)).toBe(false);
  });

  it("8. Invariant: Rejects Git Commit mismatch between Deployment and Git Bisect", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const deployNode = EvidenceGraphValidator.createNode({
      id: "node_deploy",
      label: "Deploy Commit",
      type: "DEPLOYMENT",
      status: "VERIFIED",
      detail: "Deployed 049_add_orders_user_fk.sql",
      incidentId,
      source: "GITHUB_MCP",
      rawObservation: { commitSha: "abc123456789" },
    });

    const mismatchedBisectNode = EvidenceGraphValidator.createNode({
      id: "node_bisect",
      label: "Mismatched Bisect",
      type: "BISECT",
      status: "VERIFIED",
      detail: "Isolated totally different commit",
      incidentId,
      source: "GIT_BISECT_RUNNER",
      rawObservation: { badCommitSha: "deadbeef9999", failingFile: "049_fake.sql" },
    });

    const mismatchedGraph: EvidenceGraph = {
      incidentId,
      summary: "Mismatched Commit Graph",
      nodes: [incidentNode, deployNode, mismatchedBisectNode],
      edges: [
        { from: "node_incident", to: "node_deploy", relation: "introduced_in" },
        { from: "node_deploy", to: "node_bisect", relation: "isolated_by" },
      ],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(mismatchedGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
    try {
      EvidenceGraphValidator.assertValidGraph(mismatchedGraph);
    } catch (e: any) {
      expect(e.rule).toBe("MISMATCHED_COMMIT_EVIDENCE");
    }
  });

  it("9. Invariant: Rejects incomplete regression suite (e.g. 8/12 passed)", () => {
    const incidentNode = EvidenceGraphValidator.createNode({
      id: "node_incident",
      label: "Alert",
      type: "INCIDENT",
      status: "ACTIVE",
      detail: "Checkout Outage",
      incidentId,
      source: "PROMETHEUS_MCP",
    });

    const partialSandboxNode = EvidenceGraphValidator.createNode({
      id: "node_sandbox",
      label: "Partial Sandbox",
      type: "SANDBOX",
      status: "VERIFIED",
      detail: "8/12 passed",
      incidentId,
      source: "SANDBOX_RUNTIME",
      rawObservation: { testsPassed: 8, totalTests: 12 }, // Incomplete!
    });

    const rootCauseNode = EvidenceGraphValidator.createNode({
      id: "node_root_cause",
      label: "Root Cause",
      type: "ROOT_CAUSE",
      status: "VERIFIED",
      detail: "Claiming confirmed root cause with failing tests",
      incidentId,
      source: "SANDBOX_RUNTIME",
    });

    const partialGraph: EvidenceGraph = {
      incidentId,
      summary: "Partial Regression Graph",
      nodes: [incidentNode, partialSandboxNode, rootCauseNode],
      edges: [
        { from: "node_incident", to: "node_sandbox", relation: "tested_in" },
        { from: "node_sandbox", to: "node_root_cause", relation: "confirms" },
      ],
    };

    expect(() => EvidenceGraphValidator.assertValidGraph(partialGraph)).toThrow(
      EvidenceGraphIntegrityViolation
    );
    try {
      EvidenceGraphValidator.assertValidGraph(partialGraph);
    } catch (e: any) {
      expect(e.rule).toBe("INCOMPLETE_REGRESSION_VERIFICATION");
    }
  });
});
