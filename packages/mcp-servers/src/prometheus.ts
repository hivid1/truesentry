import { McpToolResult, PrometheusQuerySchema } from "./types.js";

export class PrometheusMcpServer {
  public name = "prometheus-telemetry";

  public listTools() {
    return [
      {
        name: "query_instant",
        description: "Evaluates a PromQL instant query against live production metrics (error rates, request latencies, pod restarts).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "PromQL expression, e.g. rate(http_requests_total{status=~'5..'}[5m])" },
          },
          required: ["query"],
        },
      },
      {
        name: "query_range",
        description: "Evaluates a PromQL range query over time to detect anomaly spikes and trend lines.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "PromQL expression" },
            step: { type: "string", description: "Query resolution step, e.g. 30s" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_firing_alerts",
        description: "Fetches active firing Prometheus Alertmanager alerts.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (name === "get_firing_alerts") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                alertname: "HighHttp5xxRate",
                service: "checkout-service",
                severity: "CRITICAL",
                instance: "checkout-prod-pod-7b98f",
                summary: "Checkout error rate reached 48.2% (Threshold: 5%)",
                firingSince: "2026-08-24T02:14:00Z",
              },
            ], null, 2),
          },
        ],
      };
    }

    if (name === "query_instant" || name === "query_range") {
      const parsed = PrometheusQuerySchema.parse(args);
      
      // Intelligent mock metrics simulation matching Incident Scenario 1
      if (parsed.query.includes("http_requests_total") || parsed.query.includes("checkout")) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "success",
                data: {
                  resultType: "matrix",
                  result: [
                    {
                      metric: { service: "checkout-service", status: "500" },
                      values: [
                        [1787537400, "0.012"],
                        [1787537430, "0.015"],
                        [1787537460, "0.010"],
                        [1787537490, "0.014"],
                        [1787537520, "0.482"],
                        [1787537550, "0.485"],
                        [1787537580, "0.479"],
                      ],
                    },
                  ],
                },
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              data: { resultType: "vector", result: [{ metric: {}, value: [Date.now() / 1000, "1.0"] }] },
            }),
          },
        ],
      };
    }

    throw new Error(`Prometheus tool ${name} not found`);
  }
}
