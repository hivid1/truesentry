import { McpToolResult, SlackNotificationSchema } from "./types.js";

export class SlackMcpServer {
  public name = "slack-comms";

  public listTools() {
    return [
      {
        name: "send_incident_update",
        description: "Dispatches real-time incident status and post-mortem updates to SRE on-call Slack channels.",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            message: { type: "string" },
            severity: { type: "enum", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            approvalId: { type: "string" },
          },
          required: ["channel", "message", "severity"],
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (name === "send_incident_update") {
      const parsed = SlackNotificationSchema.parse(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "SENT",
              channel: parsed.channel,
              timestamp: new Date().toISOString(),
              messageId: `msg_${Math.random().toString(36).substring(7)}`,
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Slack tool ${name} not found`);
  }
}
