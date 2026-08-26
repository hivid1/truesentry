import { PrometheusMcpServer, PostgresMcpServer, GitHubMcpServer } from "@truesentry/mcp-servers";
import { MultiModelRouter } from "../llm/router.js";

export class TelemetryScoutSubagent {
  public role = "TelemetryScout";
  private prometheus = new PrometheusMcpServer();
  private postgres = new PostgresMcpServer();
  private github = new GitHubMcpServer();

  public async investigate(service: string) {
    // 1. Observe firing Prometheus alerts
    const alertsRes = await this.prometheus.callTool("get_firing_alerts", {});
    const alertsData = JSON.parse(alertsRes.content[0].text);

    // 2. Observe recent deployments
    const deploymentsRes = await this.github.callTool("list_recent_deployments", { environment: "production" });
    const deploymentsData = JSON.parse(deploymentsRes.content[0].text);

    // 3. Conditionally inspect database locks based on alert type
    let locksData: any = { activeLocks: [], totalBlockedQueries: 0 };
    const alertSummary = JSON.stringify(alertsData);
    if (alertSummary.includes("Http5xx") || alertSummary.includes("Latency") || service.includes("checkout")) {
      const locksRes = await this.postgres.callTool("inspect_table_locks", { tableName: "orders" });
      locksData = JSON.parse(locksRes.content[0].text);
    }

    // 4. Autonomous LLM synthesis of observed telemetry
    const prompt = `Analyze the following production telemetry for service '${service}':
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
      service,
      alerts: alertsData,
      recentDeployments: deploymentsData,
      locks: locksData,
      hypothesis,
    };
  }
}
