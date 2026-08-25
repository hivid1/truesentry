import { IncidentScenario } from "./types.js";

export const SCENARIO_2_MEMORY_LEAK: IncidentScenario = {
  id: "scenario_2_memory_leak",
  title: "Incident #INC-0825: API Gateway Memory Leak & Pod OOMKilled",
  category: "MEMORY_LEAK",
  severity: "HIGH",
  service: "api-gateway",
  initialAlertMessage: "P2 Alert: api-gateway memory usage exceeded 94% threshold with 6 pod OOMKills in 10 minutes.",
  rootCauseDescription: "Unclosed channel in Server-Sent Events (SSE) notification streaming handler leaking 42MB of RAM per minute.",
  proposedActionDescription: "Deploy hotfix closing leaked SSE stream context and execute rolling restart across pods.",
  diff: {
    language: "typescript",
    before: `// Faulty SSE Handler in commit e99a1b
export function handleStream(req: Request) {
  const channel = createChannel();
  return new Response(channel.stream); // Leak: channel not closed on client disconnect
}`,
    after: `// Verified Sandbox Hotfix
export function handleStream(req: Request) {
  const channel = createChannel();
  req.signal.addEventListener("abort", () => channel.close());
  return new Response(channel.stream);
}`,
  },
  blastRadius: {
    riskScore: 35,
    estimatedDowntimeSeconds: 0.0,
    affectedServices: ["api-gateway"],
    dataLossRisk: false,
  },
};
