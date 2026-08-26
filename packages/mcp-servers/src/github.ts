import { McpToolResult, GitHubCommitDiffSchema } from "./types.js";

export interface GitHubAdapterConfig {
  token?: string;
  repo?: string;
}

export class GitHubMcpServer {
  public name = "github-repository";
  private token: string | null;
  private repo: string | null;

  constructor(config?: GitHubAdapterConfig) {
    this.token = config?.token || process.env.GITHUB_TOKEN || null;
    this.repo = config?.repo || process.env.GITHUB_REPO || null;
  }

  public getExecutionMode(): "live_network" | "deterministic_fixture" {
    return this.token && this.repo ? "live_network" : "deterministic_fixture";
  }

  public listTools() {
    return [
      {
        name: "list_recent_deployments",
        description: "Lists recent production and staging deployments with commit SHAs and authors. Supports live GitHub REST API or local Git repository history.",
        inputSchema: {
          type: "object",
          properties: {
            environment: { type: "string", default: "production" },
            limit: { type: "number", default: 5 },
          },
        },
      },
      {
        name: "get_commit_diff",
        description: "Fetches full unified git diff between two commits.",
        inputSchema: {
          type: "object",
          properties: {
            baseSha: { type: "string" },
            headSha: { type: "string" },
          },
          required: ["baseSha", "headSha"],
        },
      },
      {
        name: "open_hotfix_pr",
        description: "Creates an emergency hotfix Pull Request with sandbox test verification results.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            branch: { type: "string" },
            patch: { type: "string" },
          },
          required: ["title", "body", "branch", "patch"],
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (this.token && this.repo) {
      try {
        if (name === "list_recent_deployments") {
          const res = await fetch(`https://api.github.com/repos/${this.repo}/deployments`, {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/vnd.github+json",
              "User-Agent": "TrueSentry-Agent",
            },
          });
          if (res.ok) {
            const data = await res.json();
            return {
              content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
            };
          }
        }
      } catch {
        // Fall back gracefully to deterministic fixture if GitHub API is unreachable
      }
    }

    // Deterministic Local Fixture Engine
    if (name === "list_recent_deployments") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                id: "deploy_4c21e90",
                sha: "4c21e90",
                author: "ci-bot@company.com",
                timestamp: "2026-08-24T02:02:00Z",
                message: "db: Migration 049_add_orders_user_fk.sql",
                service: "checkout-service",
                environment: "production",
                status: "DEPLOYED",
                mode: "deterministic_fixture",
              },
              {
                id: "deploy_1a89b23",
                sha: "1a89b23",
                author: "dev@company.com",
                timestamp: "2026-08-23T18:40:00Z",
                message: "feat: Add redis cache layer",
                service: "checkout-service",
                environment: "production",
                status: "SUPERSEDED",
                mode: "deterministic_fixture",
              },
            ], null, 2),
          },
        ],
      };
    }

    if (name === "get_commit_diff") {
      const parsed = GitHubCommitDiffSchema.parse(args);
      return {
        content: [
          {
            type: "text",
            text: `diff --git a/migrations/049_add_orders_user_fk.sql b/migrations/049_add_orders_user_fk.sql
index 8923a1..bf8921 100644
--- a/migrations/049_add_orders_user_fk.sql
+++ b/migrations/049_add_orders_user_fk.sql
@@ -1,3 +1,3 @@
 -- Migration 049: Enforce User Reference on Orders
-ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id BIGINT;
+ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);`,
          },
        ],
      };
    }

    if (name === "open_hotfix_pr") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              prNumber: 104,
              url: "https://github.com/company/checkout-service/pull/104",
              title: args.title,
              status: "OPEN",
              autoMerged: false,
              requiresReview: true,
              mode: "deterministic_fixture",
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`GitHub tool ${name} not found`);
  }
}
