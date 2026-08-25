"use client";
import React from "react";
import { GitFork, Search, Wrench, Shield, FileText } from "lucide-react";

export const SwarmGraph: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-2 font-semibold uppercase">
          <GitFork className="w-3.5 h-3.5 text-purple-400" />
          TrueForge Subagent Swarm Topology
        </span>
        <span className="text-[10px] text-zinc-500">4 Active Workers</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
        {/* Node 1: Scout */}
        <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 flex flex-col items-center gap-1">
          <Search className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-300">Scout</span>
          <span className="text-[9px] text-zinc-400">MCP Telemetry</span>
        </div>

        {/* Node 2: Bisector */}
        <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5 flex flex-col items-center gap-1">
          <Wrench className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-purple-300">Bisector</span>
          <span className="text-[9px] text-zinc-400">Sandbox Repro</span>
        </div>

        {/* Node 3: Auditor */}
        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col items-center gap-1">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-300">Auditor</span>
          <span className="text-[9px] text-zinc-400">Blast Radius</span>
        </div>

        {/* Node 4: Scribe */}
        <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center gap-1">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-emerald-300">Scribe</span>
          <span className="text-[9px] text-zinc-400">Post-Mortem</span>
        </div>
      </div>
    </div>
  );
};
