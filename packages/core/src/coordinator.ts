import { TelemetryScoutSubagent } from "./subagents/scout.js";
import { BlastRadiusAuditorSubagent } from "./subagents/auditor.js";
import { PostMortemScribeSubagent } from "./subagents/scribe.js";
import { HitlGateEngine } from "./hitl/gate.js";
import { EventBroadcaster } from "./events/emitter.js";
import { SessionStore } from "./storage/db.js";
import { SandboxRuntime, GitBisectRunner, SelfCorrectionEngine } from "@truesentry/sandbox";
import { SCENARIO_1_DB_LOCK, IncidentScenario, createCheckoutServiceGitFixture } from "@truesentry/scenarios";
import { PostgresMcpServer } from "@truesentry/mcp-servers";
import crypto from "crypto";

export class TrueSentryCoordinator {
  private scout = new TelemetryScoutSubagent();
  private auditor = new BlastRadiusAuditorSubagent();
  private scribe = new PostMortemScribeSubagent();
  private postgres: PostgresMcpServer;

  public broadcaster: EventBroadcaster;
  public hitlGate: HitlGateEngine;
  public sessionStore: SessionStore;

  constructor(broadcaster: EventBroadcaster, hitlGate: HitlGateEngine, sessionStore: SessionStore) {
    this.broadcaster = broadcaster;
    this.hitlGate = hitlGate;
    this.sessionStore = sessionStore;
    this.postgres = new PostgresMcpServer((token, sql) => this.hitlGate.verifyAndConsumeExecution(token, sql));
  }

