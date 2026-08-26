import { HitlApprovalRequest } from "../types.js";
import { EventBroadcaster } from "../events/emitter.js";
import crypto from "crypto";

export interface ApprovedTokenRecord {
  approvalId: string;
  sessionId: string;
  incidentId: string;
  actionType: string;
  target: string;
  sandboxId: string;
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

export interface ExecutionContext {
  sessionId?: string;
  incidentId?: string;
  actionType?: string;
  target?: string;
  sandboxId?: string;
  nonce?: string;
}

export class HitlGateEngine {
  private pendingApprovals: Map<string, { request: HitlApprovalRequest; resolve: (val: boolean) => void }> = new Map();
  private approvedTokens: Map<string, ApprovedTokenRecord> = new Map();
  private activeConsumptions: Set<string> = new Set();
  private broadcaster: EventBroadcaster;

  constructor(broadcaster: EventBroadcaster) {
    this.broadcaster = broadcaster;
  }

  public static computePayloadHash(
    sessionId: string,
    incidentId: string,
    actionType: string,
    sql: string,
    sandboxId = "",
    target = ""
  ): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify({ sessionId, incidentId, actionType, target, sql: sql.trim(), sandboxId }))
      .digest("hex");
  }

  public async requestApproval(
    sessionId: string,
    incidentId: string,
    payload: Omit<HitlApprovalRequest, "approvalId" | "sessionId" | "incidentId" | "timestamp" | "nonce" | "status">
  ): Promise<boolean> {
    const approvalId = `appr_${crypto.randomBytes(8).toString("hex")}`;
    const nonce = crypto.randomBytes(16).toString("hex");

    const targetResource = payload.target.resource || payload.target.system || "";
    const payloadHash = HitlGateEngine.computePayloadHash(
      sessionId,
      incidentId,
      payload.target.actionType,
      payload.diff.after,
      payload.sandboxProof.sandboxId,
      targetResource
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
    const targetResource = pending.request.target.resource || pending.request.target.system || "";
    const payloadHash = HitlGateEngine.computePayloadHash(
      pending.request.sessionId,
      pending.request.incidentId,
      pending.request.target.actionType,
      pending.request.diff.after,
      pending.request.sandboxProof.sandboxId,
      targetResource
    );

    const tokenRecord: ApprovedTokenRecord = {
      approvalId,
      sessionId: pending.request.sessionId,
      incidentId: pending.request.incidentId,
      actionType: pending.request.target.actionType,
      target: targetResource,
      sandboxId: pending.request.sandboxProof.sandboxId,
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

  public verifyAndConsumeExecution(
    approvalIdOrToken: string,
    executedSql: string,
    contextOrNonce?: string | ExecutionContext
  ): void {
    const record = this.approvedTokens.get(approvalIdOrToken);
    if (!record) {
      throw new CryptographicIntegrityError(`Unauthorized execution: No valid approval token found for '${approvalIdOrToken}'`);
    }

    // Atomic consumption lock: prevents concurrent replay race condition
    if (record.consumed || this.activeConsumptions.has(record.approvalId)) {
      throw new CryptographicIntegrityError(`Replay attack detected: Approval token '${approvalIdOrToken}' has already been consumed!`);
    }
    this.activeConsumptions.add(record.approvalId);

    try {
      if (Date.now() > record.expiresAt) {
        throw new CryptographicIntegrityError(`Security violation: Approval token '${approvalIdOrToken}' expired at ${new Date(record.expiresAt).toISOString()}`);
      }

      let context: ExecutionContext = {};
      if (typeof contextOrNonce === "string") {
        context = { nonce: contextOrNonce };
      } else if (contextOrNonce) {
        context = contextOrNonce;
      }

      // Check Nonce
      if (context.nonce && context.nonce !== record.nonce && context.nonce !== record.token) {
        throw new CryptographicIntegrityError(`Security violation: Invalid cryptographic nonce supplied!`);
      }

      // Check Cross-Session Substitution
      if (context.sessionId && context.sessionId !== record.sessionId) {
        throw new CryptographicIntegrityError(
          `Security violation: Cross-session approval substitution detected! Expected session '${record.sessionId}', but got '${context.sessionId}'.`
        );
      }

      // Check Cross-Incident Substitution
      if (context.incidentId && context.incidentId !== record.incidentId) {
        throw new CryptographicIntegrityError(
          `Security violation: Cross-incident approval substitution detected! Expected incident '${record.incidentId}', but got '${context.incidentId}'.`
        );
      }

      // Check Action Type Mutation
      if (context.actionType && context.actionType !== record.actionType) {
        throw new CryptographicIntegrityError(
          `Security violation: Action type mutation detected! Expected '${record.actionType}', but got '${context.actionType}'.`
        );
      }

      // Check Target Resource Mutation
      if (context.target && context.target !== record.target) {
        throw new CryptographicIntegrityError(
          `Security violation: Target resource mutation detected! Expected '${record.target}', but got '${context.target}'.`
        );
      }

      // Check Sandbox Proof Mutation
      if (context.sandboxId && context.sandboxId !== record.sandboxId) {
        throw new CryptographicIntegrityError(
          `Security violation: Sandbox proof mutation detected! Expected '${record.sandboxId}', but got '${context.sandboxId}'.`
        );
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
    } finally {
      this.activeConsumptions.delete(record.approvalId);
    }
  }

  public getPendingApproval(approvalId: string): HitlApprovalRequest | undefined {
    return this.pendingApprovals.get(approvalId)?.request;
  }

  public getTokenRecord(token: string): ApprovedTokenRecord | undefined {
    return this.approvedTokens.get(token);
  }
}
