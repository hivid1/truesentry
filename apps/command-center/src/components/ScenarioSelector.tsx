"use client";
import React from "react";
import { Play, Flame, Cpu, ShieldCheck } from "lucide-react";

interface ScenarioSelectorProps {
  onTrigger: (scenarioId: string) => void;
  isLoading: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ onTrigger, isLoading }) => {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="font-semibold uppercase tracking-wider">Benchmark Scenarios</span>
        <span className="text-[10px] text-zinc-500">1-Click Live Test</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onTrigger("scenario_1_db_lock")}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-left transition-colors flex flex-col justify-between gap-1 disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-rose-400">
            <Flame className="w-3.5 h-3.5" />
            <span>Scenario 1</span>
          </div>
          <span className="text-[10px] text-zinc-300 font-sans leading-tight">
            Checkout 500 & DB Table Lock
          </span>
        </button>

        <button
          onClick={() => onTrigger("scenario_2_memory_leak")}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-colors flex flex-col justify-between gap-1 disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Scenario 2</span>
          </div>
          <span className="text-[10px] text-zinc-300 font-sans leading-tight">
            SSE Stream Memory Leak
          </span>
        </button>

        <button
          onClick={() => onTrigger("scenario_3_security_quarantine")}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left transition-colors flex flex-col justify-between gap-1 disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-purple-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Scenario 3</span>
          </div>
          <span className="text-[10px] text-zinc-300 font-sans leading-tight">
            Malicious Dep Quarantine
          </span>
        </button>
      </div>
    </div>
  );
};
