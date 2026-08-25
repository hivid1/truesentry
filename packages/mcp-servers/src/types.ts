import { z } from "zod";

export interface McpToolResult {
  content: Array<{
    type: "text" | "json";
    text: string;
  }>;
  isError?: boolean;
}

export const PrometheusQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  step: z.string().optional().default("30s"),
});

export const PostgresLockSchema = z.object({
  tableName: z.string().min(1, "Table name is required"),
});

export const PostgresExplainSchema = z.object({
  query: z.string().min(1, "Query is required"),
});

export const GitHubCommitDiffSchema = z.object({
  baseSha: z.string(),
  headSha: z.string(),
});

export const SlackNotificationSchema = z.object({
  channel: z.string(),
  message: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  approvalId: z.string().optional(),
});
