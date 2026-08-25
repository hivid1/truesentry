"use client";
import React from "react";
import { TelemetryPoint } from "@/types/ui";
import { Activity, AlertTriangle, Database, Server } from "lucide-react";

interface TelemetryPanelProps {
  telemetry: TelemetryPoint;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  const errorPercentage = (telemetry.errorRate * 100).toFixed(1);
  const isSpiking = telemetry.errorRate > 0.05;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Live Production Telemetry (Prometheus MCP)
        </h3>
        <span className="text-[10px] font-mono text-zinc-500">Auto-refresh 500ms</span>
      </div>

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
          <span className="text-[10px] text-zinc-500 mt-1 font-mono">Threshold: 5.0%</span>
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
