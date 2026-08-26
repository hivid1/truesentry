# 🔐 TrueSentry Cryptographic HITL Threat Model & Security Specification

> **Core Architectural Thesis**: *"TrueSentry doesn't assume the agent is trustworthy. It makes the execution boundary trustworthy."*

---

## 1. Threat Model & Adversary Profiles

| Threat Vector | Attack Scenario | TrueSentry Defense Mechanism | Implementation Reference |
| :--- | :--- | :--- | :--- |
| **T1: Prompt Injection / Hallucination** | LLM fabricates unverified DDL (`DROP TABLE`, unindexed keys) or adopts poisoned tool instructions. | Structural Invariant: $\text{UNTRUSTED DATA} \to \text{OBSERVATION} \to \text{EVIDENCE} \to \text{POLICY} \to \text{HITL} \to \text{EXECUTION}$. Policy Engine comment stripping + hard block. | [`packages/core/src/hitl/policies.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/policies.ts)<br>[`packages/core/tests/prompt_injection_defense.test.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/tests/prompt_injection_defense.test.ts) |
| **T2: In-Flight Payload Tampering** | Attacker intercepts or modifies approved remediation SQL/target between human sign-off and execution. | Cryptographic binding: Signed execution token encapsulates $\text{SHA-256}(\text{sessionId} \parallel \text{incidentId} \parallel \text{actionType} \parallel \text{target} \parallel \text{sql} \parallel \text{sandboxId})$. Hash mismatch aborts instantly. | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts)<br>[`packages/core/tests/hitl_adversarial.test.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/tests/hitl_adversarial.test.ts) |
| **T3: Cross-Process Replay Attack** | Concurrent scripts or distributed workers attempt to execute the same approved token twice. | Atomic filesystem CAS / exclusive-creation lock (`O_CREAT | O_EXCL` via `fs.openSync(..., 'wx')`). Second consumer is atomically rejected. | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts) |
| **T4: Cross-Incident / Cross-Session Substitution** | Token authorized for Incident A is submitted to execute on Incident B. | Context validation: Token payload binds `sessionId` and `incidentId`. Substituted contexts are rejected with explicit security violation. | [`packages/core/src/hitl/gate.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/gate.ts) |
| **T5: Command Injection & Sandbox Escape** | Malicious fixture embeds shell metacharacters (`;`, `&&`, `$()`, `\n`) or attempts path traversal (`../../etc/shadow`). | `execSafe` spawns directly with `shell: false` (zero metacharacter expansion). Path confinement with `fs.realpathSync` rejects symlink escapes and DOS devices. | [`packages/sandbox/src/runtime.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/sandbox/src/runtime.ts)<br>[`packages/sandbox/tests/sandbox_security.test.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/sandbox/tests/sandbox_security.test.ts) |

---

## 2. Cryptographic Payload Binding Architecture

```
                                      [ Human SRE Approval ]
                                                 │
  Session ID ──────┐                             ▼
  Incident ID ─────┤                   ┌───────────────────┐
  Action Type ─────┼─► SHA-256 Digest ─► Signed Single-Use │
  Target Resource ─┤                   │  Execution Token  │
  SQL Payload ─────┤                   └─────────┬─────────┘
  Sandbox Proof ───┘                             │
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
$$H_{\text{payload}} = \text{SHA256}\Big(\text{sessionId} \parallel \text{incidentId} \parallel \text{actionType} \parallel \text{target} \parallel \text{sql} \parallel \text{sandboxId}\Big)$$

---

## 3. Four-Tier Truthfulness & Honesty Framework

| Category | Precise Definition | Evidence / Proof Reference |
| :--- | :--- | :--- |
| **1. Proven by Tests** | Deterministically validated across 11 automated verification suites (100% passing in CI). | `npm run verify` (`scripts/verify-all.js`) |
| **2. Architectural Invariants** | Structural properties guaranteed by the harness pipeline regardless of LLM reasoning. | *Untrusted investigation data cannot directly cross the authorization boundary into execution.* |
| **3. Environment-Dependent** | Process-level environment proxy blackholing on bare OS hosts; full kernel network namespace isolation (`--network none`) when running in container runtimes. | [`docs/LIMITATIONS_AND_BOUNDARIES.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/LIMITATIONS_AND_BOUNDARIES.md) |
| **4. Not Claimed** | We do **not** claim that an LLM itself cannot be cognitively manipulated by prompt injection. We prove that cognitive manipulation cannot breach the downstream policy and cryptographic execution gates. | [`packages/core/tests/evil_repository.test.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/tests/evil_repository.test.ts) |

---

## 4. Dynamic Causal Evidence Graph

TrueSentry structures all investigation facts into a directional Causal Evidence Graph emitted via SSE in real-time:

```
                  [ 🚨 Alert Ingested ]
                           │ (triggers)
                           ▼
             [ Prometheus: Error Rate ↑ 38.4% ]
                           │ (correlates_to)
                           ▼
          [ PostgreSQL: Table Lock on orders ]
                           │ (introduced_in)
                           ▼
            [ GitHub Commit: 049_migration ]
                           │ (isolated_by)
                           ▼
             [ Git Bisect: Physical Repo ]
                           │ (reproduced_in)
                           ▼
          [ OS Sandbox: 100% Tests Passed ]
                           │ (confirms)
                           ▼
              [ 🎯 ROOT CAUSE CONFIRMED ]
                           │ (requires_approval)
                           ▼
          [ Cryptographic HITL Safety Gate ]
                           │ (authorizes_execution)
                           ▼
           [ Atomic CAS Verified Remediation ]
                           │ (restores_health)
                           ▼
          [ Prometheus Verified: 0.00% Error ]
```
