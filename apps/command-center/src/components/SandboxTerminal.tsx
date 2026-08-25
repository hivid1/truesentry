"use client";
import React, { useRef, useEffect } from "react";
import { Terminal, ShieldCheck } from "lucide-react";

interface SandboxTerminalProps {
  logs: string[];
}

export const SandboxTerminal: React.FC<SandboxTerminalProps> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
            TrueForge Sandbox Container Terminal (Isolated)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Rootless / cgroups v2</span>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-y-auto whitespace-pre-wrap select-text"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600">
            [TrueForge Sandbox Runtime Ready] Idle container waiting for agent commands...
          </div>
        ) : (
          logs.map((log, index) => (
            <span
              key={index}
              className={
                log.includes("[FAIL]") || log.includes("Error:")
                  ? "text-rose-400"
                  : log.includes("PASS") || log.includes("PASSED") || log.includes("✓")
                  ? "text-emerald-400 font-semibold"
                  : log.includes("$")
                  ? "text-cyan-400 font-semibold"
                  : "text-zinc-300"
              }
            >
              {log}
            </span>
          ))
        )}
      </div>
    </div>
  );
};
