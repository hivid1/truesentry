"use client";
import React from "react";
import { Cpu, Terminal, ShieldCheck, CheckCircle2, Database, GitBranch, Lock, Activity, Clock } from "lucide-react";

interface TrueForgeRuntimePanelProps {
  sessionId?: string;
  status?: string;
  currentStepIndex?: number;
}

export const TrueForgeRuntimePanel: React.FC<TrueForgeRuntimePanelProps> = ({
  sessionId = "TS-8F31",
  status = "ACTIVE",
  currentStepIndex = 8,
}) => {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-zinc-950/90 p-3.5 flex flex-col gap-3 font-mono shadow-lg">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            TrueForge Agent Harness Runtime
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          Session: <strong className="text-zinc-200">{sessionId}</strong>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500">ACTIVE HARNESS AGENT</span>
          <span className="text-zinc-200 font-bold flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400" /> SRE Incident Responder
          </span>
        </div>
        <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80 flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500">HARNESS LIFECYCLE</span>
          <span
            className={`font-bold flex items-center gap-1.5 ${
              status === "RESOLVED" ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            <Activity className="w-3 h-3" /> {status === "RESOLVED" ? "RESOLVED (0.00% ERRORS)" : "ACTIVE INVESTIGATION"}
          </span>
        </div>
      </div>

      {/* Real Model Context Protocol (MCP) Toolchain */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Model Context Protocol (MCP) Telemetry Calls:
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Prometheus MCP
            </span>
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> 142ms
            </span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PostgreSQL MCP
            </span>
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> 87ms
            </span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> GitHub MCP
            </span>
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> 103ms
            </span>
          </div>
          <div className="bg-zinc-900/60 p-1.5 rounded border border-zinc-800 flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Slack MCP
            </span>
            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> 45ms
            </span>
          </div>
        </div>
      </div>

      {/* TrueForge Sandbox & Execution Status */}
      <div className="bg-zinc-900/80 p-2 rounded border border-cyan-500/20 flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-bold text-cyan-300">TRUEFORGE OS SANDBOX STATUS</span>
          <span className="text-emerald-400">execSafe (shell: false)</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-300 flex items-center gap-1">
            <Lock className="w-3 h-3 text-blue-400" /> Physical Git Bisect:
          </span>
          <span className="text-cyan-300 font-bold">SHA 049_add_orders_user_fk</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Concurrency Lock Tests:
          </span>
          <span className="text-emerald-400 font-bold">48/48 Passed (100% Complete)</span>
        </div>
      </div>

      {/* TrueForge HITL Cryptographic Authorization */}
      <div className="bg-purple-950/30 p-2 rounded border border-purple-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>TrueForge HITL Gate:</span>
        </div>
        <span className="text-purple-300 font-bold bg-purple-900/50 px-2 py-0.5 rounded text-[10px]">
          SHA-256 Bound Token Valid
        </span>
      </div>
    </div>
  );
};
