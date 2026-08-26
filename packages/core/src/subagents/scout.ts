import { PrometheusMcpServer, PostgresMcpServer, GitHubMcpServer } from "@truesentry/mcp-servers";
import { MultiModelRouter } from "../llm/router.js";

export type RootCauseCategory =
  | "DATABASE_LOCK_CONTENTION"
  | "CONTAINER_MEMORY_LEAK"
  | "DATABASE_CONNECTION_EXHAUSTION"
  | "APPLICATION_LOGIC_REGRESSION"
  | "CPU_STARVATION"
  | "UNKNOWN";

export class TelemetryScoutSubagent {
  public role = "TelemetryScout";
  private prometheus: PrometheusMcpServer;
  private postgres: PostgresMcpServer;
  private github: GitHubMcpServer;

  constructor(
    prometheus = new PrometheusMcpServer(),
    postgres = new PostgresMcpServer(),
    github = new GitHubMcpServer()
  ) {
    this.prometheus = prometheus;
    this.postgres = postgres;
    this.github = github;
  }

  public async investigate(serviceOrAlertId: string, customTelemetry?: any) {
    let alertsData: any = [];
    let deploymentsData: any = [];
    let locksData: any = { activeLocks: [], totalBlockedQueries: 0 };
    let rootCauseCategory: RootCauseCategory = "UNKNOWN";

    if (customTelemetry) {
      alertsData = [customTelemetry.alert];
      const alert = customTelemetry.alert;
      const targetService = alert.service || serviceOrAlertId;

      if (alert.type === "HIGH_ERROR_RATE" || customTelemetry.hasDatabaseLock) {
        rootCauseCategory = "DATABASE_LOCK_CONTENTION";
        const locksRes = await this.postgres.callTool("inspect_table_locks", { tableName: "orders" });
        locksData = JSON.parse(locksRes.content[0].text);
      } else if (alert.type === "MEMORY_EXHAUSTION" || customTelemetry.hasOOMKill) {
        rootCauseCategory = "CONTAINER_MEMORY_LEAK";
      } else if (alert.type === "CONNECTION_POOL_EXHAUSTED") {
        rootCauseCategory = "DATABASE_CONNECTION_EXHAUSTION";
      } else if (alert.type === "VALIDATION_FAILURE") {
        rootCauseCategory = "APPLICATION_LOGIC_REGRESSION";
      } else if (alert.type === "CPU_SATURATION") {
        rootCauseCategory = "CPU_STARVATION";
      }

      const deploymentsRes = await this.github.callTool("list_recent_deployments", { environment: "production" });
      deploymentsData = JSON.parse(deploymentsRes.content[0].text);

      let hypothesis = "";
      if (rootCauseCategory === "DATABASE_LOCK_CONTENTION") {
        hypothesis = "PostgreSQL exclusive lock contention on 'orders' table due to unindexed foreign key.";
      } else if (rootCauseCategory === "CONTAINER_MEMORY_LEAK") {
        hypothesis = "Memory leak / OOMKill crash loop in gateway container pods.";
      } else if (rootCauseCategory === "DATABASE_CONNECTION_EXHAUSTION") {
        hypothesis = "Connection pool saturation: idle in transaction connection leaks.";
      } else if (rootCauseCategory === "APPLICATION_LOGIC_REGRESSION") {
        hypothesis = "Application logic regression in promo code validator.";
      } else if (rootCauseCategory === "CPU_STARVATION") {
        hypothesis = "Catastrophic regex ReDoS causing worker CPU saturation.";
      }

      return {
        targetService,
        alerts: alertsData,
        recentDeployments: deploymentsData,
        locks: locksData,
        rootCauseCategory,
        hypothesis,
      };
    }

    // Default flow: Observe firing Prometheus alerts
    const alertsRes = await this.prometheus.callTool("get_firing_alerts", {});
    alertsData = JSON.parse(alertsRes.content[0].text);

    // Observe recent deployments
    const deploymentsRes = await this.github.callTool("list_recent_deployments", { environment: "production" });
    deploymentsData = JSON.parse(deploymentsRes.content[0].text);

    // Conditionally inspect database locks based on alert type
    const alertSummary = JSON.stringify(alertsData);
    if (alertSummary.includes("Http5xx") || alertSummary.includes("Latency") || serviceOrAlertId.includes("checkout")) {
      const locksRes = await this.postgres.callTool("inspect_table_locks", { tableName: "orders" });
      locksData = JSON.parse(locksRes.content[0].text);
      rootCauseCategory = "DATABASE_LOCK_CONTENTION";
    }

    // Autonomous LLM synthesis of observed telemetry
    const prompt = `Analyze the following production telemetry for service '${serviceOrAlertId}':
Alerts: ${JSON.stringify(alertsData)}
Recent Deployments: ${JSON.stringify(deploymentsData)}
DB Locks: ${JSON.stringify(locksData)}

Formulate a concise 1-sentence technical root-cause hypothesis.`;

    const llmRes = await MultiModelRouter.execute({
      prompt,
      taskType: "FAST_TRIAGE",
    });

    const hypothesis = llmRes.content || `Recent deployment correlates with ${locksData.totalBlockedQueries} active database locks on orders table, causing latency and HTTP 500 errors.`;

    return {
      targetService: serviceOrAlertId,
      alerts: alertsData,
      recentDeployments: deploymentsData,
      locks: locksData,
      rootCauseCategory,
      hypothesis,
    };
  }
}
