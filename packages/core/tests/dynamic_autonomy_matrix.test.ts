import { describe, it, expect } from "vitest";
import { TelemetryScoutSubagent } from "../src/subagents/scout.js";
import { PrometheusMcpServer } from "@truesentry/mcp-servers";
import { PostgresMcpServer } from "@truesentry/mcp-servers";
import { GitHubMcpServer } from "@truesentry/mcp-servers";

describe("🤖 Dynamic LLM Autonomy & Tool Selection Matrix (5 Distinct Incidents)", () => {
  const promMcp = new PrometheusMcpServer();
  const pgMcp = new PostgresMcpServer();
  const ghMcp = new GitHubMcpServer();

  it("Incident A: Database Table Lock Contention -> Chooses Postgres locks + Git migration triage", async () => {
    const alert = {
      alertId: "alt_db_lock_01",
      service: "checkout-service",
      type: "HIGH_ERROR_RATE",
      description: "HTTP 500 spike: Exclusive table lock detected on 'orders'",
      severity: "CRITICAL",
    };

    const telemetry = {
      alert,
      metrics: { errorRate: 0.384, p99LatencyMs: 4200 },
      hasDatabaseLock: true,
      hasOOMKill: false,
    };

    const scout = new TelemetryScoutSubagent(promMcp, pgMcp, ghMcp);
    const diagnosis = await scout.investigate(alert.alertId, telemetry);

    expect(diagnosis.targetService).toBe("checkout-service");
    expect(diagnosis.rootCauseCategory).toBe("DATABASE_LOCK_CONTENTION");
    expect(diagnosis.hypothesis).toContain("PostgreSQL exclusive lock contention");
  });

  it("Incident B: API Gateway Memory Leak -> Skips DB locks, chooses Container Pod Triage", async () => {
    const alert = {
      alertId: "alt_mem_leak_02",
      service: "api-gateway",
      type: "MEMORY_EXHAUSTION",
      description: "Container memory at 94.6% with 6 OOMKills",
      severity: "CRITICAL",
    };

    const telemetry = {
      alert,
      metrics: { errorRate: 0.12, memoryUsagePercent: 94.6, oomKills: 6 },
      hasDatabaseLock: false,
      hasOOMKill: true,
    };

    const scout = new TelemetryScoutSubagent(promMcp, pgMcp, ghMcp);
    const diagnosis = await scout.investigate(alert.alertId, telemetry);

    expect(diagnosis.targetService).toBe("api-gateway");
    expect(diagnosis.rootCauseCategory).toBe("CONTAINER_MEMORY_LEAK");
    expect(diagnosis.hypothesis).toContain("Memory leak / OOMKill");
  });

  it("Incident C: Database Connection Pool Exhaustion -> Targets pg_stat_activity & Pool Saturation", async () => {
    const alert = {
      alertId: "alt_conn_pool_03",
      service: "order-service",
      type: "CONNECTION_POOL_EXHAUSTED",
      description: "Active connections reached max_connections (100/100), all clients waiting",
      severity: "HIGH",
    };

    const telemetry = {
      alert,
      metrics: { activeConnections: 100, maxConnections: 100, waitingClients: 42 },
      hasDatabaseLock: false,
      hasOOMKill: false,
    };

    const scout = new TelemetryScoutSubagent(promMcp, pgMcp, ghMcp);
    const diagnosis = await scout.investigate(alert.alertId, telemetry);

    expect(diagnosis.targetService).toBe("order-service");
    expect(diagnosis.rootCauseCategory).toBe("DATABASE_CONNECTION_EXHAUSTION");
  });

  it("Incident D: Application Logic Promo Parser Regression -> Skips DB/Infra, focuses on Code Diff", async () => {
    const alert = {
      alertId: "alt_app_bug_04",
      service: "promo-engine",
      type: "VALIDATION_FAILURE",
      description: "HTTP 400 Bad Request spike in coupon code validator after release",
      severity: "MEDIUM",
    };

    const telemetry = {
      alert,
      metrics: { http4xxRate: 0.45, http5xxRate: 0.00 },
      hasDatabaseLock: false,
      hasOOMKill: false,
    };

    const scout = new TelemetryScoutSubagent(promMcp, pgMcp, ghMcp);
    const diagnosis = await scout.investigate(alert.alertId, telemetry);

    expect(diagnosis.targetService).toBe("promo-engine");
    expect(diagnosis.rootCauseCategory).toBe("APPLICATION_LOGIC_REGRESSION");
  });

  it("Incident E: CPU Saturation from Regex ReDoS -> Targets Worker Thread Profile", async () => {
    const alert = {
      alertId: "alt_cpu_redoc_05",
      service: "search-indexer",
      type: "CPU_SATURATION",
      description: "Worker CPU at 99.8% due to catastrophic backtracking regex",
      severity: "CRITICAL",
    };

    const telemetry = {
      alert,
      metrics: { cpuPercent: 99.8, workerStallCount: 16 },
      hasDatabaseLock: false,
      hasOOMKill: false,
    };

    const scout = new TelemetryScoutSubagent(promMcp, pgMcp, ghMcp);
    const diagnosis = await scout.investigate(alert.alertId, telemetry);

    expect(diagnosis.targetService).toBe("search-indexer");
    expect(diagnosis.rootCauseCategory).toBe("CPU_STARVATION");
  });
});
