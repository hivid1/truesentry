"use client";
import React, { useState } from "react";
import { HitlApprovalRequest } from "@/types/ui";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { SqlDiffViewer } from "./SqlDiffViewer";

interface HitlApprovalModalProps {
  request: HitlApprovalRequest;
  onDecision: (approvalId: string, decision: "APPROVE" | "REJECT") => void;
}

export const HitlApprovalModal: React.FC<HitlApprovalModalProps> = ({ request, onDecision }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = () => {
    setIsSubmitting(true);
    onDecision(request.approvalId, "APPROVE");
  };

  const handleReject = () => {
    setIsSubmitting(true);
    onDecision(request.approvalId, "REJECT");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider">
                TrueForge Harness Gated Checkpoint (Paused)
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Action is state-modifying. Human sign-off required before execution.
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold">
            Risk: {request.blastRadius.riskScore}/100
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 font-mono text-xs max-h-[60vh] overflow-y-auto">
          {/* Target Resource & Action */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase">Target Resource</span>
              <div className="text-zinc-200 font-semibold mt-0.5">{request.target.resource}</div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase">Proposed Action</span>
              <div className="text-amber-400 font-semibold mt-0.5">{request.target.actionType}</div>
            </div>
          </div>

          {/* Blast Radius Assessment */}
          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Estimated Downtime:</span>
              <strong className="text-emerald-400">{request.blastRadius.estimatedDowntimeSeconds}s</strong>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Data Loss Potential:</span>
              <strong className="text-emerald-400">0% (Schema/Index fix)</strong>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Sandbox Test Status:</span>
              <strong className="text-emerald-400">✓ {request.sandboxProof.testsPassed}/{request.sandboxProof.testsRun} Tests Passed</strong>
            </div>
          </div>

          {/* Monaco-Style SQL Diff Viewer */}
          <SqlDiffViewer
            beforeSql={request.diff.before}
            afterSql={request.diff.after}
            language={request.diff.language.toUpperCase()}
          />
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            Reject & Abort
          </button>

          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            {isSubmitting ? "Executing..." : "Approve & Execute Rollback"}
          </button>
        </div>
      </div>
    </div>
  );
};
