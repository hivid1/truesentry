import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionStore } from "../src/storage/db.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("Durable Session Persistence Suite", () => {
  let tempDir: string;
  let sessionFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "truesentry-session-test-"));
    sessionFilePath = path.join(tempDir, "sessions.json");
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("persists sessions across distinct process lifecycles", () => {
    // Process 1: Create session & update model
    const process1Store = new SessionStore(sessionFilePath);
    const session = process1Store.createSession("sess-prod-999", "inc-p1-500", "claude-3-7-sonnet");
    process1Store.updateStatus("sess-prod-999", "WAITING_APPROVAL");
    process1Store.setModel("sess-prod-999", "gemini-2.5-pro");

    expect(fs.existsSync(sessionFilePath)).toBe(true);

    // Process 2: Fresh instance (simulating restart)
    const process2Store = new SessionStore(sessionFilePath);
    const recovered = process2Store.getSession("sess-prod-999");

    expect(recovered).toBeDefined();
    expect(recovered?.id).toBe("sess-prod-999");
    expect(recovered?.incidentId).toBe("inc-p1-500");
    expect(recovered?.status).toBe("WAITING_APPROVAL");
    expect(recovered?.model).toBe("gemini-2.5-pro");
  });

  it("supports in-memory mode when explicitly requested with :memory:", () => {
    const memoryStore = new SessionStore(":memory:");
    memoryStore.createSession("sess-mem-1", "inc-mem");
    expect(memoryStore.getSession("sess-mem-1")).toBeDefined();
  });
});
