"use client";
import React, { useState } from "react";
import { TelemetryPoint } from "@/types/ui";
import { Activity, AlertTriangle, Database, Server, Info } from "lucide-react";

interface TelemetryPanelProps {
  telemetry: TelemetryPoint;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  const [showProvenance, setShowProvenance] = useState(false);
  const errorPercentage = (telemetry.errorRate * 100).toFixed(1);
  const isSpiking = telemetry.errorRate > 0.05;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Live Telemetry (Prometheus MCP)
        </h3>
        <button
          onClick={() => setShowProvenance(!showProvenance)}
          className="text-[10px] font-mono text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
        >
          <Info className="w-3 h-3" />
          {showProvenance ? "Hide Provenance" : "Inspect Query"}
        </button>
      </div>

      {showProvenance && (
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-cyan-500/30 text-[10px] font-mono text-zinc-300 flex flex-col gap-1">
          <span className="text-cyan-400 font-bold">PROVENANCE QUERY:</span>
          <code className="text-amber-300 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 break-all">
            {telemetry.provenance?.query || 'rate(http_requests_total{service="checkout",status=~"5.."}[5m])'}
          </code>
          <span className="text-zinc-500">
            Source: {telemetry.provenance?.source || "Prometheus MCP"} • Real-Time Stream
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {/* Metric 1: Error Rate */}
        <div
          className={`p-3 rounded-lg border flex flex-col justify-between ${
            isSpiking
              ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
              : "bg-zinc-900 border-zinc-800 text-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>HTTP 5xx Errors</span>
            {isSpiking && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
          </div>
          <div className="mt-2 text-2xl font-mono font-bold tracking-tight">
            {errorPercentage}%
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">
            {isSpiking ? "Spike Detected (38.4%)" : "Verified SLO (0.00%)"}
          </span>
        </div>

        {/* Metric 2: P99 Latency */}
        <div className="p-3 rounded-lg border bg-zinc-900 border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>P99 Latency</span>
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold tracking-tight text-white">
            {telemetry.p99LatencyMs}ms
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">SLO: &lt; 200ms</span>
        </div>

        {/* Metric 3: Table Locks */}
        <div className="p-3 rounded-lg border bg-zinc-900 border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Active DB Locks</span>
            <Database className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold tracking-tight text-amber-300">
            {telemetry.activeLocks}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Target: orders table</span>
        </div>

        {/* Metric 4: Pods */}
        <div className="p-3 rounded-lg border bg-zinc-900 border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Healthy Pods</span>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold tracking-tight text-emerald-400">
            {telemetry.runningPods}/8
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Kubernetes ReplicaSet</span>
        </div>
      </div>
    </div>
  );
};
