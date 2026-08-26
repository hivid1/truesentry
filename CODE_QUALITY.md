# 🏛️ TrueSentry Code Quality & Architecture Specification

> Built for the **Q Branch Track (Best Code Quality)** — audited with **Qodo AI**.

---

## 1. Monorepo Architectural Hierarchy & Dependency Boundaries

TrueSentry is structured as a strict multi-package TypeScript monorepo with composite project references, enforcing zero circular dependencies and explicit separation of concerns:

```
truesentry/
├── apps/
│   └── command-center/       # Next.js 14 App Router UI (Savile Row Track)
│
├── packages/
│   ├── cli/                  # Terminal CLI Incident Responder (`truesentry`)
│   ├── core/                 # TrueForge Agent Harness, Policy Engine, SSE Server, & HITL Gate
│   │   ├── coordinator.ts    # Multi-agent orchestrator & state machine
│   │   ├── hitl/
│   │   │   ├── crypto_gate.ts      # SHA-256 payload digest & token store
│   │   │   ├── atomic_token_store.ts# Atomic CAS filesystem lock (O_CREAT | O_EXCL)
│   │   │   ├── policies.ts         # AST SQL parser & comment stripping
│   │   │   └── graph_validator.ts  # Causal invariant & provenance validator
│   │   └── types.ts          # Strongly typed Zod & TypeScript interfaces
│   │
│   ├── mcp-servers/          # Native Model Context Protocol (MCP) telemetry servers
│   │   ├── prometheus.ts     # PromQL query server & metric anomaly generator
│   │   ├── postgres.ts       # pg_locks & pg_stat_activity analyzer
│   │   ├── github.ts         # Deployment log & commit history inspector
│   │   └── slack.ts          # Incident commander webhook dispatch
│   │
│   ├── sandbox/              # Isolated OS Process Sandbox & Dynamic Git Bisector
│   │   ├── runtime.ts        # execSafe (shell: false), path confinement & blackholing
│   │   └── bisect.ts         # Physical Git bisect execution loop
│   │
│   └── scenarios/            # Multi-commit physical Git repositories & incident fixtures
│
├── scripts/
│   ├── verify-all.js         # Master 12-Point Adversarial & Security Runner
│   └── record-demo.js        # 6-Act 3-Minute Demo Teleprompter Runner
│
├── .qodo/config.yaml         # Qodo AI Code Quality & Review Rules
├── .qodo.toml                # Qodo Workspace Configuration
└── .github/workflows/ci.yml  # Automated GitHub Actions CI Matrix
```

---

## 2. Engineering Guarantees & Defensive Programming

### A. Zero-Shell Execution (`execSafe`)
- **Principle**: Shell metacharacter expansion is the root cause of command injection.
- **Implementation**: [`packages/sandbox/src/runtime.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/sandbox/src/runtime.ts) invokes child processes using Node's `child_process.execFile` with `shell: false`. Arguments are passed as a discrete array of strings:
  ```typescript
  execFile(command, args, { shell: false, env: sanitizedEnv, timeout: 30000 });
  ```
- **Guaranteed Invariant**: Input containing `; rm -rf /`, `& whoami`, or `| cat /etc/passwd` is treated as literal argument text and cannot spawn sub-shells.

### B. Path & Symlink Confinement
- **Principle**: Untrusted archives or LLM file writes must not escape their isolated workspace.
- **Implementation**: Every path is checked with `path.resolve` and `fs.realpathSync` to ensure `resolvedPath.startsWith(sandboxRoot)`. Null bytes (`\0`), Windows DOS 8.3 devices (`CON`, `PRN`, `AUX`, `NUL`), and directory traversal (`../../`) are rejected with explicit errors.

### C. Deterministic AST Policy Engine
- **Principle**: Regular expressions on SQL are vulnerable to comment obfuscation.
- **Implementation**: [`packages/core/src/hitl/policies.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/policies.ts) first performs lexical comment stripping (`--` and `/* ... */`), then parses SQL into AST structures.
  - Hard blocks root DDL commands: `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, `ALTER TABLE ... DROP`.
  - Rejects unbounded mutations: `DELETE` or `UPDATE` missing a deterministic `WHERE` clause.

### D. Cryptographic Token CAS Atomicity
- **Principle**: Concurrent worker nodes or replayed requests must not execute approved actions twice.
- **Implementation**: [`packages/core/src/hitl/atomic_token_store.ts`](file:///c:/Users/vidwa/HACK/trueforge/packages/core/src/hitl/atomic_token_store.ts) uses kernel-level atomic file creation semantics via `fs.openSync(path, 'wx')` (`O_CREAT | O_EXCL`).
  - First caller consumes token atomically.
  - All concurrent or sequential replay callers receive `ReplayAttackException`.

---

## 3. Strict Type-Safety & Validation Matrix

- **TypeScript Compiler Options**: Enforces `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, `"noUnusedLocals": true`, `"exactOptionalPropertyTypes": true`.
- **Runtime Boundary Validation**: All Model Context Protocol tool parameters and coordinator event payloads are validated at runtime via **Zod schemas**.

---

## 4. Test Coverage & Adversarial Benchmark Matrix

TrueSentry maintains **15 automated test suites (100% Passing)**:

| Suite # | Test File | Key Invariant / Property Verified |
| :--- | :--- | :--- |
| **1** | `npm run build` | Zero type errors across all packages & Next.js production build |
| **2** | `packages/sandbox/tests/judge_test.test.ts` | Arbitrary bad-commit discovery via dynamic `git bisect` |
| **3** | `packages/sandbox/tests/sandbox_security.test.ts` | Zero-shell command injection, symlink escapes, proxy blackholing |
| **4** | `packages/core/tests/hitl_adversarial.test.ts` | Cryptographic signed-field mutations & 50-worker concurrent replay |
| **5** | `packages/core/tests/prompt_injection_defense.test.ts` | Comment-hidden SQL injections & unconstrained DDL blocking |
| **6** | `packages/core/tests/evil_repository.test.ts` | Multi-vector prompt injection in commits, files, tool outputs |
| **7** | `packages/core/tests/dynamic_autonomy_matrix.test.ts` | Autonomous toolchain selection across 5 distinct outage archetypes |
| **8** | `packages/core/tests/evidence_graph_integrity.test.ts` | Causal evidence hashes, provenance source identity, commit alignment |
| **9** | `packages/core/tests/adversarial.test.ts` | Chaos memory leaks, safe-abort on failing patches, timeout handling |
| **10** | `packages/mcp-servers/tests/mcp.test.ts` | MCP server schemas and PromQL/Postgres tool responses |
| **11** | `packages/core/tests/e2e.test.ts` | Full lifecycle: Alert $\to$ Bisect $\to$ Sandbox $\to$ HITL $\to$ Recovery |
| **12** | `packages/core/tests/security_benchmark.test.ts` | 100-Point Internal Adversarial Safety Benchmark (7 Threat Vectors) |
| **13** | `packages/core/tests/trueforge_capabilities.test.ts` | TrueForge Core: Subagents, Sessions, Reconnect Replay, Models |
| **14** | `packages/core/tests/durable_session.test.ts` | Durable file-backed session WAL storage across process restarts |
| **15** | `packages/core/tests/reconnect_replay.test.ts` | EventBroadcaster historical backlog replay on client reconnect |
