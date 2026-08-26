# 🔐 TrueSentry Cryptographic HITL Threat Model & Security Specification

> **Standard Specification**: Formally defining the Human-in-the-Loop (HITL) cryptographic authorization boundaries, AST policy engine, tamper detection, and anti-replay guarantees in TrueSentry.

---

## 1. Threat Model & Adversary Profiles

| Threat Vector | Attack Scenario | TrueSentry Defense Mechanism | Implementation Reference |
| :--- | :--- | :--- | :--- |
| **T1: Prompt Injection / Hallucination** | LLM fabricates unverified DDL (`DROP TABLE`, unindexed keys) or skips sandbox verification. | Coordinator strictly mandates sandbox test pass ($48/48$) before generating approval payload. AST Policy Engine blocks forbidden DDL/DML. | [`packages/core/src/coordinator.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/coordinator.ts)<br>[`packages/core/src/hitl/policies.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/policies.ts) |
| **T2: In-Flight SQL Payload Tampering** | Attacker intercepts or modifies approved remediation SQL between human sign-off and execution. | Cryptographic binding: Signed execution token encapsulates $\text{SHA-256}(\text{SQL})$. Target MCP server recalculates hash and aborts on mismatch (`CryptographicIntegrityError`). | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts)<br>[`packages/mcp-servers/src/postgres.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/mcp-servers/src/postgres.ts) |
| **T3: Approval Replay Attack** | Malicious script or operator reuses an already-consumed token to execute duplicate mutations. | Single-use consumption table (`consumed: true`). Subsequent execution attempts immediately throw `Replay attack detected`. | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts) |
| **T4: Token Expiration / Stale Context** | Operator approves action hours later when system state or database schema has changed. | Strict 10-minute non-renewable TTL (`expiresAt = Date.now() + 600000`). Stale tokens throw `Security violation: Approval token expired`. | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts) |
| **T5: Sandbox Escape / Host Exfiltration** | Malicious fixture code attempts path traversal (`../../etc/shadow`) or reads host environment secrets. | Strict directory confinement (`resolveSafePath`) and environment sanitization stripping all `*_KEY`, `*_TOKEN`, `*_SECRET`, `DATABASE_*` variables. | [`packages/sandbox/src/runtime.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/sandbox/src/runtime.ts) |

---

## 2. Cryptographic Payload Binding Architecture

```
                                      [ Human SRE Approval ]
                                                 │
  Session ID ──────┐                             ▼
  Incident ID ─────┤                   ┌───────────────────┐
  Action Type ─────┼─► SHA-256 Digest ─► Signed Single-Use  │
  SQL Payload ─────┤                   │  Execution Token  │
  Sandbox Proof ───┘                   └─────────┬─────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   PostgresMcpServer   │
                                     │   execute_remediation │
                                     └───────────┬───────────┘
                                                 │
                               ┌─────────────────┴─────────────────┐
                               ▼                                   ▼
                      [ Hash Matches? ]                   [ Hash Mismatched? ]
                               │                                   │
                               ▼                                   ▼
                       ✅ Execute Non-Blocking             🚨 Abort Instantly:
                          Safe DDL Patch                   CryptographicIntegrityError
```

### Mathematical Formulation
The execution authorization digest $H_{\text{payload}}$ is computed as:
$$H_{\text{payload}} = \text{HMAC-SHA256}\Big(\text{Secret}, \text{sessionId} \parallel \text{incidentId} \parallel \text{actionType} \parallel \text{target} \parallel \text{sql} \parallel H_{\text{sandbox}}\Big)$$

---

## 3. AST Policy Precedence Matrix

| Operation Category | AST Rule Checked | Action Taken |
| :--- | :--- | :--- |
| **`DROP TABLE / DATABASE`** | Root DDL AST node is `DropStatement` | **HARD BLOCK** (`BLOCK` - Execution forbidden, no HITL prompt) |
| **`DELETE / UPDATE` without `WHERE`** | DML node missing `WhereClause` | **HARD BLOCK** (`BLOCK` - Execution forbidden) |
| **`ALTER TABLE ADD CONSTRAINT`** | Missing `NOT VALID` / blocking lock hazard | **REQUIRE HITL** (`APPROVE` - Requires sandbox proof + SRE signature) |
| **`CREATE INDEX CONCURRENTLY`** | Non-blocking concurrent index build | **REQUIRE HITL** (`APPROVE` - Requires SRE signature) |
| **`SELECT / EXPLAIN / SHOW`** | Read-only telemetry inspection | **AUTO-ALLOW** (`ALLOW` - Permitted during autonomous investigation) |

---

## 4. Verification Checklist & Audit Trail
Every incident resolution produces an immutable Merkle Audit Leaf:
- `leafHash = SHA256(incidentId + rootCauseSha + approvalToken + executionDurationMs + recoveryVerified)`
- Emitted in real-time to the SRE Command Center SSE stream and stored in SQLite state persistence (`packages/core/src/storage/db.ts`).
