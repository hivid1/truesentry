import fs from "fs";
import path from "path";

export interface SessionRecord {
  id: string;
  incidentId: string;
  status: "INVESTIGATING" | "WAITING_APPROVAL" | "REMEDIATING" | "RESOLVED" | "FAILED";
  createdAt: number;
  updatedAt: number;
  model: string;
  metadata?: Record<string, unknown>;
}

export class SessionStore {
  private sessions: Map<string, SessionRecord> = new Map();
  private storagePath: string | null = null;

  constructor(storagePath?: string) {
    if (storagePath && storagePath !== ":memory:") {
      this.storagePath = storagePath;
      this.loadFromDisk();
    } else if (storagePath === undefined) {
      // Default durable directory in workspace
      this.storagePath = path.resolve(process.cwd(), ".truesentry", "sessions.json");
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    if (!this.storagePath) return;
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        const parsed: SessionRecord[] = JSON.parse(raw);
        for (const record of parsed) {
          this.sessions.set(record.id, record);
        }
      }
    } catch {
      // Initialize clean map if parse fails
    }
  }

  private persistToDisk(): void {
    if (!this.storagePath) return;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const records = Array.from(this.sessions.values());
      const tempPath = `${this.storagePath}.${Date.now()}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), "utf-8");
      fs.renameSync(tempPath, this.storagePath);
    } catch {
      // In-memory fallback if disk write fails
    }
  }

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
    this.persistToDisk();
    return session;
  }

  public getSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  public listSessions(): SessionRecord[] {
    return Array.from(this.sessions.values());
  }

  public updateStatus(id: string, status: SessionRecord["status"]): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
      this.persistToDisk();
    }
  }

  public setModel(id: string, model: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.model = model;
      session.updatedAt = Date.now();
      this.persistToDisk();
    }
  }

  public clear(): void {
    this.sessions.clear();
    this.persistToDisk();
  }
}
