"use client";
import React from "react";
import { GitBranch, ShieldCheck, Database, Server, CheckCircle2, AlertTriangle, ArrowRight, Lock } from "lucide-react";

export interface EvidenceNodeUI {
  id: string;
  label: string;
  type: string;
  status: "ACTIVE" | "VERIFIED" | "BLOCKED" | "COMPLETED";
  detail: string;
}

export interface EvidenceGraphViewerProps {
  nodes?: EvidenceNodeUI[];
  currentStepIndex?: number;
}

const DEFAULT_NODES: EvidenceNodeUI[] = [
  { id: "1", label: "Alert Ingested", type: "INCIDENT", status: "VERIFIED", detail: "Checkout 500 Outage" },
  { id: "2", label: "Prometheus Error 38.4%", type: "TELEMETRY", status: "VERIFIED", detail: "Latency spike 1420ms" },
  { id: "3", label: "Postgres Table Lock", type: "LOCK", status: "VERIFIED", detail: "Exclusive lock on orders" },
  { id: "4", label: "Git Commit Isolated", type: "DEPLOYMENT", status: "VERIFIED", detail: "049_add_orders_user_fk.sql" },
  { id: "5", label: "OS Sandbox Reproduction", type: "SANDBOX", status: "VERIFIED", detail: "48/48 tests passed on patch" },
  { id: "6", label: "Root Cause Confirmed", type: "ROOT_CAUSE", status: "VERIFIED", detail: "Unindexed FK lock contention" },
  { id: "7", label: "Cryptographic HITL Gate", type: "HITL", status: "VERIFIED", detail: "SHA-256 bound single-use token" },
  { id: "8", label: "Atomic CAS Execution", type: "REMEDIATION", status: "VERIFIED", detail: "Concurrent DDL patch applied" },
  { id: "9", label: "Recovery Verified (0.00%)", type: "RECOVERY", status: "COMPLETED", detail: "Normal telemetry restored" },
];

export const EvidenceGraphViewer: React.FC<EvidenceGraphViewerProps> = ({ nodes = DEFAULT_NODES, currentStepIndex = 8 }) => {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case "INCIDENT":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case "TELEMETRY":
        return <Server className="w-3.5 h-3.5 text-rose-400" />;
      case "LOCK":
        return <Database className="w-3.5 h-3.5 text-orange-400" />;
      case "DEPLOYMENT":
      case "BISECT":
        return <GitBranch className="w-3.5 h-3.5 text-cyan-400" />;
      case "SANDBOX":
        return <Lock className="w-3.5 h-3.5 text-blue-400" />;
      case "HITL":
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />;
      case "REMEDIATION":
      case "RECOVERY":
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
            Causal Evidence Graph
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
          Autonomous Proof Chain
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {nodes.map((node, index) => {
          const isActive = index + 1 <= (currentStepIndex || 8);
          return (
            <React.Fragment key={node.id}>
              <div
                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  isActive
                    ? "bg-zinc-800/80 border-cyan-500/40 text-zinc-200 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                    : "bg-zinc-950/40 border-zinc-800/60 text-zinc-600 opacity-50"
                }`}
              >
                {getNodeIcon(node.type)}
                <div className="flex flex-col">
                  <span className="font-semibold text-[11px] whitespace-nowrap">{node.label}</span>
                  <span className="text-[9px] text-zinc-500 whitespace-nowrap">{node.detail}</span>
                </div>
              </div>

              {index < nodes.length - 1 && (
                <ArrowRight
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                    isActive ? "text-cyan-400/70" : "text-zinc-700"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
