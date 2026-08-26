# ⚡ TrueSentry: Autonomous SRE Incident Responder & Safe Self-Healing Harness
> Built on **TrueForge**, TrueFoundry's open-source agent harness, for **The Agent Harness Hackathon** by WeMakeDevs, TrueFoundry, and Qodo.

[![CI](https://github.com/hivid1/truesentry/actions/workflows/ci.yml/badge.svg)](https://github.com/hivid1/truesentry/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TrueForge: 0.1.4](https://img.shields.io/badge/TrueForge-0.1.4-cyan.svg)](https://github.com/truefoundry/trueforge)
[![Qodo: Audited](https://img.shields.io/badge/Qodo-PR%20Audited-green.svg)](https://www.qodo.ai)

---

## 🎯 The Core Architectural Thesis

```
# THE AGENT CAN BE WRONG.
# THE EXECUTION BOUNDARY CANNOT.
```

> **"TrueSentry doesn't assume the AI agent is trustworthy. It makes the execution boundary trustworthy.**
> 
> **So let's deliberately give the agent malicious information and see what happens."**
> 
> *Key Invariant: Untrusted investigation data cannot directly cross the authorization boundary into execution. A failed investigation cannot escalate into an authorized action.*

---

## 🔌 Dual-Mode Architecture (Deterministic Simulation vs. Live Provider)

TrueSentry features a pluggable **Dual-Mode Adapter Architecture**:

1. **Deterministic Simulation Mode (Default — Zero Config)**:
   - Evaluates offline with zero external credentials, zero API rate limits, and 100% reproducible execution for judges.
   - Evaluates PromQL metrics, PostgreSQL table locks, Git commit checkouts, and Slack webhook payloads deterministically.
2. **Live Network Mode (Production Ready)**:
   - When credentials or endpoints are set in the environment (`PROMETHEUS_URL`, `DATABASE_URL`, `GITHUB_TOKEN`, `SLACK_WEBHOOK_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`), TrueSentry automatically switches to live HTTP/REST queries and real database executions.
---

## ⚙️ TrueForge Primitives: How Judges Can Observe the Harness

The official Hackathon rubric rewards genuine utilization of TrueForge primitives. TrueSentry demonstrates how every harness capability performs substantive work:

| TrueForge Primitive | TrueSentry Implementation | Where the Judge Observes It |
| :--- | :--- | :--- |
| **Connected Tools (MCP)** | 4 Native MCP Servers (Prometheus, PostgreSQL, GitHub, Slack) | Live MCP queries (`142ms`, `87ms`, `103ms`, `45ms`) in `TrueForgeRuntimePanel` & SSE stream |
| **OS Sandbox Execution** | Isolated Process Sandbox with `execSafe` (`shell: false`) | Physical repo mounted on disk; zero shell injection; dynamic patch compilation |
| **Physical Git Bisect** | Dynamic binary commit search across real disk commits | Isolates bad migration commit `049_add_orders_user_fk.sql` without hardcoded SHAs |
| **Human-in-the-Loop (HITL)** | Cryptographic SHA-256 Digest Gate + Atomic CAS Token | **Actual Live UI Pause**: Harness halts before PostgreSQL execution until SRE approves |
| **Specialized Subagents** | TelemetryScout, SandboxBisector, BlastRadiusAuditor, Scribe | Parallel subagent coordination emitted over SSE and visualized in the Causal DAG |
| **Durable Sessions** | Append-only WAL file storage (`.truesentry/sessions.json`) | State persists across process restarts (`packages/core/tests/durable_session.test.ts`) |
| **Multi-Model Routing** | Pluggable router for Gemini, OpenAI, Claude, and Ollama | Dynamic fallback from live API endpoints to offline deterministic synthesis engine |
| **Reconnect Resilience** | Event backlog buffering & backfill on client reconnection | Reconnect replay verified in `packages/core/tests/reconnect_replay.test.ts` |

---

## 📊 The Dynamic Causal Evidence Graph

Instead of presenting disjointed logs, TrueSentry structures all investigation telemetry into an **auditable, cryptographic Causal Evidence Graph** emitted over SSE in real-time (`EVIDENCE_GRAPH_UPDATE`) and verified against causality invariants:

```mermaid
graph TD
    A["🚨 02:14 AM Outage Alert<br/><code>ALERTS{alertname='Checkout500'}</code>"] -->|triggers| B["📈 Prometheus Metric Anomaly<br/><code>rate(http_requests_total[5m]) = 38.4%</code>"]
    B -->|correlates_to| C["🔒 PostgreSQL Lock Contention<br/><code>SELECT * FROM pg_locks</code>"]
    C -->|introduced_in| D["📦 GitHub Deployment<br/><code>049_add_orders_user_fk.sql</code>"]
    D -->|isolated_by| E["🔍 Physical Git Bisect<br/><code>git bisect start HEAD good_sha</code>"]
    E -->|reproduced_in| F["📦 TrueForge OS Sandbox<br/><code>100% Concurrency Tests Passed</code>"]
    F -->|confirms| G["🎯 ROOT CAUSE CONFIRMED<br/><code>AccessExclusiveLock Contention</code>"]
    G -->|requires_approval| H["🔐 Cryptographic HITL Gate<br/><code>SHA-256 Digest Bound Token</code>"]
    H -->|authorizes_execution| I["⚡ Atomic CAS Remediation<br/><code>CREATE INDEX CONCURRENTLY</code>"]
    I -->|restores_health| J["✅ Independent Recovery Re-Query<br/><code>rate(http_requests_total[1m]) = 0.00%</code>"]

    classDef incident fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fee2e2;
    classDef telemetry fill:#4c0519,stroke:#f43f5e,stroke-width:2px,color:#ffe4e6;
    classDef git fill:#083344,stroke:#06b6d4,stroke-width:2px,color:#ecfeff;
    classDef sandbox fill:#172554,stroke:#3b82f6,stroke-width:2px,color:#eff6ff;
    classDef crypto fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#faf5ff;
    classDef recovery fill:#022c22,stroke:#10b981,stroke-width:2px,color:#ecfdf5;

    class A incident;
    class B,C telemetry;
    class D,E git;
    class F,G sandbox;
    class H crypto;
    class I,J recovery;
```

---

## 🛡️ Four-Tier Truthfulness & Honesty Framework

| Category | Precise Definition | Verification Reference |
| :--- | :--- | :--- |
| **1. Proven by Tests** | Deterministically validated across 15 automated verification suites (100% passing in CI). | `npm run verify` (`scripts/verify-all.js`) |
| **2. Architectural Invariants** | Structural properties guaranteed by the harness pipeline regardless of LLM reasoning (*"Untrusted investigation data cannot cross the authorization boundary"*). | [`packages/core/src/hitl/graph_validator.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/graph_validator.ts) |
| **3. Environment-Dependent** | Process-level environment proxy blackholing on bare OS hosts (`HTTP_PROXY=http://127.0.0.1:0`); full kernel network namespace isolation (`--network none`) when running in container runtimes. | [`docs/LIMITATIONS_AND_BOUNDARIES.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/LIMITATIONS_AND_BOUNDARIES.md) |
| **4. Not Claimed** | We do **not** claim that an LLM itself cannot be cognitively manipulated by prompt injection. We prove that cognitive manipulation cannot breach the downstream policy and cryptographic execution gates. | [`packages/core/tests/evil_repository.test.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/tests/evil_repository.test.ts) |

> **Important Boundary Clarification**: TrueSentry passes **15/15 automated verification suites** and scores **100/100 on its internally defined 7-vector adversarial safety benchmark**.

---

## ⏱️ Measured Benchmark Performance (Physical Run Metrics)

| Benchmark / Operation | Measured Timing | Verification Method |
| :--- | :--- | :--- |
| **Clean Monorepo Build** | **31.9s** | TypeScript compilation across 6 packages + Next.js 14 production export |
| **Physical Git Bisect** | **15.0s** | Dynamic bad-commit discovery across 5 physical Git checkouts |
| **Sandbox Confinement & Zero-Shell** | **5.7s** | Path traversal checks, symlink escapes, `execSafe` `shell: false` |
| **Cryptographic HITL & CAS Concurrency** | **4.0s** | 50 concurrent worker replay probes + SHA-256 field mutation testing |
| **Prompt Injection & Comment Stripping** | **3.6s** | AST parsing across 10 malicious DDL inputs with hidden comments |
| **Adversarial Repository Containment** | **3.6s** | Containment verification on cloned repos with malicious hooks |
| **Dynamic Autonomy Across 5 Incidents** | **3.6s** | Dynamic toolchain selection across DB locks, ReDoS, memory leaks |
| **Evidence Graph Invariants & Provenance** | **3.5s** | Causality verification, commit alignment, and complete regression assertions |
| **Adversarial Chaos & Safe-Abort** | **32.2s** | Memory leak stress, safe-abort on failing patches, and timeout recovery |
| **MCP Protocol Telemetry Servers** | **3.6s** | Native MCP servers for Prometheus, PostgreSQL, GitHub, Slack |
| **Full E2E Incident Response Lifecycle** | **10.9s** | Complete triage: Alert $\to$ MCP queries $\to$ Bisect $\to$ Sandbox $\to$ HITL $\to$ Execution $\to$ Verification |
| **TrueSentry 100-Point Safety Benchmark** | **3.9s** | Internal benchmark across 7 defined threat vectors |
| **TrueForge Core Capabilities Matrix** | **10.2s** | Multi-subagent swarm, persistent sessions, and model routing |
| **Durable Session Persistence** | **0.6s** | File-backed WAL storage across process restarts |
| **SSE Reconnect & History Backfill** | **0.6s** | EventBroadcaster historical replay upon client reconnection |

---

## 🚀 Quickstart (Zero-Config Setup)

### Prerequisites
- Node.js >= 20.x

### Run the Full Hackathon Submission Preflight Auditor
```bash
npm run verify:submission
```

### Run the Master Verification (All 15 Criteria)
```bash
# Clone the repository:
git clone https://github.com/hivid1/truesentry.git
cd truesentry

# Install, build, and verify all 15 criteria in one command:
npm install
npm run build
npm run verify
```

### Run the 3-Minute Demo Teleprompter Runner
```bash
npm run demo:record
```

### Run the Interactive SRE Operations Command Center
```bash
npm run demo
```
Open **http://localhost:3000** to access the real-time SRE dashboard, inspect the Causal Evidence Graph, and test the **Judge Red-Team Attack Lab**.

---

## 🏆 Hackathon Track Alignment & Submission Assets

| Track | Target Prize | TrueSentry Implementation & Submission Asset |
| :--- | :--- | :--- |
| **Double-O Track** *(TrueFoundry)* | **NVIDIA DGX Spark** ($5,000 AI Supercomputer) | Deep TrueForge Harness integration: [`docs/TRUEFORGE_CAPABILITY_MATRIX.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/TRUEFORGE_CAPABILITY_MATRIX.md), `TrueForgeRuntimePanel`, 4 native MCP servers, subagent swarm, OS sandbox, durable session WAL, and cryptographic HITL. |
| **Q Branch Track** *(Qodo)* | **Apple Mac Mini** ($1,000) | Detailed engineering architecture in [`CODE_QUALITY.md`](file:///c:/Users/vidwa/HACK/trueforge/CODE_QUALITY.md) + Full PR audit trail in [`QODO_REVIEW_EVIDENCE.md`](file:///c:/Users/vidwa/HACK/trueforge/QODO_REVIEW_EVIDENCE.md) (17 Merged PRs). |
| **Savile Row Track** | **Apple iPad** *(for each team member)* | Next.js 14 SRE Command Center with real-time SSE streaming, `AgentStateHeader` ("Now / Next / Waiting For"), clickable **Causal Evidence Graph**, and **Judge Red-Team Attack Lab**. |
| **Field Report Track** | **Keychron Mechanical Keyboard** | In-depth technical case study: [`docs/BLOG_POST.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/BLOG_POST.md) (*"The AI Agent Was Compromised. Production Wasn't."*). |
| **Top Social Posts** | **Hackathon Swag & Community Showcase** | 5-post attack campaign and 30-second attack video breakdown in [`docs/SOCIAL_POST.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/SOCIAL_POST.md). |
| **Judge Defense & Scorecard** | **Hostile Q&A & Category Audit** | Technical defense in [`docs/HOSTILE_JUDGE_QA.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/HOSTILE_JUDGE_QA.md) + Full rubric audit in [`docs/SCORECARD_AND_PRIZE_AUDIT.md`](file:///c:/Users/vidwa/HACK/trueforge/docs/SCORECARD_AND_PRIZE_AUDIT.md). |

---

## 📜 License
MIT © 2026 TrueSentry Team.
