# 📋 TrueSentry Architectural Scope, Real vs. Simulated Boundaries & Known Limitations

> **Honesty & Transparency Statement**: A precise breakdown of what TrueSentry executes genuinely at the OS/cryptographic level versus what is provided via self-contained local incident fixtures.

---

## 1. Real vs. Fixture-Backed Architecture Matrix

| Component | Real Execution Mechanics | Fixture / Simulation Scope | Production Pluggability |
| :--- | :--- | :--- | :--- |
| **Sandbox Runtime** | **100% Real OS Processes**: Spawns isolated temporary directories, executes via `execSafe` (`shell: false`), enforces 30s timeouts (`SIGTERM`), captures exit code `124`, sanitizes environment variables, enforces path & symlink confinement. | N/A | Can be mapped to Docker/Podman container runtimes by swapping executor. |
| **Outbound Network Routing** | **Default Outbound Network Blackholing**: Sets blackhole proxy environment variables (`HTTP_PROXY=http://127.0.0.1:0`, `HTTPS_PROXY`, `ALL_PROXY`) to trap and dead-end standard HTTP/HTTPS client library requests. | Process-level environment blackhole on local host; kernel network namespaces (`--network none`) when running in container runtimes. | Container network namespaces in production. |
| **Git Bisect Engine** | **100% Real Git CLI**: Runs `git bisect start`, `git bisect bad HEAD`, `git bisect good`, and `git bisect run node test/concurrency_lock_spec.js` across physical 5-commit Git repos on disk. | Uses programmatically generated Git repo fixtures for deterministic testing. | Plugs into any live GitHub/GitLab clone URL. |
| **HITL Safety Gate** | **100% Real Cryptographic Verification & Cross-Process Atomicity**: Computes SHA-256 payload hash of `(sessionId + incidentId + actionType + target + sql + sandboxProofHash)`. Persistent file/database atomic CAS locking (`fs.openSync(..., 'wx')`) prevents cross-process and in-process concurrent replay attacks. Single-use tokens with 10m TTL. | In-memory + persistent atomic file store. | Plugs into enterprise HSM / Vault / KMS signing keys and PostgreSQL row locks. |
| **Policy Engine** | **100% Real AST Parsing & Comment Stripping**: Parses SQL statements, strips comment-injection vectors (`--`, `/* */`), detects dangerous unconstrained operations (`DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE without WHERE`), enforces AST-level rules. | N/A | Can ingest custom Rego / OPA policy bundles. |
| **Prometheus Telemetry** | Model Context Protocol (MCP) server contract with strict Zod schemas and query endpoints. | Self-contained incident metric generator (emits error-rate curves, latency spikes, pod restarts). | Reads `PROMETHEUS_URL` from `.env` to query live Prometheus API. |
| **PostgreSQL MCP** | Real SQL query validation, cryptographic hash comparison, and lock classification. | Local mock database state representing `pg_locks` and `pg_stat_activity` for zero-cloud testing. | Reads `DATABASE_URL` from `.env` to connect to Supabase, RDS, or local PostgreSQL. |

---

## 2. Security Invariants & Boundaries

1. **Untrusted Data Boundary**:
   - **Core Invariant**: *Untrusted investigation data cannot directly cross the authorization boundary into execution.*
   - We do not claim that an LLM's reasoning cannot be influenced by prompt injection. Rather, we prove that even if an attacker injects malicious instructions inside Git commit messages, source code, SQL comments, or MCP tool returns (`SYSTEM OVERRIDE: DROP TABLE`), downstream Policy-as-Code and Cryptographic HITL Gates unconditionally hard-block unauthorized execution.

2. **OS Sandbox Environment & Network Isolation**:
   - On bare OS hosts, subprocesses are executed with `shell: false` (zero metacharacter expansion), path confinement with symlink target checking, host secret stripping, process tree cleanup, and default outbound network proxy blackholing.
   - For multi-tenant hardened cloud deployments, TrueForge pairs with kernel-level container namespaces (Docker `--network none`, gVisor, or Firecracker microVMs).

3. **Cross-Process Concurrency**:
   - Token consumption utilizes OS-level atomic file creation locks (`O_CREAT | O_EXCL`), ensuring that concurrent requests across multiple processes or node instances cannot execute the same cryptographic approval token more than once.

---

## 3. Known Limitations

1. **Supported Incident Types**:
   - **Supported**: PostgreSQL DDL lock contention (exclusive table locks), unindexed foreign keys, API gateway memory exhaustion (OOMKill leaks), connection pool exhaustion, application logic regressions, and ReDoS CPU starvation.
   - **Future Scope**: Distributed cascading network partitions, BGP route leaks, cross-region replication lag.

2. **Database Dialect**:
   - Currently tuned for PostgreSQL (specifically transactional DDL, `CREATE INDEX CONCURRENTLY`, and `ADD CONSTRAINT ... NOT VALID`).
   - MySQL / Oracle support planned for v1.1.
