"use client";
import React, { useRef, useEffect } from "react";
import { AgentThoughtEvent } from "@/types/ui";
import { Bot, Terminal, ShieldAlert, Cpu, Wrench, Code2 } from "lucide-react";

interface AgentStreamProps {
  thoughts: AgentThoughtEvent[];
}

export const AgentStream: React.FC<AgentStreamProps> = ({ thoughts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  const getSubagentBadge = (subagent?: string) => {
    switch (subagent) {
      case "TelemetryScout":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Scout (Prometheus MCP)</span>;
      case "SandboxBisector":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">Bisector (Sandbox Container)</span>;
      case "BlastRadiusAuditor":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">Safety Auditor (Policy Engine)</span>;
      case "PostMortemScribe":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Scribe (Merkle Audit)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">TrueForge Coordinator</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
            TrueForge Live Execution & MCP Tool Stream
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-black/60 border border-zinc-800">
          {thoughts.length} Events Logged
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
        {thoughts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-2">
            <Cpu className="w-8 h-8 text-zinc-700 animate-pulse" />
            <span>Standing by for incident trigger. Select Scenario 1 to begin.</span>
          </div>
        ) : (
          thoughts.map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900 transition-colors shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[10px]">Step #{t.step || idx + 1}</span>
                  {getSubagentBadge(t.subagent)}
                </div>
                <span className="text-[10px] text-zinc-500">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-zinc-200 leading-relaxed font-sans text-xs">{t.thought}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
