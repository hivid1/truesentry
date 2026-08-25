import { McpToolResult, PostgresLockSchema, PostgresExplainSchema } from "./types.js";

export class PostgresMcpServer {
  public name = "postgres-telemetry";

  public listTools() {
    return [
      {
        name: "inspect_table_locks",
        description: "Checks active database locks, blocked transactions, and lock types on target tables.",
        inputSchema: {
          type: "object",
          properties: {
            tableName: { type: "string", description: "Name of the table to check for lock contention" },
          },
          required: ["tableName"],
        },
      },
      {
        name: "explain_analyze_query",
        description: "Executes EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) on a read-only query to diagnose query execution bottlenecks.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The SQL query to analyze" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_active_connections",
        description: "Fetches active connection counts, client IP pools, and waiting queries from pg_stat_activity.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "execute_remediation_sql",
        description: "Applies verified SQL remediation script after human approval.",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string", description: "The verified SQL to execute" },
            approvalNonce: { type: "string", description: "Cryptographic approval nonce" },
          },
          required: ["sql", "approvalNonce"],
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (name === "inspect_table_locks") {
      const parsed = PostgresLockSchema.parse(args);
      if (parsed.tableName === "orders" || parsed.tableName === "public.orders") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                lockedTable: "orders",
                activeLocks: [
                  {
                    pid: 14092,
                    mode: "AccessExclusiveLock",
                    granted: true,
                    query: "ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);",
                    durationSeconds: 742,
                    waitingPids: [14101, 14104, 14110, 14115],
                  },
                ],
                totalBlockedQueries: 18,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ lockedTable: parsed.tableName, activeLocks: [], totalBlockedQueries: 0 }) }],
      };
    }

    if (name === "explain_analyze_query") {
      PostgresExplainSchema.parse(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              "Plan": {
                "Node Type": "LockRows",
                "Actual Startup Time": 1419.8,
                "Actual Total Time": 1420.2,
                "Actual Rows": 0,
                "Actual Loops": 1,
                "Plans": [
                  {
                    "Node Type": "Seq Scan",
                    "Relation Name": "orders",
                    "Filter": "(status = 'PENDING'::text)",
                  },
                ],
              },
              "Execution Time": 1420.4,
              "Planning Time": 0.12,
              "Diagnosis": "Severe lock contention waiting on PID 14092 (AccessExclusiveLock on orders).",
            }, null, 2),
          },
        ],
      };
    }

    if (name === "get_active_connections") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              maxConnections: 100,
              usedConnections: 98,
              waitingTransactions: 18,
              stateBreakdown: { active: 18, idle: 80, idle_in_transaction: 0 },
            }, null, 2),
          },
        ],
      };
    }

    if (name === "execute_remediation_sql") {
      const { sql, approvalNonce } = args as { sql: string; approvalNonce: string };
      if (!approvalNonce) {
        throw new Error("Cannot execute destructive SQL without cryptographic approval nonce.");
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "SUCCESS",
              executedSql: sql,
              rowsAffected: 0,
              lockDurationMs: 3.2,
              message: "Constraint dropped and concurrent index verified. All 18 table locks released.",
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Postgres tool ${name} not found`);
  }
}
