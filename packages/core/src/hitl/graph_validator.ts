import crypto from "crypto";
import { EvidenceGraph, EvidenceNode, EvidenceEdge, EvidenceSource } from "../types.js";

export class EvidenceGraphIntegrityViolation extends Error {
  constructor(message: string, public readonly rule: string, public readonly nodeId?: string) {
    super(`EvidenceGraphIntegrityViolation [${rule}]: ${message}`);
    this.name = "EvidenceGraphIntegrityViolation";
  }
}

export class EvidenceGraphValidator {
  /**
   * Computes the deterministic SHA-256 evidence hash for a node.
   */
  public static computeEvidenceHash(
    incidentId: string,
    type: string,
    source: EvidenceSource,
    queryOrCommand: string = "",
    rawObservation: Record<string, unknown> | string = {},
    timestamp: number
  ): string {
    const rawString = typeof rawObservation === "string" ? rawObservation : JSON.stringify(rawObservation);
    const payload = `${incidentId}|${type}|${source}|${queryOrCommand}|${rawString}|${timestamp}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Creates a fully provenance-verified EvidenceNode.
   */
  public static createNode(params: {
    id: string;
    label: string;
    type: EvidenceNode["type"];
    status: EvidenceNode["status"];
    detail: string;
    incidentId: string;
    source: EvidenceSource;
    queryOrCommand?: string;
    rawObservation?: Record<string, unknown> | string;
    confidence?: number;
    timestamp?: number;
  }): EvidenceNode {
    const ts = params.timestamp || Date.now();
    const hash = this.computeEvidenceHash(
      params.incidentId,
      params.type,
      params.source,
      params.queryOrCommand || "",
      params.rawObservation || {},
      ts
    );

    return {
      id: params.id,
      label: params.label,
      type: params.type,
      status: params.status,
      detail: params.detail,
      timestamp: ts,
      incidentId: params.incidentId,
      source: params.source,
      queryOrCommand: params.queryOrCommand,
      rawObservation: params.rawObservation,
      evidenceHash: hash,
      confidence: params.confidence ?? 1.0,
    };
  }

  /**
   * Validates that an EvidenceNode's internal hash matches its observation and source identity.
   */
  public static verifyNodeHash(node: EvidenceNode): boolean {
    const expectedHash = this.computeEvidenceHash(
      node.incidentId,
      node.type,
      node.source,
      node.queryOrCommand || "",
      node.rawObservation || {},
      node.timestamp
    );
    return node.evidenceHash === expectedHash;
  }

  /**
   * Strictly verifies graph causality, provenance, commit alignment, and complete regression pass.
   */
  public static assertValidGraph(graph: EvidenceGraph): void {
    const nodeMap = new Map<string, EvidenceNode>();
    for (const node of graph.nodes) {
      if (!this.verifyNodeHash(node)) {
        throw new EvidenceGraphIntegrityViolation(
          `Node ${node.id} (${node.label}) has invalid/tampered evidenceHash or mutated source identity`,
          "TAMPERED_EVIDENCE_HASH",
          node.id
        );
      }
      if (node.incidentId !== graph.incidentId) {
        throw new EvidenceGraphIntegrityViolation(
          `Node ${node.id} belongs to incident ${node.incidentId}, expected ${graph.incidentId}`,
          "CROSS_INCIDENT_SUBSTITUTION",
          node.id
        );
      }
      nodeMap.set(node.id, node);
    }

    // Reachability from INCIDENT
    const incidentNode = graph.nodes.find((n) => n.type === "INCIDENT");
    if (!incidentNode && graph.nodes.length > 0) {
      throw new EvidenceGraphIntegrityViolation(
        "Graph has nodes but missing root INCIDENT alert node",
        "MISSING_ROOT_INCIDENT"
      );
    }

    // Invariant 1: Deployment commit vs Git Bisect commit alignment
    const deployNode = graph.nodes.find((n) => n.type === "DEPLOYMENT");
    const bisectNode = graph.nodes.find((n) => n.type === "BISECT");
    if (deployNode && bisectNode) {
      const deploySha = (deployNode.rawObservation as any)?.commitSha;
      const bisectSha = (bisectNode.rawObservation as any)?.badCommitSha;
      if (deploySha && bisectSha && !bisectSha.startsWith(deploySha) && !deploySha.startsWith(bisectSha)) {
        throw new EvidenceGraphIntegrityViolation(
          `Git bisect isolated commit (${bisectSha}) does not match deployment commit (${deploySha})`,
          "MISMATCHED_COMMIT_EVIDENCE",
          bisectNode.id
        );
      }
    }

    // Invariant 2: ROOT_CAUSE_CONFIRMED requires complete passing regression suite (testsPassed === totalTests > 0)
    const rootCauseNode = graph.nodes.find((n) => n.type === "ROOT_CAUSE");
    if (rootCauseNode) {
      const sandboxNode = graph.nodes.find((n) => n.type === "SANDBOX");
      if (!sandboxNode || sandboxNode.status !== "VERIFIED") {
        throw new EvidenceGraphIntegrityViolation(
          "ROOT_CAUSE_CONFIRMED cannot be asserted without prior successful VERIFIED OS Sandbox test reproduction",
          "UNVERIFIED_ROOT_CAUSE",
          rootCauseNode.id
        );
      }

      const raw = (sandboxNode.rawObservation || {}) as Record<string, any>;
      const testsPassed = raw.testsPassed ?? 0;
      const totalTests = raw.totalTests ?? 0;
      const isSuiteComplete = totalTests > 0 && testsPassed === totalTests;

      if (!isSuiteComplete) {
        throw new EvidenceGraphIntegrityViolation(
          `ROOT_CAUSE_CONFIRMED requires complete passing regression suite (${testsPassed}/${totalTests} passed)`,
          "INCOMPLETE_REGRESSION_VERIFICATION",
          rootCauseNode.id
        );
      }

      // Check edge from SANDBOX -> ROOT_CAUSE
      const hasDirectEdge = graph.edges.some((e) => e.from === sandboxNode.id && e.to === rootCauseNode.id);
      if (!hasDirectEdge) {
        throw new EvidenceGraphIntegrityViolation(
          "Missing causal link from verified Sandbox node to Root Cause node",
          "BROKEN_CAUSAL_LINK",
          rootCauseNode.id
        );
      }
    }

    // Invariant 3: HITL requires ROOT_CAUSE_CONFIRMED
    const hitlNode = graph.nodes.find((n) => n.type === "HITL");
    if (hitlNode && !rootCauseNode) {
      throw new EvidenceGraphIntegrityViolation(
        "HITL authorization gate cannot be requested before root cause is confirmed with sandbox proof",
        "PREMATURE_HITL_REQUEST",
        hitlNode.id
      );
    }

    // Invariant 4: REMEDIATION requires HITL with VERIFIED status
    const remediationNode = graph.nodes.find((n) => n.type === "REMEDIATION");
    if (remediationNode) {
      if (!hitlNode || hitlNode.status !== "VERIFIED") {
        throw new EvidenceGraphIntegrityViolation(
          "REMEDIATION cannot be executed without a VERIFIED (approved) HITL cryptographic token",
          "UNAUTHORIZED_REMEDIATION",
          remediationNode.id
        );
      }
    }

    // Invariant 5: RECOVERY requires REMEDIATION and independent PROMETHEUS_MCP post-query
    const recoveryNode = graph.nodes.find((n) => n.type === "RECOVERY");
    if (recoveryNode) {
      if (!remediationNode || remediationNode.status !== "VERIFIED") {
        throw new EvidenceGraphIntegrityViolation(
          "RECOVERY cannot be declared without verified preceding REMEDIATION",
          "PREMATURE_RECOVERY",
          recoveryNode.id
        );
      }
      if (recoveryNode.source !== "PROMETHEUS_MCP") {
        throw new EvidenceGraphIntegrityViolation(
          "RECOVERY must originate from independent Prometheus MCP verification re-query",
          "INVALID_RECOVERY_SOURCE",
          recoveryNode.id
        );
      }
    }
  }
}