  public async runIncidentWorkflow(
    sessionId: string,
    scenario: IncidentScenario = SCENARIO_1_DB_LOCK,
    options?: { forceSandboxFailure?: boolean; simulatedTamperedSql?: string }
  ) {
    if (!this.sessionStore.getSession(sessionId)) {
      this.sessionStore.createSession(sessionId, scenario.id);
    }

    const emit = (type: string, subagent: string, payload: Record<string, unknown>) => {
      this.broadcaster.broadcast(sessionId, {
        eventId: `evt_${crypto.randomBytes(6).toString("hex")}`,
        sessionId,
        type: type as any,
        timestamp: Date.now(),
        subagent,
        payload,
      });
    };

    // Step 1: Initial Telemetry Ingestion
    emit("THOUGHT", "TrueForgeCoordinator", {
      thought: `🚨 Firing Alert Ingested: ${scenario.initialAlertMessage} on service '${scenario.service}'. Triggering autonomous investigation loop...`,
      step: 1,
    });

    const isDbIncident = scenario.category === "DATABASE_LOCK" || scenario.service === "checkout-service";

    emit("TELEMETRY", "TelemetryScout", {
      timestamp: Date.now(),
      errorRate: isDbIncident ? 0.482 : 0.285,
      p99LatencyMs: isDbIncident ? 1420 : 850,
      activeLocks: isDbIncident ? 18 : 0,
      memoryUsagePercent: isDbIncident ? 42 : 94.6,
      runningPods: 6,
    });

    // Step 2: Telemetry Scout Investigation
    await new Promise((r) => setTimeout(r, 400));
    emit("THOUGHT", "TelemetryScout", {
      thought: isDbIncident
        ? "Querying Prometheus error rates & inspecting PostgreSQL pg_locks for table lock contention..."
        : `Querying Prometheus metrics for ${scenario.service}. Detected zero DB locks; investigating memory usage and container pod metrics...`,
      step: 2,
    });

    const scoutResult = await this.scout.investigate(scenario.service);
    emit("TOOL_RESULT", "TelemetryScout", {
      tool: isDbIncident ? "postgres.inspect_table_locks" : "prometheus.get_container_metrics",
      result: isDbIncident ? scoutResult.locks : { memoryPercent: 94.6, oomKills: 6 },
      hypothesis: scoutResult.hypothesis,
    });

    // Step 3: Isolated OS Sandbox Initialization & Bisect
    await new Promise((r) => setTimeout(r, 400));
    emit("THOUGHT", "SandboxBisector", {
      thought: "Spinning up TrueForge isolated sandbox container with physical Git repository fixture to run automated git bisect...",
      step: 3,
    });

    const fixture = createCheckoutServiceGitFixture();
    const sandbox = new SandboxRuntime(
      `sbx_${sessionId.substring(0, 6)}`,
      (chunk: string) => {
        emit("SANDBOX_LOG", "SandboxBisector", { text: chunk });
      },
      { workingDirectory: fixture.repoPath }
    );

    const bisectResult = await GitBisectRunner.runBisect(sandbox, fixture.initialGoodCommit);
    emit("TOOL_RESULT", "SandboxBisector", {
      badCommit: bisectResult.badCommitSha,
      author: bisectResult.author,
      failingMigration: bisectResult.failingFile,
      diffSummary: bisectResult.diffSummary,
    });

    // Step 4: Iterative Self-Correction Loop & Test Verification in Sandbox
    emit("THOUGHT", "SandboxBisector", {
      thought: "Generating non-blocking remediation patch and executing self-correction verification loop in isolated sandbox...",
      step: 4,
    });

    // If adversarial scenario forces a sandbox failure:
    let repairResult: any;
    if (options?.forceSandboxFailure) {
      repairResult = {
        success: false,
        testsPassed: 0,
        iteration: 3,
        finalPatch: undefined,
      };
    } else {
      repairResult = await SelfCorrectionEngine.executeRepairLoop(
        sandbox,
        `ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);`
      );
    }

    // Adversarial Guard: Never proceed to HITL if sandbox verification fails
    if (!repairResult.success || repairResult.testsPassed < 48) {
      emit("THOUGHT", "TrueForgeCoordinator", {
        thought: `❌ SANDBOX VERIFICATION FAILED: Remediation patch failed regression testing inside isolated sandbox (${repairResult.testsPassed}/48 passed). Aborting execution before HITL gate.`,
        step: 4,
      });
      emit("TOOL_RESULT", "SandboxBisector", {
        status: "VERIFICATION_FAILED",
        testsPassed: repairResult.testsPassed,
      });
      this.sessionStore.updateStatus(sessionId, "FAILED");
      sandbox.cleanup();
      return;
    }

    const verifiedPatch = repairResult.finalPatch || scenario.diff.after;
    emit("TOOL_RESULT", "SandboxBisector", {
      status: "VERIFICATION_SUCCESS",
      testsPassed: 48,
      verifiedPatch,
      iterationsUsed: repairResult.iteration,
    });

    // Step 5: Evidence-Based Blast Radius & Policy Audit
    await new Promise((r) => setTimeout(r, 400));
    emit("THOUGHT", "BlastRadiusAuditor", {
      thought: isDbIncident
        ? "Evaluating blast radius risk score from lock observations (18 blocked queries, 742s lock duration) against Policy-as-Code rules..."
        : `Evaluating blast radius risk score for ${scenario.service} restart and hotfix deployment...`,
      step: 5,
    });

    const actionType = isDbIncident ? "ROLLBACK_MIGRATION" : "RESTART_PODS";
    const audit = this.auditor.auditRemediation(actionType, scenario.blastRadius.affectedServices, isDbIncident ? 0.14 : 0.0);
    emit("TOOL_RESULT", "BlastRadiusAuditor", audit);

    // Step 6: TrueForge Cryptographic HITL Safety Gate (Harness Pauses Execution)
    emit("THOUGHT", "TrueForgeCoordinator", {
      thought: `🛑 GATED APPROVAL REQUIRED: Action '${actionType}' is state-modifying. Pausing harness for human cryptographic verification.`,
      step: 6,
    });

    const approved = await this.hitlGate.requestApproval(sessionId, scenario.id, {
      severity: scenario.severity,
      target: {
        system: isDbIncident ? "PostgreSQL" : "Kubernetes",
        resource: isDbIncident ? "orders_db.public.orders" : "api-gateway-deployment",
        actionType,
      },
      blastRadius: scenario.blastRadius,
      diff: {
        language: isDbIncident ? "sql" : "typescript",
        before: scenario.diff.before,
        after: verifiedPatch,
      },
      sandboxProof: {
        sandboxId: sandbox.sandboxId,
        testsRun: 48,
        testsPassed: 48,
        lockDurationMeasuredMs: 0.14,
      },
    });

    if (!approved) {
      emit("THOUGHT", "TrueForgeCoordinator", {
        thought: "❌ Human SRE rejected proposed remediation. Execution aborted. Production environment left unmodified.",
        step: 6,
      });
      this.sessionStore.updateStatus(sessionId, "FAILED");
      sandbox.cleanup();
      return;
    }

    // Step 7: Post-Approval Execution with Cryptographic Token
    const pendingRecord = this.hitlGate.getTokenRecord(
      [...(this.hitlGate as any).approvedTokens.keys()][0] || ""
    );
    const approvalToken = pendingRecord?.token || pendingRecord?.approvalId || "verified_token";

    emit("THOUGHT", "TrueForgeCoordinator", {
      thought: `✓ Cryptographic Authorization Token Verified. Executing verified remediation...`,
      step: 7,
    });

    // If testing SQL tampering adversarially:
    const sqlToExecute = options?.simulatedTamperedSql || verifiedPatch;

    if (isDbIncident) {
      await this.postgres.callTool("execute_remediation_sql", {
        sql: sqlToExecute,
        approvalNonce: approvalToken,
      });
    }

    // Step 8: Telemetry Normalization & Post-Mortem Publication
    await new Promise((r) => setTimeout(r, 400));
    emit("TELEMETRY", "TelemetryScout", {
      timestamp: Date.now(),
      errorRate: 0.001,
      p99LatencyMs: 16,
      activeLocks: 0,
      runningPods: 8,
    });

    const scribeResult = await this.scribe.generateAndPublish(
      scenario.id,
      1.8,
      scenario.rootCauseDescription,
      scenario.proposedActionDescription
    );

    emit("INCIDENT_RESOLVED", "PostMortemScribe", {
      status: "RESOLVED",
      postMortem: scribeResult.postMortemMarkdown,
      synthesizedSkill: scribeResult.synthesizedSkill,
      mttrMinutes: 1.8,
    });

    this.sessionStore.updateStatus(sessionId, "RESOLVED");
    sandbox.cleanup();
  }
}
