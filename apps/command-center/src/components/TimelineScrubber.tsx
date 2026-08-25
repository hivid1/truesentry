"use client";
import React from "react";
import { Play, RotateCcw, FastForward, CheckCircle2 } from "lucide-react";

interface TimelineScrubberProps {
  onRestart: () => void;
  status: string;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({ onRestart, status }) => {
  return (
    <div className="h-14 border-t border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between text-xs font-mono select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onRestart}
          className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5"
          title="Restart Incident Investigation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="text-[10px]">Replay Incident</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Timeline: <strong className="text-zinc-200">Live Telemetry Stream</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
          <span>T+00:00 Alert</span>
          <span>➔</span>
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-cyan-400 font-semibold">T+00:28 Repro</span>
          <span>➔</span>
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-amber-400 font-semibold">T+00:45 HITL Gate</span>
          <span>➔</span>
          <div className={`w-2 h-2 rounded-full ${status === "RESOLVED" ? "bg-emerald-400" : "bg-zinc-700"}`} />
          <span className={status === "RESOLVED" ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
            T+01:48 Recovery
          </span>
        </div>
      </div>
    </div>
  );
};
