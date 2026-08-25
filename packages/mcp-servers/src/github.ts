import { McpToolResult, GitHubCommitDiffSchema } from "./types.js";

export class GitHubMcpServer {
  public name = "github-repository";

  public listTools() {
    return [
      {
        name: "list_recent_deployments",
        description: "Lists recent production and staging deployments with commit SHAs and authors.",
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
                environment: "production",
                status: "DEPLOYED",
              },
              {
                id: "deploy_2b18c4f",
                sha: "2b18c4f",
                author: "dev2@company.com",
                timestamp: "2026-08-24T01:52:00Z",
                message: "fix: Update stripe webhook timeout to 5s",
                environment: "production",
                status: "DEPLOYED",
              },
            ], null, 2),
          },
        ],
      };
    }

    if (name === "get_commit_diff") {
      GitHubCommitDiffSchema.parse(args);
      return {
        content: [
          {
            type: "text",
            text: `diff --git a/migrations/049_add_orders_user_fk.sql b/migrations/049_add_orders_user_fk.sql
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/migrations/049_add_orders_user_fk.sql
@@ -0,0 +1,3 @@
+-- Migration: Add Foreign Key Constraint to orders table
+ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
`,
          },
        ],
      };
    }

    if (name === "open_hotfix_pr") {
      const { title, branch } = args as { title: string; branch: string };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              prNumber: 104,
              url: "https://github.com/company/ecommerce/pull/104",
              title,
              branch,
              status: "OPEN",
              checks: "Passed (48/48 sandbox tests)",
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`GitHub tool ${name} not found`);
  }
}
