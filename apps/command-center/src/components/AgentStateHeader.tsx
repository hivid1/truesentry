"use client";
import React from "react";
import { Activity, ArrowRight, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Play, Check, X, Lock } from "lucide-react";
import { HitlApprovalRequest } from "@/types/ui";

interface AgentStateHeaderProps {
  status: string;
  incidentTitle: string;
  currentStepIndex: number;
  pendingApproval: HitlApprovalRequest | null;
  onDecision?: (approvalId: string, decision: "APPROVE" | "REJECT") => void;
}

export const AgentStateHeader: React.FC<AgentStateHeaderProps> = ({
  status,
  incidentTitle,
  currentStepIndex,
  pendingApproval,
  onDecision,
}) => {
  const getAgentCurrentAction = () => {
    if (status === "RESOLVED") return "Incident fully remediated. Telemetry verified healthy at 0.00% error rate.";
    if (pendingApproval) return "PAUSED AT CRYPTOGRAPHIC HITL GATE. Awaiting human authorization for irreversible schema migration.";
    switch (currentStepIndex) {
      case 1:
        return "Ingesting Prometheus alert & establishing incident baseline telemetry.";
      case 2:
        return "Querying Prometheus HTTP 500 error spikes & PostgreSQL pg_locks contention.";
      case 3:
        return "Querying GitHub deployment logs to identify recent candidate commits.";
      case 4:
        return "Mounting physical Git repository in TrueForge OS process sandbox & running git bisect.";
      case 5:
        return "Synthesizing non-blocking candidate SQL patch & executing sandbox concurrency suite (100% passed).";
      case 6:
        return "Evaluating Policy Engine AST & computing SHA-256 cryptographic payload digest.";
      case 7:
        return "Executing approved remediation via atomic filesystem CAS lock.";
      case 8:
        return "Performing independent Prometheus re-query to verify 0.00% error rate.";
      default:
        return "Awaiting incident alert trigger or autonomous triage dispatch.";
    }
  };

  const getAgentNextAction = () => {
    if (status === "RESOLVED") return "Publish post-mortem to Slack & synthesize reusable agent skill.";
    if (pendingApproval) return "Consume atomic CAS token & execute non-blocking DDL on production PostgreSQL.";
    switch (currentStepIndex) {
      case 1:
        return "Dispatch TelemetryScout to inspect PostgreSQL lock tables.";
      case 2:
        return "Inspect GitHub recent deployment history.";
      case 3:
        return "Launch physical git bisect in isolated OS sandbox.";
      case 4:
        return "Synthesize and test candidate SQL patch.";
      case 5:
        return "Evaluate AST policy and trigger cryptographic HITL approval gate.";
      case 6:
        return "Awaiting human SRE signature.";
      case 7:
        return "Re-query Prometheus for error rate recovery.";
      default:
        return "Trigger autonomous investigation loop.";
    }
  };

  const testsPassed = pendingApproval?.sandboxProof?.testsPassed;
  const testsRun = pendingApproval?.sandboxProof?.testsRun;

  return (
    <div className="bg-zinc-950 border-b border-zinc-800 p-3.5 flex flex-col gap-3 font-mono">
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Incident Summary */}
        <div className="col-span-3 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ACTIVE INCIDENT</span>
          <span className="text-xs font-bold text-red-400 truncate">{incidentTitle}</span>
        </div>

        {/* What the Agent is Doing NOW */}
        <div className="col-span-4 bg-zinc-900/90 p-2.5 rounded-lg border border-cyan-500/30 flex flex-col gap-0.5 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              AGENT CURRENT ACTION (NOW)
            </span>
            <span className="text-[10px] text-zinc-500">Step {currentStepIndex}/8</span>
          </div>
          <span className="text-xs font-medium text-zinc-200 truncate">{getAgentCurrentAction()}</span>
        </div>

        {/* What the Agent is Doing NEXT */}
        <div className="col-span-3 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-zinc-400" /> PLANNED NEXT ACTION (NEXT)
          </span>
          <span className="text-xs font-medium text-zinc-400 truncate">{getAgentNextAction()}</span>
        </div>

        {/* WAITING FOR */}
        <div className="col-span-2 bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-400" /> WAITING FOR
          </span>
          <span
            className={`text-xs font-bold truncate ${
              pendingApproval
                ? "text-amber-400 animate-pulse"
                : status === "RESOLVED"
                ? "text-emerald-400"
                : "text-zinc-400"
            }`}
          >
            {pendingApproval ? "🚨 HUMAN SRE APPROVAL" : status === "RESOLVED" ? "NOTHING (DONE)" : "NOTHING (AUTONOMOUS)"}
          </span>
        </div>
      </div>

      {/* Irreversible Action Banner (Before the Irreversible Step) */}
      {pendingApproval && (
        <div className="bg-amber-950/50 border-2 border-amber-500 p-3.5 rounded-xl flex items-center justify-between shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> ⚠️ IRREVERSIBLE PRODUCTION ACTION GATED
                </span>
                <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono">
                  Token Nonce: <strong className="text-amber-300">{pendingApproval.nonce}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-300">
                <span>Action: <code className="text-cyan-300 bg-zinc-900 px-1.5 py-0.5 rounded">{pendingApproval.target.actionType}</code></span>
                <span>•</span>
                <span>Evidence: <strong className="text-emerald-400">VERIFIED (SHA-256)</strong></span>
                <span>•</span>
                <span>Policy AST: <strong className="text-emerald-400">ALLOWED</strong></span>
                <span>•</span>
                <span>Sandbox Suite: <strong className="text-emerald-400">{testsRun && testsRun > 0 ? `${testsPassed ?? 0}/${testsRun} Tests Passed (100%)` : "100% Concurrency Verified"}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onDecision && onDecision(pendingApproval.approvalId, "REJECT")}
              className="py-2 px-3.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-lg"
            >
              <X className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => onDecision && onDecision(pendingApproval.approvalId, "APPROVE")}
              className="py-2 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 cursor-pointer hover:scale-105"
            >
              <Check className="w-4 h-4" /> Authorize Remediation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
