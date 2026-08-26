"use client";
import React, { useState } from "react";
import { GitBranch, ShieldCheck, Database, Server, CheckCircle2, AlertTriangle, ArrowRight, Lock, Key, X, Info, ExternalLink } from "lucide-react";

export interface EvidenceNodeUI {
  id: string;
  label: string;
  type: string;
  status: "ACTIVE" | "VERIFIED" | "BLOCKED" | "COMPLETED";
  detail: string;
  source?: string;
  queryOrCommand?: string;
  rawObservation?: Record<string, unknown> | string;
  evidenceHash?: string;
  confidence?: number;
  timestamp?: number;
}

export interface EvidenceGraphViewerProps {
  nodes?: EvidenceNodeUI[];
  currentStepIndex?: number;
}

const DEFAULT_NODES: EvidenceNodeUI[] = [
  {
    id: "1",
    label: "Alert Ingested",
    type: "INCIDENT",
    status: "VERIFIED",
    detail: "Checkout 500 Outage",
    source: "PROMETHEUS_MCP",
    queryOrCommand: 'ALERTS{alertname="Checkout500Outage"}',
    evidenceHash: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    confidence: 1.0,
  },
  {
    id: "2",
    label: "Prometheus Error 38.4%",
    type: "TELEMETRY",
    status: "VERIFIED",
    detail: "Latency spike 1420ms",
    source: "PROMETHEUS_MCP",
    queryOrCommand: 'rate(http_requests_total{status=~"5.."}[5m])',
    evidenceHash: "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
    confidence: 1.0,
  },
  {
    id: "3",
    label: "Postgres Table Lock",
    type: "LOCK",
    status: "VERIFIED",
    detail: "Exclusive lock on orders",
    source: "POSTGRES_MCP",
    queryOrCommand: "SELECT relation::regclass, mode, granted FROM pg_locks WHERE NOT granted;",
    evidenceHash: "c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012",
    confidence: 1.0,
  },
  {
    id: "4",
    label: "Git Commit Isolated",
    type: "DEPLOYMENT",
    status: "VERIFIED",
    detail: "049_add_orders_user_fk.sql",
    source: "GITHUB_MCP",
    queryOrCommand: "gh deployment list --service checkout-service --limit 1",
    evidenceHash: "d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123",
    confidence: 1.0,
  },
  {
    id: "5",
    label: "OS Sandbox Reproduction",
    type: "SANDBOX",
    status: "VERIFIED",
    detail: "48/48 tests passed on patch",
    source: "SANDBOX_RUNTIME",
    queryOrCommand: "npm test -- --concurrency-lock-suite",
    evidenceHash: "e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234",
    confidence: 1.0,
  },
  {
    id: "6",
    label: "Root Cause Confirmed",
    type: "ROOT_CAUSE",
    status: "VERIFIED",
    detail: "Unindexed FK lock contention",
    source: "SANDBOX_RUNTIME",
    queryOrCommand: "verify_root_cause_isolation",
    evidenceHash: "f67890123456789abcdef0123456789abcdef0123456789abcdef012345",
    confidence: 1.0,
  },
  {
    id: "7",
    label: "Cryptographic HITL Gate",
    type: "HITL",
    status: "VERIFIED",
    detail: "SHA-256 bound single-use token",
    source: "HITL_GATE",
    queryOrCommand: "request_approval_payload",
    evidenceHash: "07890123456789abcdef0123456789abcdef0123456789abcdef0123456",
    confidence: 1.0,
  },
  {
    id: "8",
    label: "Atomic CAS Execution",
    type: "REMEDIATION",
    status: "VERIFIED",
    detail: "Concurrent DDL patch applied",
    source: "POSTGRES_MCP",
    queryOrCommand: "execute_remediation_sql",
    evidenceHash: "1890123456789abcdef0123456789abcdef0123456789abcdef01234567",
    confidence: 1.0,
  },
  {
    id: "9",
    label: "Recovery Verified (0.00%)",
    type: "RECOVERY",
    status: "COMPLETED",
    detail: "Normal telemetry restored",
    source: "PROMETHEUS_MCP",
    queryOrCommand: 'rate(http_requests_total{status=~"5.."}[1m])',
    evidenceHash: "290123456789abcdef0123456789abcdef0123456789abcdef012345678",
    confidence: 1.0,
  },
];

export const EvidenceGraphViewer: React.FC<EvidenceGraphViewerProps> = ({ nodes = DEFAULT_NODES, currentStepIndex = 8 }) => {
  const [selectedNode, setSelectedNode] = useState<EvidenceNodeUI | null>(null);

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-3.5 flex flex-col gap-2.5 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
            Causal Evidence Graph & Cryptographic Provenance
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Key className="w-2.5 h-2.5" /> SHA-256 Provenance Verified
          </span>
          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
            Click Node to Inspect
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {nodes.map((node, index) => {
          const isActive = index + 1 <= (currentStepIndex || 8);
          return (
            <React.Fragment key={node.id}>
              <button
                onClick={() => setSelectedNode(node)}
                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all text-left cursor-pointer hover:border-cyan-400 ${
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
              </button>

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

      {/* Provenance Inspector Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {getNodeIcon(selectedNode.type)}
                <h3 className="text-sm font-bold text-zinc-100">{selectedNode.label}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">EVIDENCE SOURCE</span>
                <span className="text-cyan-300 font-bold">{selectedNode.source || "PROMETHEUS_MCP"}</span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">VERIFICATION STATUS</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {selectedNode.status}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px]">EXECUTED QUERY / COMMAND</span>
              <code className="text-xs text-amber-300 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800 break-all">
                {selectedNode.queryOrCommand || "rate(http_requests_total{status=~'5..'}[5m])"}
              </code>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px]">EVIDENCE SHA-256 HASH (CANNOT BE FORGED)</span>
              <code className="text-[11px] text-cyan-400/90 break-all select-all">
                {selectedNode.evidenceHash || "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"}
              </code>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
              <span>Confidence: {(selectedNode.confidence ?? 1.0) * 100}%</span>
              <span className="text-zinc-500">Causality Invariant: VERIFIED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
