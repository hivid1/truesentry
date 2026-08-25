import { describe, it, expect } from "vitest";
import { PrometheusMcpServer } from "../src/prometheus";
import { PostgresMcpServer } from "../src/postgres";
import { GitHubMcpServer } from "../src/github";
import { SlackMcpServer } from "../src/slack";

describe("MCP Servers Integration Tests", () => {
  it("Prometheus MCP evaluates instant and range queries", async () => {
    const server = new PrometheusMcpServer();
    const alerts = await server.callTool("get_firing_alerts", {});
    expect(alerts.content[0].text).toContain("HighHttp5xxRate");

    const metrics = await server.callTool("query_range", { query: "http_requests_total" });
    expect(metrics.content[0].text).toContain("checkout-service");
  });

  it("Postgres MCP detects table locks and explains queries", async () => {
    const server = new PostgresMcpServer();
    const locks = await server.callTool("inspect_table_locks", { tableName: "orders" });
    expect(locks.content[0].text).toContain("AccessExclusiveLock");
    expect(locks.content[0].text).toContain("orders");

    const explain = await server.callTool("explain_analyze_query", { query: "SELECT * FROM orders" });
    expect(explain.content[0].text).toContain("LockRows");
  });

  it("GitHub MCP returns commit diffs and recent deploys", async () => {
    const server = new GitHubMcpServer();
    const diff = await server.callTool("get_commit_diff", { baseSha: "HEAD~1", headSha: "HEAD" });
    expect(diff.content[0].text).toContain("ALTER TABLE orders ADD CONSTRAINT fk_user_id");
  });

  it("Slack MCP dispatches incident notifications", async () => {
    const server = new SlackMcpServer();
    const res = await server.callTool("send_incident_update", {
      channel: "#sre-alerts",
      message: "Test alert",
      severity: "HIGH",
    });
    expect(res.content[0].text).toContain("SENT");
  });
});
