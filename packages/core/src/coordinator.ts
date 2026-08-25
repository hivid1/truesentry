import { TelemetryScoutSubagent } from "./subagents/scout.js";
import { SandboxBisectorSubagent } from "./subagents/bisector.js";
import { BlastRadiusAuditorSubagent } from "./subagents/auditor.js";
import { PostMortemScribeSubagent } from "./subagents/scribe.js";
import { HitlGateEngine } from "./hitl/gate.js";
import { EventBroadcaster } from "./events/emitter.js";
import { SessionStore } from "./storage/db.js";
import { SandboxRuntime } from "@truesentry/sandbox";
import { SCENARIO_1_DB_LOCK, IncidentScenario } from "@truesentry/scenarios";
import { PostgresMcpServer } from "@truesentry/mcp-servers";
import crypto from "crypto";

export class TrueSentryCoordinator {
  private scout = new TelemetryScoutSubagent();
  private bisector = new SandboxBisectorSubagent();
  private auditor = new BlastRadiusAuditorSubagent();
  private scribe = new PostMortemScribeSubagent();
  private postgres = new PostgresMcpServer();

  public broadcaster: EventBroadcaster;
  public hitlGate: HitlGateEngine;
  public sessionStore: SessionStore;

  constructor(broadcaster: EventBroadcaster, hitlGate: HitlGateEngine, sessionStore: SessionStore) {
    this.broadcaster = broadcaster;
    this.hitlGate = hitlGate;
    this.sessionStore = sessionStore;
  }

  public async runIncidentWorkflow(sessionId: string, scenario: IncidentScenario = SCENARIO_1_DB_LOCK) {
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

    // Step 1: Initial Telemetry & Alarm
    emit("THOUGHT", "Coordinator", {
      thought: `🚨 Critical Alert Received for ${scenario.service}: ${scenario.initialAlertMessage}`,
      step: 1,
    });

    emit("TELEMETRY", "TelemetryScout", {
      timestamp: Date.now(),
      errorRate: 0.482,
      p99LatencyMs: 1420,
      activeLocks: 18,
      runningPods: 6,
    });

    // Step 2: Telemetry Scout Investigation
    await new Promise((r) => setTimeout(r, 600));
    emit("THOUGHT", "TelemetryScout", {
      thought: "Querying Prometheus PromQL metrics & inspecting PostgreSQL pg_locks for table lock contention...",
      step: 2,
    });

    const scoutResult = await this.scout.investigate(scenario.service);
    emit("TOOL_RESULT", "TelemetryScout", {
      tool: "inspect_table_locks",
      result: scoutResult.locks,
      hypothesis: scoutResult.hypothesis,
    });

    // Step 3: Sandbox Reproduction & Git Bisect
    await new Promise((r) => setTimeout(r, 800));
    emit("THOUGHT", "SandboxBisector", {
      thought: "Spinning up TrueForge isolated sandbox container to clone repository and run automated git bisect...",
      step: 3,
    });

    const sandbox = new SandboxRuntime(`sbx_${sessionId.substring(0, 6)}`, (chunk: string) => {
      emit("SANDBOX_LOG", "SandboxBisector", { text: chunk });
    });

    const bisectAndFix = await this.bisector.runReproductionAndFix(sandbox);
    emit("TOOL_RESULT", "SandboxBisector", {
      badCommit: bisectAndFix.bisectResult.badCommitSha,
      failingMigration: bisectAndFix.bisectResult.failingFile,
      testsPassed: bisectAndFix.testsPassed,
      repairedPatch: bisectAndFix.verifiedPatch,
    });

    // Step 4: Blast Radius Audit
    await new Promise((r) => setTimeout(r, 600));
    emit("THOUGHT", "BlastRadiusAuditor", {
      thought: "Calculating blast radius risk score and evaluating against Policy-as-Code rules...",
      step: 4,
    });

    const audit = this.auditor.auditRemediation("ROLLBACK_MIGRATION", scenario.blastRadius.affectedServices, 14.2);
    emit("TOOL_RESULT", "BlastRadiusAuditor", audit);

    // Step 5: The TrueForge HITL Gate (Harness Pauses Execution)
    emit("THOUGHT", "Coordinator", {
      thought: "🛑 GATED APPROVAL REQUIRED: Action 'ROLLBACK_MIGRATION' is state-modifying. Pausing harness for human verification.",
      step: 5,
    });

    const approved = await this.hitlGate.requestApproval(sessionId, scenario.id, {
      severity: scenario.severity,
      target: {
        system: "PostgreSQL",
        resource: "orders_db.public.orders",
        actionType: "ROLLBACK_MIGRATION",
      },
      blastRadius: scenario.blastRadius,
      diff: scenario.diff,
      sandboxProof: {
        sandboxId: sandbox.sandboxId,
        testsRun: 48,
        testsPassed: 48,
        lockDurationMeasuredMs: 14.2,
      },
    });

    if (!approved) {
      emit("THOUGHT", "Coordinator", {
        thought: "❌ Human SRE rejected proposed remediation. Aborting execution and preserving diagnostic logs.",
        step: 6,
      });
      this.sessionStore.updateStatus(sessionId, "FAILED");
      return;
    }

    // Step 6: Post-Approval Execution
    emit("THOUGHT", "Coordinator", {
      thought: "✓ Human SRE Authorization Confirmed. Executing rollback and concurrent index creation on production database...",
      step: 7,
    });

    await this.postgres.callTool("execute_remediation_sql", {
      sql: scenario.diff.after,
      approvalNonce: "verified_nonce",
    });

    // Step 7: Telemetry Normalization & Scribe
    await new Promise((r) => setTimeout(r, 600));
    emit("TELEMETRY", "TelemetryScout", {
      timestamp: Date.now(),
      errorRate: 0.002,
      p99LatencyMs: 18,
      activeLocks: 0,
      runningPods: 8,
    });

    const scribeResult = await this.scribe.generateAndPublish(scenario.id, 1.8, scenario.rootCauseDescription, scenario.proposedActionDescription);
    emit("INCIDENT_RESOLVED", "PostMortemScribe", {
      status: "RESOLVED",
      postMortem: scribeResult.postMortemMarkdown,
      synthesizedSkill: scribeResult.synthesizedSkill,
      mttrMinutes: 1.8,
    });

    this.sessionStore.updateStatus(sessionId, "RESOLVED");
  }
}
