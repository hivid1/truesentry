# 📋 TrueSentry Architectural Scope, Real vs. Simulated Boundaries & Known Limitations

> **Honesty & Transparency Statement**: A precise breakdown of what TrueSentry executes genuinely at the OS/cryptographic level versus what is provided via self-contained local incident fixtures, backed by measured run metrics.

---

## 1. Real vs. Fixture-Backed Architecture Matrix

| Component | Real Execution Mechanics | Fixture / Simulation Scope | Production Pluggability |
| :--- | :--- | :--- | :--- |
| **Sandbox Runtime** | **100% Real OS Processes**: Spawns isolated temporary directories, executes via `execSafe` (`shell: false`), enforces 30s timeouts (`SIGTERM`), captures exit code `124`, sanitizes environment variables, enforces path & symlink confinement. | N/A | Can be mapped to Docker/Podman container runtimes by swapping executor. |
| **Outbound Network Routing** | **Default Outbound Network Blackholing**: Sets blackhole proxy environment variables (`HTTP_PROXY=http://127.0.0.1:0`, `HTTPS_PROXY`, `ALL_PROXY`) to trap and dead-end standard HTTP/HTTPS client library requests. | Process-level environment blackhole on local host; kernel network namespaces (`--network none`) when running in container runtimes. | Container network namespaces in production. |
| **Git Bisect Engine** | **100% Real Git CLI**: Runs `git bisect start`, `git bisect bad HEAD`, `git bisect good`, and `git bisect run node test/concurrency_lock_spec.js` across physical 5-commit Git repos on disk. | Uses programmatically generated Git repo fixtures for deterministic testing. | Plugs into any live GitHub/GitLab clone URL. |
| **HITL Safety Gate** | **100% Real Cryptographic Verification & Cross-Process Atomicity**: Computes SHA-256 payload hash of `(sessionId + incidentId + actionType + target + sql + sandboxProofHash)`. Persistent file/database atomic CAS locking (`fs.openSync(..., 'wx')`) prevents cross-process and in-process concurrent replay attacks. Single-use tokens with 10m TTL. | In-memory + persistent atomic file store. | Plugs into enterprise HSM / Vault / KMS signing keys and PostgreSQL row locks. |
| **Policy Engine** | **100% Real AST Parsing & Comment Stripping**: Parses SQL statements, strips comment-injection vectors (`--`, `/* */`), detects dangerous unconstrained operations (`DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE without WHERE`), enforces AST-level rules. | N/A | Can ingest custom Rego / OPA policy bundles. |
| **MCP Servers (Dual Mode)** | Model Context Protocol servers with strict Zod schemas. Supports live HTTP Prometheus (`PROMETHEUS_URL`), live PostgreSQL via `pg` (`DATABASE_URL`), GitHub API (`GITHUB_TOKEN`), and Slack Webhooks (`SLACK_WEBHOOK_URL`). | When env vars are absent, defaults to deterministic fixture mode for zero-dependency offline judge evaluation. | Pluggable into live enterprise monitoring and databases. |
| **Multi-Model Router** | Supports live API execution to Google Gemini (`GEMINI_API_KEY`), OpenAI (`OPENAI_API_KEY`), Anthropic (`ANTHROPIC_API_KEY`), and local Ollama (`OLLAMA_BASE_URL`). | Defaults to local deterministic synthesis engine when no keys are supplied. | Transparently switches models at runtime. |
| **Session Persistence** | Durable file-backed WAL storage (`.truesentry/sessions.json`) persisting sessions across process restarts; `EventBroadcaster` replays full event backlog on SSE reconnect. | N/A | Supports file storage or PostgreSQL session stores. |

---

## 2. Four-Tier Truthfulness & Grounding Framing

