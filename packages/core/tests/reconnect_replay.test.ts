import { describe, it, expect } from "vitest";
import { EventBroadcaster } from "../src/events/emitter.js";
import { AgentEvent } from "../src/types.js";

describe("EventBroadcaster Reconnect & History Replay Suite", () => {
  it("replays full event backlog when a client reconnects after network interruption", () => {
    const broadcaster = new EventBroadcaster();
    const sessionId = "session_recon_test_101";

    const client1Received: AgentEvent[] = [];
    const client2Received: AgentEvent[] = [];

    // 1. Client 1 connects
    const unsubscribeClient1 = broadcaster.subscribe(sessionId, (evt) => {
      client1Received.push(evt);
    });

    // 2. Emit 3 events while Client 1 is connected
    const evt1: AgentEvent = { type: "INCIDENT_ALERT", sessionId, timestamp: Date.now(), data: { title: "Alert 1" } };
    const evt2: AgentEvent = { type: "THOUGHT", sessionId, timestamp: Date.now(), data: { thought: "Thought 2" } };
    const evt3: AgentEvent = { type: "TOOL_CALL", sessionId, timestamp: Date.now(), data: { tool: "Tool 3" } };

    broadcaster.broadcast(sessionId, evt1);
    broadcaster.broadcast(sessionId, evt2);
    broadcaster.broadcast(sessionId, evt3);

    expect(client1Received.length).toBe(3);

    // 3. Client 1 disconnects (e.g. browser refresh or network drop)
    unsubscribeClient1();

    // 4. Incident coordinator emits 2 more events while client is disconnected
    const evt4: AgentEvent = { type: "SANDBOX_EXEC", sessionId, timestamp: Date.now(), data: { output: "Output 4" } };
    const evt5: AgentEvent = { type: "HITL_REQUEST", sessionId, timestamp: Date.now(), data: { nonce: "Nonce 5" } };

    broadcaster.broadcast(sessionId, evt4);
    broadcaster.broadcast(sessionId, evt5);

    // Client 1 did NOT receive evt4/evt5 since it was unsubscribed
    expect(client1Received.length).toBe(3);

    // 5. Client 2 (reconnecting client) subscribes to same sessionId
    const unsubscribeClient2 = broadcaster.subscribe(sessionId, (evt) => {
      client2Received.push(evt);
    });

    // Client 2 synchronously receives all 5 historical events!
    expect(client2Received.length).toBe(5);
    expect(client2Received[0].type).toBe("INCIDENT_ALERT");
    expect(client2Received[1].type).toBe("THOUGHT");
    expect(client2Received[2].type).toBe("TOOL_CALL");
    expect(client2Received[3].type).toBe("SANDBOX_EXEC");
    expect(client2Received[4].type).toBe("HITL_REQUEST");

    // 6. New live event arrives
    const evt6: AgentEvent = { type: "RECOVERY_VERIFIED", sessionId, timestamp: Date.now(), data: { status: "OK" } };
    broadcaster.broadcast(sessionId, evt6);

    expect(client2Received.length).toBe(6);
    expect(client2Received[5].type).toBe("RECOVERY_VERIFIED");

    unsubscribeClient2();
  });
});
