"use client";
import React, { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { AgentStream } from "@/components/AgentStream";
import { HitlApprovalModal } from "@/components/HitlApprovalModal";
import { SandboxTerminal } from "@/components/SandboxTerminal";
import { SwarmGraph } from "@/components/SwarmGraph";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { TimelineScrubber } from "@/components/TimelineScrubber";
import { VoiceWarRoom } from "@/components/VoiceWarRoom";
import { TopologyMap } from "@/components/TopologyMap";
import { PostMortemModal } from "@/components/PostMortemModal";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { EvidenceGraphViewer, EvidenceNodeUI } from "@/components/EvidenceGraphViewer";
import { HitlApprovalRequest, AgentThoughtEvent, TelemetryPoint } from "@/types/ui";
import { FileText } from "lucide-react";

const HARNESS_URL = "http://localhost:8790";

export default function CommandCenterPage() {
  const [sessionId, setSessionId] = useState<string>("ses_init");
  const [incidentTitle, setIncidentTitle] = useState<string>("Incident #INC-0824: Checkout 500 Outage");
  const [severity, setSeverity] = useState<string>("CRITICAL");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("ACTIVE");
  const [showPostMortem, setShowPostMortem] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [evidenceNodes, setEvidenceNodes] = useState<EvidenceNodeUI[] | undefined>(undefined);

  const [thoughts, setThoughts] = useState<AgentThoughtEvent[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [pendingApproval, setPendingApproval] = useState<HitlApprovalRequest | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint>({
    timestamp: Date.now(),
    errorRate: 0.482,
    p99LatencyMs: 1420,
    activeLocks: 18,
    runningPods: 6,
  });

  const triggerIncident = async (scenarioId: string) => {
    setIsLoading(true);
    setThoughts([]);
    setTerminalLogs([]);
    setPendingApproval(null);
    setStatus("ACTIVE");
    setShowPostMortem(false);
    setCurrentStepIndex(1);
    setEvidenceNodes(undefined);

    try {
      const res = await fetch(`${HARNESS_URL}/api/incidents/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (e) {
      console.warn("Backend harness connecting in mock fallback mode.");
      setSessionId(`ses_${Math.random().toString(36).substring(2, 8)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // SSE Stream Listener
  useEffect(() => {
    if (!sessionId || sessionId === "ses_init") return;

    let eventSource: EventSource;
    try {
      eventSource = new EventSource(`${HARNESS_URL}/api/stream/${sessionId}`);

      eventSource.onopen = () => setIsConnected(true);
      eventSource.onerror = () => setIsConnected(false);

      eventSource.addEventListener("THOUGHT", (e: any) => {
        const payload = JSON.parse(e.data);
        if (payload.step) setCurrentStepIndex(payload.step);
        setThoughts((prev) => [
          ...prev,
          { thought: payload.thought, step: payload.step, subagent: payload.subagent, timestamp: Date.now() },
        ]);
      });

      eventSource.addEventListener("TELEMETRY", (e: any) => {
        const payload = JSON.parse(e.data);
        setTelemetry(payload);
      });

      eventSource.addEventListener("SANDBOX_LOG", (e: any) => {
        const payload = JSON.parse(e.data);
        setTerminalLogs((prev) => [...prev, payload.text]);
      });

      eventSource.addEventListener("EVIDENCE_GRAPH_UPDATE", (e: any) => {
        const payload = JSON.parse(e.data);
        if (payload.graph?.nodes) {
          setEvidenceNodes(payload.graph.nodes);
        }
      });

      eventSource.addEventListener("APPROVAL_REQUEST", (e: any) => {
        const payload = JSON.parse(e.data);
        setPendingApproval(payload);
        setCurrentStepIndex(6);
      });

      eventSource.addEventListener("INCIDENT_RESOLVED", () => {
        setPendingApproval(null);
        setStatus("RESOLVED");
        setCurrentStepIndex(8);
      });
    } catch (err) {
      console.error("SSE connection error:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [sessionId]);

  const handleDecision = async (approvalId: string, decision: "APPROVE" | "REJECT") => {
    try {
      await fetch(`${HARNESS_URL}/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setPendingApproval(null);
    } catch (err) {
      console.error("Failed to submit approval:", err);
      setPendingApproval(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <TopNav
        sessionId={sessionId}
        incidentTitle={incidentTitle}
        severity={severity}
        isConnected={isConnected}
      />

      {/* Top Real-Time Causal Evidence Graph Banner */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/80">
        <EvidenceGraphViewer nodes={evidenceNodes} currentStepIndex={currentStepIndex} />
      </div>

      {/* Main 3-Column Tactical Operations Grid */}
      <main className="flex-1 grid grid-cols-12 gap-px bg-zinc-800 overflow-hidden">
        {/* Column 1: Telemetry, Incident Timeline & Swarm (4 cols) */}
        <div className="col-span-4 bg-zinc-950 p-4 flex flex-col gap-3.5 overflow-y-auto border-r border-zinc-800">
          <TelemetryPanel telemetry={telemetry} />
          <IncidentTimeline
            currentStepIndex={currentStepIndex}
            isPausedAtGate={!!pendingApproval}
            isResolved={status === "RESOLVED"}
          />
          <TopologyMap status={status} />
          <VoiceWarRoom status={status} incidentTitle={incidentTitle} />
          <SwarmGraph />
          <ScenarioSelector onTrigger={triggerIncident} isLoading={isLoading} />

          {status === "RESOLVED" && (
            <button
              onClick={() => setShowPostMortem(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View Incident Post-Mortem & Merkle Proof
            </button>
          )}
        </div>

        {/* Column 2: Agent Thought Stream (4 cols) */}
        <div className="col-span-4 bg-zinc-950 p-4 flex flex-col overflow-hidden border-r border-zinc-800">
          <AgentStream thoughts={thoughts} />
        </div>

        {/* Column 3: Sandbox Terminal & Proof (4 cols) */}
        <div className="col-span-4 bg-zinc-950 p-4 flex flex-col overflow-hidden">
          <SandboxTerminal logs={terminalLogs} />
        </div>
      </main>

      {/* Gated HITL Approval Modal Overlay */}
      {pendingApproval && (
        <HitlApprovalModal request={pendingApproval} onDecision={handleDecision} />
      )}

      {/* Post-Mortem Report Modal */}
      <PostMortemModal
        isOpen={showPostMortem}
        onClose={() => setShowPostMortem(false)}
        incidentTitle={incidentTitle}
      />

      {/* Bottom Timeline Replay Bar */}
      <TimelineScrubber onRestart={() => triggerIncident("scenario_1_db_lock")} status={status} />
    </div>
  );
}
