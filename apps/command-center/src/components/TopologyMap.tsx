"use client";
import React from "react";
import { Globe, Server, Database, ArrowRight, Layers } from "lucide-react";

interface TopologyMapProps {
  status: string;
}

export const TopologyMap: React.FC<TopologyMapProps> = ({ status }) => {
  const isHealthy = status === "RESOLVED";

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-2 font-semibold uppercase">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Live Microservice Topology DAG
        </span>
        <span className={`text-[10px] font-bold font-mono ${isHealthy ? "text-emerald-400" : "text-rose-400"}`}>
          {isHealthy ? "✓ All Systems Healthy" : "● Degraded Zone: orders-db"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 text-[11px] font-mono overflow-x-auto py-1">
        {/* Node 1: Edge CDN */}
        <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col items-center gap-1 min-w-[70px]">
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-semibold text-zinc-300">Cloudflare</span>
          <span className="text-[8px] text-emerald-400">0.0% Err</span>
        </div>

        <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />

        {/* Node 2: API Gateway */}
        <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col items-center gap-1 min-w-[70px]">
          <Server className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-semibold text-zinc-300">Gateway</span>
          <span className={`text-[8px] ${isHealthy ? "text-emerald-400" : "text-amber-400"}`}>
            {isHealthy ? "18ms" : "1420ms"}
          </span>
        </div>

        <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />

        {/* Node 3: Checkout Service */}
        <div
          className={`p-2 rounded-lg border flex flex-col items-center gap-1 min-w-[70px] ${
            isHealthy
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
              : "border-rose-500/50 bg-rose-500/10 text-rose-300 animate-pulse"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold">Checkout</span>
          <span className="text-[8px] font-bold">{isHealthy ? "0.0% Err" : "48.2% Err"}</span>
        </div>

        <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />

        {/* Node 4: PostgreSQL Database */}
        <div
          className={`p-2 rounded-lg border flex flex-col items-center gap-1 min-w-[70px] ${
            isHealthy
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
              : "border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold">orders-db</span>
          <span className="text-[8px] font-bold">{isHealthy ? "0 Locks" : "18 Locks"}</span>
        </div>
      </div>
    </div>
  );
};
