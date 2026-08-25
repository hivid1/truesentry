import { PrometheusMcpServer, PostgresMcpServer, GitHubMcpServer } from "@truesentry/mcp-servers";

export class TelemetryScoutSubagent {
  public role = "TelemetryScout";
  private prometheus = new PrometheusMcpServer();
  private postgres = new PostgresMcpServer();
  private github = new GitHubMcpServer();

  public async investigate(service: string) {
    const alerts = await this.prometheus.callTool("get_firing_alerts", {});
    const recentDeployments = await this.github.callTool("list_recent_deployments", { environment: "production" });
    const locks = await this.postgres.callTool("inspect_table_locks", { tableName: "orders" });

    return {
      service,
      alerts: JSON.parse(alerts.content[0].text),
      recentDeployments: JSON.parse(recentDeployments.content[0].text),
      locks: JSON.parse(locks.content[0].text),
      hypothesis: "Recent deployment #4c21 added an unindexed foreign key to orders table, acquiring an exclusive lock and causing checkout 500 errors.",
    };
  }
}
