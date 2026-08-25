"use client";
import React, { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, Radio } from "lucide-react";

interface VoiceWarRoomProps {
  status: string;
  incidentTitle: string;
}

export const VoiceWarRoom: React.FC<VoiceWarRoomProps> = ({ status, incidentTitle }) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string>("Voice War-Room standby. Click 'Connect Voice Bridge' to activate multi-modal voice SRE briefing.");

  const speakBriefing = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (isActive) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsActive(false);
      setIsSpeaking(false);
      setTranscript("Voice War-Room disconnected.");
    } else {
      setIsActive(true);
      const briefing = "TrueSentry Voice War-Room connected. Incident alert detected. Checkout HTTP 500 error rate spiked to 48.2%. The Telemetry Scout has traced root cause to Migration 049 exclusive table lock. The Bisector Subagent has verified a non-blocking rollback in the sandbox. TrueForge harness is standing by for human sign-off.";
      setTranscript(briefing);
      speakBriefing(briefing);
    }
  };

  useEffect(() => {
    if (isActive && status === "RESOLVED") {
      const resolvedMsg = "Incident resolved successfully. Database locks released and checkout error rates restored to 0.00%. Post-mortem dossier generated and published.";
      setTranscript(resolvedMsg);
      speakBriefing(resolvedMsg);
    }
  }, [status, isActive]);

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-2 font-semibold uppercase">
          <Radio className={`w-3.5 h-3.5 ${isActive ? "text-rose-400 animate-pulse" : "text-zinc-500"}`} />
          Multi-Modal Live Voice War-Room
        </span>
        <button
          onClick={toggleVoice}
          className={`px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
            isActive
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
          }`}
        >
          {isActive ? <Mic className="w-3 h-3 text-rose-400 animate-pulse" /> : <MicOff className="w-3 h-3 text-zinc-400" />}
          {isActive ? "Disconnect Voice" : "Connect Voice Bridge"}
        </button>
      </div>

      <div className="p-3 rounded-lg bg-black/60 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 leading-relaxed flex items-start gap-2.5">
        <Volume2 className={`w-4 h-4 mt-0.5 shrink-0 ${isSpeaking ? "text-cyan-400 animate-bounce" : "text-zinc-600"}`} />
        <div>
          <span className="text-[10px] text-zinc-500 block mb-0.5 font-bold uppercase">
            {isActive ? (isSpeaking ? "TrueSentry Speaking (Live Audio)..." : "Voice Bridge Active (Listening)") : "Offline"}
          </span>
          <p className="font-sans text-xs text-zinc-300">{transcript}</p>
        </div>
      </div>
    </div>
  );
};
