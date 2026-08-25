"use client";
import React from "react";
import { CheckCircle2, AlertTriangle, Play, ShieldAlert, Cpu, Terminal, Database, GitBranch, ArrowDown } from "lucide-react";

export interface TimelineStep {
  id: string;
  label: string;
  detail: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "PAUSED_GATE";
  tool?: string;
  timestamp?: string;
}

interface IncidentTimelineProps {
  currentStepIndex: number;
  isPausedAtGate: boolean;
  isResolved: boolean;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({
  currentStepIndex,
  isPausedAtGate,
  isResolved,
}) => {
  const steps: TimelineStep[] = [
    {
      id: "step_1",
      label: "Critical Alert Ingestion",
      detail: "Checkout HTTP 500 spike detected (48.2%)",
      tool: "Prometheus Alertmanager",
      status: currentStepIndex >= 1 ? "COMPLETED" : "RUNNING",
    },
    {
      id: "step_2",
      label: "MCP Telemetry & Lock Inspection",
      detail: "prometheus.query + postgres.inspect_table_locks",
      tool: "MCP: Prometheus & Postgres",
      status: currentStepIndex >= 2 ? "COMPLETED" : currentStepIndex === 1 ? "RUNNING" : "PENDING",
    },
    {
      id: "step_3",
      label: "GitHub Deploy Trace",
      detail: "github.get_commit_diff traced to Deploy #4c21e90",
      tool: "MCP: GitHub",
      status: currentStepIndex >= 3 ? "COMPLETED" : currentStepIndex === 2 ? "RUNNING" : "PENDING",
    },
    {
      id: "step_4",
      label: "TrueForge Sandbox Bisect",
      detail: "Automated git bisect isolated Migration 049",
      tool: "Isolated Sandbox Runtime",
      status: currentStepIndex >= 4 ? "COMPLETED" : currentStepIndex === 3 ? "RUNNING" : "PENDING",
    },
    {
      id: "step_5",
      label: "Blast Radius & Policy Audit",
      detail: "Risk Score: 74/100 | Zero Data Loss Verified",
      tool: "Safety Auditor Subagent",
      status: currentStepIndex >= 5 ? "COMPLETED" : currentStepIndex === 4 ? "RUNNING" : "PENDING",
    },
    {
      id: "step_6",
      label: "State-Gated Human Approval",
      detail: isPausedAtGate
        ? "🛑 HARNESS PAUSED: Waiting for SRE sign-off..."
        : isResolved
        ? "✓ SRE Authorized Execution"
        : "Pending preceding diagnostics",
      tool: "TrueForge HITL Gate",
      status: isPausedAtGate ? "PAUSED_GATE" : currentStepIndex >= 6 || isResolved ? "COMPLETED" : "PENDING",
    },
    {
      id: "step_7",
      label: "Concurrent Remediation",
      detail: isResolved ? "✓ Rollback executed & indexes verified" : "Pending approval sign-off",
      tool: "Postgres Production Execution",
      status: isResolved ? "COMPLETED" : currentStepIndex >= 7 ? "RUNNING" : "PENDING",
    },
    {
      id: "step_8",
      label: "Telemetry Normalization & Dossier",
      detail: isResolved ? "Error rate: 0.00% | Merkle Root logged" : "Waiting for recovery",
      tool: "Post-Mortem Scribe",
      status: isResolved ? "COMPLETED" : "PENDING",
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3 font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400">
        <span className="font-semibold uppercase tracking-wider flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          TrueForge Autonomous Incident Timeline
        </span>
        <span className="text-[10px] text-zinc-500">End-to-End Trace</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
        {steps.map((step, idx) => {
          let nodeColor = "bg-zinc-800 border-zinc-700 text-zinc-600";
          if (step.status === "COMPLETED") {
            nodeColor = "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_10px_#10B981]";
          } else if (step.status === "RUNNING") {
            nodeColor = "bg-cyan-500 border-cyan-400 text-black animate-ping";
          } else if (step.status === "PAUSED_GATE") {
            nodeColor = "bg-amber-500 border-amber-400 text-black animate-pulse shadow-[0_0_15px_#F59E0B]";
          }

          return (
            <div key={step.id} className="relative flex flex-col gap-0.5">
              <span
                className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 transition-all ${nodeColor}`}
              />
              <div className="flex items-center justify-between">
                <span
                  className={`font-semibold text-xs ${
                    step.status === "PAUSED_GATE"
                      ? "text-amber-400 font-bold"
                      : step.status === "COMPLETED"
                      ? "text-zinc-200"
                      : step.status === "RUNNING"
                      ? "text-cyan-300 font-bold"
                      : "text-zinc-500"
                  }`}
                >
                  {idx + 1}. {step.label}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {step.tool}
                </span>
              </div>
              <p className="text-[11px] font-sans text-zinc-400 leading-snug">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
