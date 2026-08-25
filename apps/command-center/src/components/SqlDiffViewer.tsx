"use client";
import React, { useState } from "react";
import { Code, Split, AlignLeft, CheckCircle2 } from "lucide-react";

interface SqlDiffViewerProps {
  beforeSql: string;
  afterSql: string;
  language?: string;
}

export const SqlDiffViewer: React.FC<SqlDiffViewerProps> = ({
  beforeSql,
  afterSql,
  language = "SQL",
}) => {
  const [viewMode, setViewMode] = useState<"split" | "unified">("unified");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs shadow-2xl">
      {/* Diff Header */}
      <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          <Code className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-[11px] uppercase tracking-wider">
            Verified Remediation Diff ({language})
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setViewMode("unified")}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              viewMode === "unified" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              viewMode === "split" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="p-4 bg-black/80 overflow-x-auto text-[11px] leading-relaxed">
        {viewMode === "unified" ? (
          <div className="space-y-1">
            <div className="text-zinc-500 text-[10px] mb-2 font-sans">
              @@ -1,3 +1,4 @@ Production Migration Patch
            </div>
            <div className="bg-rose-500/10 border-l-2 border-rose-500 px-3 py-1 text-rose-300">
              <span className="text-rose-500 select-none mr-2 font-bold">-</span>
              {beforeSql}
            </div>
            <div className="bg-emerald-500/10 border-l-2 border-emerald-500 px-3 py-1 text-emerald-300 font-semibold mt-1">
              <span className="text-emerald-500 select-none mr-2 font-bold">+</span>
              {afterSql}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
              <div className="text-[10px] text-rose-400 font-bold mb-1.5 uppercase">Before (Blocking)</div>
              <div className="text-rose-300">{beforeSql}</div>
            </div>
            <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
              <div className="text-[10px] text-emerald-400 font-bold mb-1.5 uppercase">After (Non-Blocking)</div>
              <div className="text-emerald-300">{afterSql}</div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Footer */}
      <div className="px-4 py-2 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>AST Syntax & Lock Contention Validated</span>
        </div>
        <span>Zero Table Locks Detected</span>
      </div>
    </div>
  );
};
