import { HitlApprovalRequest } from "../types.js";
import { EventBroadcaster } from "../events/emitter.js";
import crypto from "crypto";

export interface ApprovedTokenRecord {
  approvalId: string;
  sessionId: string;
  incidentId: string;
  token: string;
  nonce: string;
  payloadHash: string;
  authorizedSql: string;
  issuedAt: number;
  expiresAt: number;
  consumed: boolean;
}

export class CryptographicIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptographicIntegrityError";
  }
}

export class HitlGateEngine {
  private pendingApprovals: Map<string, { request: HitlApprovalRequest; resolve: (val: boolean) => void }> = new Map();
  private approvedTokens: Map<string, ApprovedTokenRecord> = new Map();
  private broadcaster: EventBroadcaster;

  constructor(broadcaster: EventBroadcaster) {
    this.broadcaster = broadcaster;
  }

  public static computePayloadHash(
    sessionId: string,
    incidentId: string,
    actionType: string,
    sql: string,
    sandboxId = ""
  ): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify({ sessionId, incidentId, actionType, sql: sql.trim(), sandboxId }))
      .digest("hex");
  }

  public async requestApproval(
    sessionId: string,
    incidentId: string,
    payload: Omit<HitlApprovalRequest, "approvalId" | "sessionId" | "incidentId" | "timestamp" | "nonce" | "status">
  ): Promise<boolean> {
    const approvalId = `appr_${crypto.randomBytes(8).toString("hex")}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    const payloadHash = HitlGateEngine.computePayloadHash(
      sessionId,
      incidentId,
      payload.target.actionType,
      payload.diff.after,
      payload.sandboxProof.sandboxId
    );

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
        payload: {
          ...fullRequest,
          payloadHash,
        } as unknown as Record<string, unknown>,
      });
    });
  }

  public resolveApproval(approvalId: string, decision: "APPROVE" | "REJECT"): { success: boolean; token?: string; message: string } {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending) {
      return { success: false, message: `Approval ${approvalId} not found or already resolved.` };
    }

    if (decision === "REJECT") {
      pending.request.status = "REJECTED";
      pending.resolve(false);
      this.pendingApprovals.delete(approvalId);
      return {
        success: true,
        message: `Approval ${approvalId} rejected by human operator. Execution aborted.`,
      };
    }

    // Decision === APPROVE: issue single-use cryptographic token
    const token = `sig_${crypto.randomBytes(24).toString("hex")}`;
    const payloadHash = HitlGateEngine.computePayloadHash(
      pending.request.sessionId,
      pending.request.incidentId,
      pending.request.target.actionType,
      pending.request.diff.after,
      pending.request.sandboxProof.sandboxId
    );

    const tokenRecord: ApprovedTokenRecord = {
      approvalId,
      sessionId: pending.request.sessionId,
      incidentId: pending.request.incidentId,
      token,
      nonce: pending.request.nonce,
      payloadHash,
      authorizedSql: pending.request.diff.after.trim(),
      issuedAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
      consumed: false,
    };

    this.approvedTokens.set(approvalId, tokenRecord);
    this.approvedTokens.set(token, tokenRecord);

    pending.request.status = "APPROVED";
    pending.resolve(true);
    this.pendingApprovals.delete(approvalId);

    return {
      success: true,
      token,
      message: `Approval ${approvalId} authorized. Cryptographic token issued.`,
    };
  }

  public verifyAndConsumeExecution(approvalIdOrToken: string, executedSql: string, nonce?: string): void {
    const record = this.approvedTokens.get(approvalIdOrToken);
    if (!record) {
      throw new CryptographicIntegrityError(`Unauthorized execution: No valid approval token found for '${approvalIdOrToken}'`);
    }

    if (record.consumed) {
      throw new CryptographicIntegrityError(`Replay attack detected: Approval token '${approvalIdOrToken}' has already been consumed!`);
    }

    if (Date.now() > record.expiresAt) {
      throw new CryptographicIntegrityError(`Security violation: Approval token '${approvalIdOrToken}' expired at ${new Date(record.expiresAt).toISOString()}`);
    }

    if (nonce && nonce !== record.nonce && nonce !== record.token) {
      throw new CryptographicIntegrityError(`Security violation: Invalid cryptographic nonce supplied!`);
    }

    // Cryptographic SHA-256 payload integrity check
    const executedSqlClean = executedSql.trim();
    if (executedSqlClean !== record.authorizedSql) {
      const executedHash = crypto.createHash("sha256").update(executedSqlClean).digest("hex");
      throw new CryptographicIntegrityError(
        `CRITICAL SECURITY TAMPERING: Executed SQL hash (${executedHash.substring(0, 12)}...) does not match authorized payload hash (${record.payloadHash.substring(0, 12)}...)! Execution aborted.`
      );
    }

    // Mark token as consumed (single-use guarantee)
    record.consumed = true;
  }

  public getPendingApproval(approvalId: string): HitlApprovalRequest | undefined {
    return this.pendingApprovals.get(approvalId)?.request;
  }

  public getTokenRecord(token: string): ApprovedTokenRecord | undefined {
    return this.approvedTokens.get(token);
  }
}
