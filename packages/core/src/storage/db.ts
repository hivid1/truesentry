export interface SessionRecord {
  id: string;
  incidentId: string;
  status: "INVESTIGATING" | "WAITING_APPROVAL" | "REMEDIATING" | "RESOLVED" | "FAILED";
  createdAt: number;
  updatedAt: number;
  model: string;
}

export class SessionStore {
  private sessions: Map<string, SessionRecord> = new Map();

  public createSession(id: string, incidentId: string, model = "gemini-2.5-pro"): SessionRecord {
    const session: SessionRecord = {
      id,
      incidentId,
      status: "INVESTIGATING",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
    };
    this.sessions.set(id, session);
    return session;
  }

  public getSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  public updateStatus(id: string, status: SessionRecord["status"]): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
    }
  }

  public setModel(id: string, model: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.model = model;
      session.updatedAt = Date.now();
    }
  }
}