| Category | Precise Definition | Verification Reference |
| :--- | :--- | :--- |
| **1. Proven by Tests** | Deterministically validated across 15 automated verification suites (100% passing in CI). | `npm run verify` (`scripts/verify-all.js`) |
| **2. Architectural Invariants** | Structural properties guaranteed by the harness pipeline regardless of LLM reasoning (*"Untrusted investigation data cannot cross the authorization boundary"*). | `packages/core/src/hitl/graph_validator.ts` |
| **3. Environment-Dependent** | Process-level environment proxy blackholing on bare OS hosts (`HTTP_PROXY=http://127.0.0.1:0`); full kernel network namespace isolation (`--network none`) when running in container runtimes. | `docs/LIMITATIONS_AND_BOUNDARIES.md` |
| **4. Not Claimed** | We do **not** claim that an LLM itself cannot be cognitively manipulated by prompt injection. We prove that cognitive manipulation cannot breach downstream policy and cryptographic execution gates. | `packages/core/tests/evil_repository.test.ts` |

> **Important Boundary Clarification**: TrueSentry does **not** claim "universal 100% security". TrueSentry passes **15/15 automated verification suites** and scores **100/100 on its internally defined 7-vector adversarial safety benchmark**.

---

## 3. Measured Benchmark Performance (Physical Run Metrics)

| Operation / Benchmark | Measured Execution Latency | Description |
| :--- | :--- | :--- |
| **Clean Monorepo Build** | **31.9s** | Full TypeScript compilation of 6 packages + Next.js 14 production export. |
| **Physical Git Bisect** | **15.0s** | Dynamic bad-commit discovery across 5 physical Git checkouts. |
| **Sandbox Confinement & Zero-Shell** | **5.7s** | Path traversal checks, symlink escapes, and `execSafe` shell:false validation. |
| **Cryptographic HITL & CAS Concurrency** | **4.0s** | 50 concurrent worker token replay probes + SHA-256 field mutation testing. |
| **Prompt Injection & Comment Stripping** | **3.6s** | AST parsing across 10 malicious DDL inputs with hidden comment payloads. |
| **Adversarial Repository Containment** | **3.6s** | Containment verification on cloned repos with malicious hooks and scripts. |
| **Dynamic Autonomy Across 5 Scenarios** | **3.6s** | Dynamic toolchain selection across DB locks, ReDoS, memory leaks, and bad deployments. |
| **Evidence Graph Invariants & Provenance** | **3.5s** | Causality verification, commit alignment, and complete regression assertions. |
| **Adversarial Chaos Matrix & Safe-Abort** | **24.7s** | Memory leak stress, safe-abort on failing patches, and timeout recovery. |
| **MCP Protocol Telemetry Servers** | **3.6s** | Native MCP servers for Prometheus, PostgreSQL, GitHub, Slack. |
| **Full E2E Incident Response Lifecycle** | **9.1s** | Complete triage: Alert $\to$ MCP queries $\to$ Bisect $\to$ Sandbox $\to$ HITL $\to$ Execution $\to$ Verification. |
| **TrueSentry 100-Point Safety Benchmark** | **3.9s** | Internal benchmark across 7 defined threat vectors. |
| **TrueForge Core Capabilities Matrix** | **10.2s** | Multi-subagent swarm, persistent sessions, and model routing. |
| **Durable Session Persistence** | **0.6s** | File-backed WAL storage across process restarts. |
| **SSE Reconnect & History Backfill** | **0.6s** | EventBroadcaster historical replay upon client reconnection. |

---

## 4. Known Limitations

1. **Supported Incident Types**:
   - **Supported**: PostgreSQL DDL lock contention (exclusive table locks), unindexed foreign keys, API gateway memory exhaustion (OOMKill leaks), connection pool exhaustion, application logic regressions, and ReDoS CPU starvation.
   - **Future Scope**: Distributed cascading network partitions, BGP route leaks, cross-region replication lag.

2. **Database Dialect**:
   - Currently tuned for PostgreSQL (specifically transactional DDL, `CREATE INDEX CONCURRENTLY`, and `ADD CONSTRAINT ... NOT VALID`).
