import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { EventBroadcaster } from "./events/emitter.js";
import { HitlGateEngine } from "./hitl/gate.js";
import { SessionStore } from "./storage/db.js";
import { TrueSentryCoordinator } from "./coordinator.js";
import { SCENARIO_1_DB_LOCK, SCENARIO_2_MEMORY_LEAK, SCENARIO_3_SECURITY } from "@truesentry/scenarios";

const app = new Hono();
app.use("*", cors());

const broadcaster = new EventBroadcaster();
const hitlGate = new HitlGateEngine(broadcaster);
const sessionStore = new SessionStore();
const coordinator = new TrueSentryCoordinator(broadcaster, hitlGate, sessionStore);

// Health check
app.get("/health", (c) => c.json({ status: "OK", service: "truesentry-harness", timestamp: Date.now() }));

// SSE Event Stream
app.get("/api/stream/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: any) => {
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`));
      };

      const unsubscribe = broadcaster.subscribe(sessionId, (evt) => {
        sendEvent(evt);
      });

      c.req.raw.signal.addEventListener("abort", () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

// Trigger incident investigation
app.post("/api/incidents/trigger", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const scenarioId = body.scenarioId || "scenario_1_db_lock";
  const sessionId = `ses_${Math.random().toString(36).substring(2, 10)}`;

  let scenario = SCENARIO_1_DB_LOCK;
  if (scenarioId === "scenario_2_memory_leak") scenario = SCENARIO_2_MEMORY_LEAK;
  if (scenarioId === "scenario_3_security_quarantine") scenario = SCENARIO_3_SECURITY;

  sessionStore.createSession(sessionId, scenario.id);

  // Run asynchronously in background
  setTimeout(() => {
    coordinator.runIncidentWorkflow(sessionId, scenario).catch((err) => {
      console.error("Workflow failed:", err);
    });
  }, 100);

  return c.json({ sessionId, scenarioId: scenario.id, status: "STARTED" });
});

// Resolve HITL Gated Approval
app.post("/api/approvals/:approvalId", async (c) => {
  const approvalId = c.req.param("approvalId");
  const body = await c.req.json();
  const decision = body.decision === "REJECT" ? "REJECT" : "APPROVE";

  const result = hitlGate.resolveApproval(approvalId, decision);
  return c.json(result);
});

const port = Number(process.env.PORT) || 8790;
console.log(`⚡ TrueSentry Harness Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export default app;
