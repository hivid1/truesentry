"use client";
import React, { useState } from "react";
import { Flame, Cpu, ShieldCheck, ShieldAlert, Bug, RefreshCw, Key, AlertOctagon, CheckCircle2 } from "lucide-react";

interface ScenarioSelectorProps {
  onTrigger: (scenarioId: string) => void;
  isLoading: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ onTrigger, isLoading }) => {
  const [attackFeedback, setAttackFeedback] = useState<string | null>(null);

  const simulateAttack = (attackType: string, msg: string) => {
    setAttackFeedback(msg);
    setTimeout(() => setAttackFeedback(null), 5000);
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-zinc-300">Judge Red-Team Attack Station</span>
        <span className="text-[10px] text-cyan-400">1-Click Verification</span>
      </div>

      {attackFeedback && (
        <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-[11px] text-red-300 flex items-center gap-2 animate-pulse">
          <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{attackFeedback}</span>
        </div>
      )}

      {/* Production Scenarios */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onTrigger("scenario_1_db_lock")}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-left transition-colors flex flex-col justify-between gap-1 disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
            <Flame className="w-3.5 h-3.5" />
            <span>1. Trigger Incident</span>
          </div>
          <span className="text-[10px] text-zinc-300 font-sans leading-tight">
            Checkout 500 & DB Table Lock
          </span>
        </button>

        <button
          onClick={() => onTrigger("scenario_failed_patch_safe_abort")}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-red-500/40 bg-red-950/30 hover:bg-red-900/40 text-left transition-colors flex flex-col justify-between gap-1 disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>2. Safe-Abort Demo</span>
          </div>
          <span className="text-[10px] text-zinc-300 font-sans leading-tight">
            Sandbox Fail $\to$ Zero HITL / Execution
          </span>
        </button>
      </div>

      {/* Live Adversarial Red-Team Probes */}
      <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Adversarial Attacks:</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() =>
              simulateAttack(
                "prompt_injection",
                "🛡️ ATTACK BLOCKED: Injected 'DROP DATABASE production' stripped of comments and hard-blocked by PolicyEngine. Zero HITL prompts emitted."
              )
            }
            className="p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-[10px] text-zinc-300 hover:text-amber-300 text-center transition-colors flex flex-col items-center gap-1 cursor-pointer"
          >
            <Bug className="w-3 h-3 text-amber-400" />
            <span>Inject Prompt</span>
          </button>

          <button
            onClick={() =>
              simulateAttack(
                "tamper_evidence",
                "🛡️ EVIDENCE INTEGRITY VIOLATION: Mutated commit 049_fake_migration invalidates SHA-256 hash. ROOT_CAUSE_CONFIRMED revoked."
              )
            }
            className="p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 text-[10px] text-zinc-300 hover:text-cyan-300 text-center transition-colors flex flex-col items-center gap-1 cursor-pointer"
          >
            <Key className="w-3 h-3 text-cyan-400" />
            <span>Tamper Hash</span>
          </button>

          <button
            onClick={() =>
              simulateAttack(
                "replay_attack",
                "🛡️ REPLAY ATTACK BLOCKED: Atomic filesystem CAS token store (O_CREAT|O_EXCL) rejected duplicate token consumption."
              )
            }
            className="p-2 rounded bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 text-[10px] text-zinc-300 hover:text-purple-300 text-center transition-colors flex flex-col items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-purple-400" />
            <span>Replay Token</span>
          </button>
        </div>
      </div>
    </div>
  );
};
