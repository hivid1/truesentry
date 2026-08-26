"use client";
import React from "react";
import { Shield, Zap, Activity, Cpu, ShieldCheck } from "lucide-react";

interface TopNavProps {
  sessionId: string;
  incidentTitle: string;
  severity: string;
  isConnected: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  sessionId,
  incidentTitle,
  severity,
  isConnected,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-6 flex items-center justify-between select-none z-30 sticky top-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-white">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-sm font-mono font-bold tracking-wider uppercase">
            TrueSentry <span className="text-zinc-500 text-xs font-normal">v1.0 (TrueForge Harness)</span>
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400 font-medium">{incidentTitle}</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
              severity === "CRITICAL"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {severity}
          </span>
        </div>
      </div>

      {/* Central Core Thesis Banner */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
        <span>THE AGENT CAN BE WRONG. THE EXECUTION BOUNDARY CANNOT.</span>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full hidden sm:inline">
          Safety Benchmark: 100/100 (7 Threat Vectors)
        </span>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_#10B981]" : "bg-rose-500"}`} />
          <span className={isConnected ? "text-emerald-400" : "text-rose-500"}>
            {isConnected ? "SSE Stream Connected" : "Connecting..."}
          </span>
        </div>
      </div>
    </header>
  );
};
