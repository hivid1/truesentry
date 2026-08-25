import { AgentEvent } from "../types.js";

type Listener = (event: AgentEvent) => void;

export class EventBroadcaster {
  private listeners: Map<string, Set<Listener>> = new Map();
  private eventHistory: Map<string, AgentEvent[]> = new Map();

  public subscribe(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);

    // Replay existing events for newly connected client
    const history = this.eventHistory.get(sessionId) || [];
    for (const evt of history) {
      listener(evt);
    }

    return () => {
      this.listeners.get(sessionId)?.delete(listener);
    };
  }

  public broadcast(sessionId: string, event: AgentEvent): void {
    if (!this.eventHistory.has(sessionId)) {
      this.eventHistory.set(sessionId, []);
    }
    this.eventHistory.get(sessionId)!.push(event);

    const subs = this.listeners.get(sessionId);
    if (subs) {
      for (const listener of subs) {
        listener(event);
      }
    }
  }

  public getHistory(sessionId: string): AgentEvent[] {
    return this.eventHistory.get(sessionId) || [];
  }
}
