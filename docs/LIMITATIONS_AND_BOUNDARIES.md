# 📋 TrueSentry Architectural Scope, Real vs. Simulated Boundaries & Known Limitations

> **Honesty & Transparency Statement**: A precise breakdown of what TrueSentry executes genuinely at the OS/cryptographic level versus what is provided via self-contained local incident fixtures.

---

## 1. Real vs. Fixture-Backed Architecture Matrix

| Component | Real Execution Mechanics | Fixture / Simulation Scope | Production Pluggability |
| :--- | :--- | :--- | :--- |
| **Sandbox Runtime** | **100% Real OS Processes**: Spawns isolated temporary directories, executes `child_process.exec`, enforces 30s timeouts (`SIGTERM`), captures exit code `124`, sanitizes environment variables. | N/A | Can be mapped to Docker/Podman container runtimes by swapping executor. |
| **Git Bisect Engine** | **100% Real Git CLI**: Runs `git bisect start`, `git bisect bad HEAD`, `git bisect good`, and `git bisect run node test/concurrency_lock_spec.js` across physical 5-commit Git repos on disk. | Uses programmatically generated Git repo fixtures for deterministic testing. | Plugs into any live GitHub/GitLab clone URL. |
| **HITL Safety Gate** | **100% Real Cryptographic Verification**: Computes SHA-256 payload hash of `(sessionId + incidentId + actionType + sql + sandboxProofHash)`. Single-use tokens with 10m TTL. Enforces anti-replay and anti-tamper. | In-memory token store backed by SQLite persistence. | Plugs into enterprise HSM / Vault / KMS signing keys. |
| **Policy Engine** | **100% Real AST Parsing**: Parses SQL statements, detects dangerous unconstrained operations (`DROP TABLE`, `DELETE without WHERE`), enforces AST-level rules. | N/A | Can ingest custom Rego / OPA policy bundles. |
| **Prometheus Telemetry** | Model Context Protocol (MCP) server contract with strict Zod schemas and query endpoints. | Self-contained incident metric generator (emits error-rate curves, latency spikes, pod restarts). | Reads `PROMETHEUS_URL` from `.env` to query live Prometheus API. |
| **PostgreSQL MCP** | Real SQL query validation, cryptographic hash comparison, and lock classification. | Local mock database state representing `pg_locks` and `pg_stat_activity` for zero-cloud testing. | Reads `DATABASE_URL` from `.env` to connect to Supabase, RDS, or local PostgreSQL. |

---

## 2. Known Limitations

1. **OS Sandbox Environment**:
   - Currently isolates processes via OS temporary directories, environment stripping, and timeout enforcement.
   - For hardened multi-tenant production deployments, this should be paired with kernel namespaces (e.g. Docker, gVisor, or Firecracker microVMs).

2. **Supported Incident Types**:
   - **Supported**: PostgreSQL DDL lock contention (exclusive table locks), unindexed foreign keys, API gateway memory exhaustion (OOMKill leaks), and regression deployments.
   - **Future Scope**: Distributed cascading network partitions, BGP route leaks, cross-region replication lag.

3. **Database Dialect**:
   - Currently tuned for PostgreSQL (specifically transactional DDL, `CREATE INDEX CONCURRENTLY`, and `ADD CONSTRAINT ... NOT VALID`).
   - MySQL / Oracle support planned for v1.1.
