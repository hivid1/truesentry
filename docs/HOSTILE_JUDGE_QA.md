# 🥋 TrueSentry: Hostile Judge Q&A & Technical Defense Guide

> **Purpose**: A rigorous, no-hand-waving technical defense document answering the toughest questions a judge could ask, with exact code pointers and reproducible terminal commands.

---

### Q1: "Where exactly is TrueForge being used?"
**Answer**:  
TrueForge is the foundational orchestration engine of TrueSentry, not a cosmetic wrapper. It handles:
1. **The Multi-Subagent Swarm** ([`packages/core/src/subagents/`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/subagents)): `TelemetryScout`, `SandboxBisector`, `BlastRadiusAuditor`, and `PostMortemScribe`.
2. **The MCP Protocol Toolchain** ([`packages/mcp-servers/`](file:///c:/Users/vidwa/HACK/trueforge/packages/mcp-servers)): Prometheus, PostgreSQL, GitHub, and Slack servers adhering to the Model Context Protocol.
3. **The OS Process Sandbox** ([`packages/sandbox/src/runtime.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/sandbox/src/runtime.ts)): Isolated execution of untrusted scripts with `execSafe`, path traversal prevention, and secret scrubbing.
4. **Durable Sessions & Event Broadcaster** ([`packages/core/src/storage/db.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/storage/db.ts)): Durable file-backed WAL session tracking across restarts and chronological event replay on reconnection.
- **Visual Proof**: In the UI, the `TrueForge Execution Panel` displays live session metadata, subagent lifecycle states, and individual MCP call latencies (e.g. `Prometheus MCP: 142ms`).
- **Test Verification**: `npx vitest run packages/core/tests/trueforge_capabilities.test.ts`

---

### Q2: "Is this actually autonomous or is the workflow hardcoded?"
**Answer**:  
The workflow is dynamically autonomous. The agent dynamically decides which MCP tools to invoke based on real-time observations:
- When Prometheus reports database lock contention $\to$ the agent invokes `postgres.inspect_table_locks`.
- When Prometheus reports memory saturation or OOM kills $\to$ the agent skips SQL tools and invokes container pod metric inspections.
- In `packages/core/tests/dynamic_autonomy_matrix.test.ts`, the agent is evaluated against **5 distinct outage archetypes** (Database Lock, Memory Leak, Connection Pool Exhaustion, Validation Failure, Catastrophic Regex ReDoS), dynamically selecting distinct toolchains for each.

---

### Q3: "Are these MCP servers connected to live external systems or simulations?"
**Answer**:  
TrueSentry features a pluggable **Dual-Mode Adapter Architecture**:
1. **Deterministic Simulation Mode (Default — Zero-Key Offline Mode)**:
   - For judging reproducibility, TrueSentry runs offline with zero external credentials, zero API rate limits, and 100% deterministic test passes.
   - Evaluates PromQL metrics, PostgreSQL table locks, Git commit checkouts, and Slack webhook payloads deterministically.
2. **Live Network Mode (Optional Real Integrations / Environment-Dependent)**:
   - When environment variables are provided (`PROMETHEUS_URL`, `DATABASE_URL`, `GITHUB_TOKEN`, `SLACK_WEBHOOK_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`), the MCP servers issue live HTTP requests, query real PostgreSQL databases, and dispatch live Slack webhooks.
- **Test Verification**: `npx vitest run packages/mcp-servers/tests/mcp.test.ts`

---

### Q4: "Is Git bisect actually running against a physical repository?"
**Answer**:  
Yes. TrueSentry creates physical multi-commit Git repositories on disk (in `os.tmpdir()`) containing real commit histories (`047_seed`, `048_add_cart`, `049_add_orders_user_fk`, `050_update_metrics`).
- The `GitBisectRunner` physically invokes `git bisect start HEAD <good_sha>` and runs the concurrency test suite against each checked-out commit until the bad commit SHA is mathematically isolated.
- **Arbitrary Bad Commit Judge Test**: In `packages/sandbox/tests/judge_test.test.ts`, the bad migration is dynamically inserted at an arbitrary, randomized commit position. `git bisect` reliably discovers the changed SHA every time.

---

### Q5: "Can I manipulate the evidence in the Evidence Graph?"
**Answer**:  
No. Every node in the Causal Evidence Graph is cryptographically bound by an unalterable SHA-256 evidence hash:
$$\text{Hash} = H(\text{incidentId} \parallel \text{type} \parallel \text{source} \parallel \text{queryOrCommand} \parallel \text{rawObservation} \parallel \text{timestamp})$$
If an attacker tampers with an observation or mutates the isolated commit (e.g. from `049_add_orders_user_fk` to `049_fake_migration`):
- `EvidenceGraphValidator.assertValidGraph()` detects `MISMATCHED_COMMIT_EVIDENCE` or a broken SHA-256 chain.
- `ROOT_CAUSE_CONFIRMED` is instantly revoked, and all downstream execution gates are permanently disabled.
- **Test Verification**: `npx vitest run packages/core/tests/evidence_graph_integrity.test.ts`

---

### Q6: "Can I replay the approval token?"
**Answer**:  
No. Approval tokens are protected by a kernel-level Compare-And-Swap (CAS) mechanism implemented in [`packages/core/src/hitl/atomic_token_store.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/atomic_token_store.ts).
- Token consumption uses `fs.openSync(tokenPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY)`.
- If 50 concurrent worker threads attempt to replay the same approval token simultaneously, exactly **1 succeeds** and **49 receive instant ReplayAttackException** errors.
- **Test Verification**: `npx vitest run packages/core/tests/hitl_adversarial.test.ts`

---

### Q7: "What happens when remediation verification fails?"
**Answer**:  
The agent enforces a **Strict Safe-Abort Boundary**:
- In [`packages/core/src/coordinator.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/coordinator.ts), if the candidate patch does not achieve 100% test pass rate (`testsPassed < totalTests || totalTests === 0`):
- The coordinator immediately halts:
  ```
  ❌ SANDBOX VERIFICATION FAILED: Aborting execution before HITL gate.
  ```
- **Zero human approval requests are dispatched**, and **zero SQL execution occurs**.
- **Test Verification**: `npx vitest run packages/core/tests/adversarial.test.ts`

---

### Q8: "How does Session Persistence survive process restarts?"
**Answer**:  
`SessionStore` in [`packages/core/src/storage/db.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/storage/db.ts) implements file-backed WAL storage:
- State changes (status, model updates, timestamps) are flushed atomically to disk (`.truesentry/sessions.json`).
- If the harness process crashes or is restarted, a new `SessionStore` hydrates immediately from disk.
- Connected clients reconnecting to the SSE stream receive the full historical event backlog replayed in order.
- **Test Verification**: `npx vitest run packages/core/tests/durable_session.test.ts` and `npx vitest run packages/core/tests/reconnect_replay.test.ts`

---

### Q9: "Is the 100/100 score an industry certification?"
**Answer**:  
No, and we are explicitly transparent about this. The 100/100 score represents **TrueSentry's internal automated safety benchmark** across 7 defined attack vectors:
1. Command Injection Prevention (`execSafe` `shell: false`)
2. Path Traversal & Device Confinement (`/etc/passwd`, `/dev/null`)
3. Sensitive Environment Sanitization (`AWS_SECRET_ACCESS_KEY` scrub)
4. Outbound Network Blackholing (`HTTP_PROXY=http://127.0.0.1:0`)
5. Cryptographic Signed-Field Invariant Enforcement
6. Kernel-Level Single-Use CAS Token Consumption
7. Comment-Stripping AST SQL Injection Defense
- See [`docs/LIMITATIONS_AND_BOUNDARIES.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/LIMITATIONS_AND_BOUNDARIES.md) for full formal framing.
- **Test Verification**: `npx vitest run packages/core/tests/security_benchmark.test.ts`

---

### Q10: "Can I reproduce this from a fresh clone?"
**Answer**:  
Yes. TrueSentry has zero required global binaries, zero Docker daemon requirements, and zero mandatory cloud accounts:
```bash
git clone https://github.com/hivid1/truesentry.git
cd truesentry
npm install
npm run verify:submission
```
This runs the master submission preflight auditor, compiling all packages and executing all 15 verification suites 100% green.
