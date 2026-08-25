import { HitlApprovalRequest } from "../types.js";
import { EventBroadcaster } from "../events/emitter.js";
import crypto from "crypto";

export class HitlGateEngine {
  private pendingApprovals: Map<string, { request: HitlApprovalRequest; resolve: (val: boolean) => void }> = new Map();
  private broadcaster: EventBroadcaster;

  constructor(broadcaster: EventBroadcaster) {
    this.broadcaster = broadcaster;
  }

  public async requestApproval(
    sessionId: string,
    incidentId: string,
    payload: Omit<HitlApprovalRequest, "approvalId" | "sessionId" | "incidentId" | "timestamp" | "nonce" | "status">
  ): Promise<boolean> {
    const approvalId = `appr_${crypto.randomBytes(8).toString("hex")}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    const fullRequest: HitlApprovalRequest = {
      approvalId,
      sessionId,
      incidentId,
      timestamp: new Date().toISOString(),
      nonce,
      status: "PENDING",
      ...payload,
    };

    return new Promise<boolean>((resolve) => {
      this.pendingApprovals.set(approvalId, { request: fullRequest, resolve });

      this.broadcaster.broadcast(sessionId, {
        eventId: `evt_${crypto.randomBytes(8).toString("hex")}`,
        sessionId,
        type: "APPROVAL_REQUEST",
        timestamp: Date.now(),
        payload: fullRequest as unknown as Record<string, unknown>,
      });
    });
  }

  public resolveApproval(approvalId: string, decision: "APPROVE" | "REJECT"): { success: boolean; message: string } {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending) {
      return { success: false, message: `Approval ${approvalId} not found or already resolved.` };
    }

    pending.request.status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    pending.resolve(decision === "APPROVE");
    this.pendingApprovals.delete(approvalId);

    return {
      success: true,
      message: `Approval ${approvalId} resolved with decision: ${decision}`,
    };
  }

  public getPendingApproval(approvalId: string): HitlApprovalRequest | undefined {
    return this.pendingApprovals.get(approvalId)?.request;
  }
}
