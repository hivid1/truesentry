/**
 * TrueSentry Demo Video Recording Assistant
 * Run this script to step through the 3-minute demo flow with precision timing.
 */

const steps = [
  {
    time: "0:00 - 0:25",
    title: "THE HOOK & THE 2 AM CRISIS",
    screenAction: "Show Command Center (http://localhost:3000). Click 'Scenario 1'. Flashing RED telemetry appears.",
    voiceover:
      "What happens when an AI agent has the keys to your production database? Without guardrails, a single hallucinated query could wipe out your users in seconds. Meet TrueSentry: an autonomous incident responder built on TrueForge that investigates with real tools, runs code in a sandbox, and pauses for human approval before doing anything irreversible.",
  },
  {
    time: "0:25 - 0:55",
    title: "AUTONOMOUS MCP DIAGNOSTICS",
    screenAction: "Zoom in on Agent Thought Stream & Telemetry. Point to Prometheus query & pg_locks table inspection.",
    voiceover:
      "At 2:14 AM, our checkout error rate spikes to 48.2%. TrueSentry activates autonomously. Through TrueForge's MCP integration, it queries Prometheus latency metrics and inspects PostgreSQL lock contention, tracing the root cause to an un-indexed foreign key migration deployed 12 minutes ago.",
  },
  {
    time: "0:55 - 1:35",
    title: "ISOLATED SANDBOX BISECT & SELF-CORRECTION",
    screenAction: "Focus on the Sandbox Terminal (Right Column). Watch live git bisect output and test runner stdout.",
    voiceover:
      "Instead of testing blindly on production, TrueForge spins up an isolated sandbox container. The Bisector Subagent clones the repo, runs git bisect, reproduces the lock timeout, and tests a rollback patch. All 48 tests pass cleanly in the sandbox.",
  },
  {
    time: "1:35 - 2:15",
    title: "THE TRUEFORGE HITL PAUSE & APPROVAL",
    screenAction: "The glowing Amber HITL Modal pops up. Hover over SQL diff, Risk Score 74/100, then click 'Approve & Execute'.",
    voiceover:
      "Now, the defining moment of the TrueForge harness: rolling back a live database is irreversible. TrueForge halts execution immediately. On our Command Center UI, an interactive Approval Card appears with blast-radius analytics and the verified SQL diff. The human SRE verifies the fix and clicks 'Approve'.",
  },
  {
    time: "2:15 - 2:40",
    title: "VERIFIED RECOVERY & MERKLE POST-MORTEM",
    screenAction: "Watch telemetry error rate drop to 0.00%. Click 'View Incident Post-Mortem & Merkle Proof'.",
    voiceover:
      "With approval granted, TrueForge applies the fix. Within three seconds, database locks release, error rates plummet to zero, and a comprehensive incident post-mortem with a cryptographic Merkle proof is generated.",
  },
  {
    time: "2:40 - 3:00",
    title: "CODE QUALITY & QODO REVIEW TRAIL",
    screenAction: "Show GitHub repo with .qodo/config.yaml, passing CI tests, and PR review trail.",
    voiceover:
      "Every line of TrueSentry was developed with Qodo AI code reviews, 100% type safety, and open-source standards. Built on TrueForge. Safe, autonomous, and production-ready.",
  },
];

console.log("\n=======================================================");
console.log("🎬 TrueSentry: 3-Minute Demo Video Recording Guide");
console.log("=======================================================\n");

steps.forEach((step, idx) => {
  console.log(`[Step ${idx + 1}] (${step.time}) ➔ ${step.title}`);
  console.log(`🖥️ Screen Action: ${step.screenAction}`);
  console.log(`🎙️ Voiceover: "${step.voiceover}"\n`);
});

console.log("=======================================================");
console.log("💡 Tip: Record at 1080p 60fps. Keep your cursor smooth!");
console.log("=======================================================\n");
