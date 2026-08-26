# 🔬 TrueSentry Reproducibility & Judge Evaluation Playbook

> **Judge & Evaluator Guide**: Step-by-step instructions to independently verify, stress-test, and adversarially probe TrueSentry from a clean environment.

---

## 1. Clean-Clone Execution (Zero External State)

TrueSentry is 100% self-contained. It requires **no cloud credentials, no live AWS databases, and no external API tokens** to run the complete incident investigation and recovery lifecycle.

```bash
# 1. Clean clone
git clone https://github.com/hivid1/truesentry.git
cd truesentry

# 2. Install dependencies & build packages
npm install
npm run build

# 3. Run the Master 8-Point Adversarial Verification Suite
npm run verify
```

Expected output:
```text
[1/8] Running: 1. Clean-Clone Monorepo TypeScript Build... ✅ PASSED
[2/8] Running: 2. Real Git Bisect & Arbitrary Bad Commit Discovery (Judge Test)... ✅ PASSED
[3/8] Running: 3. OS Process Sandbox & Timeout Enforcement... ✅ PASSED
[4/8] Running: 4. Cryptographic HITL Gate, Tamper Defense & Replay Prevention... ✅ PASSED
[5/8] Running: 5. Adversarial Chaos Matrix (Memory Leak, Failure Abort, Tampering)... ✅ PASSED
[6/8] Running: 6. MCP Protocol Telemetry Servers (Prometheus, Postgres, GitHub, Slack)... ✅ PASSED
[7/8] Running: 7. Full End-to-End Autonomous Incident Response Lifecycle... ✅ PASSED
[8/8] Running: 8. Command Center UI Production Compilation... ✅ PASSED

🎉 ALL 8/8 CRITICAL HACKATHON VERIFICATIONS PASSED 100% GREEN!
```

---

## 2. The Dynamic Bad Commit Test ("The Judge Test")

To prove that TrueSentry genuinely executes `git bisect` binary search rather than relying on a hardcoded SHA:

Run the dedicated judge test suite:
```bash
npx vitest run packages/sandbox/tests/judge_test.test.ts
```

### What this test does:
1. Generates 3 separate physical 5-commit Git repositories on disk:
   - **Repository 1**: Injects bad migration at **Commit #2** (`048_add_users_role.sql`).
   - **Repository 2**: Injects bad migration at **Commit #3** (`049_add_orders_user_fk.sql`).
   - **Repository 3**: Injects bad migration at **Commit #4** (`050_add_payment_tokens.sql`).
2. Runs `GitBisectRunner.runBisect()` on each repository.
3. Asserts that the discovered SHA and offending filename match the dynamically injected position in every case.

---

## 3. Adversarial Chaos & Security Probes

Run the full adversarial matrix:
```bash
npx vitest run packages/core/tests/adversarial.test.ts
```

| Probe | Adversarial Input | Expected Outcome |
| :--- | :--- | :--- |
| **SQL Tampering** | Changing approved SQL to `DROP TABLE orders CASCADE;` | Throws `CryptographicIntegrityError`, aborts instantly. |
| **Approval Replay** | Attempting to reuse an authorization token twice | Throws `Replay attack detected`. |
| **Sandbox Failure** | Remediation tests fail in sandbox (0 passed / regression) | Agent halts with `SANDBOX_VERIFICATION_FAILED`, never requests human approval. |
| **Non-DB Incident** | API Gateway Memory Leak alert (0 DB locks) | Dynamically skips DB lock investigation, triages pod metrics. |
| **Human Rejection** | SRE clicks "Reject" on approval card | Halts cleanly, marks session `FAILED`, leaves database untouched. |

---

## 4. Interactive Command Center UI Demo

```bash
npm run demo
```
Open **`http://localhost:3000`** to interact with:
- **Live xterm.js sandbox terminal streaming child process output in real-time**
- **Microservice topology graph with live lock status**
- **Monaco SQL diff editor showing blocking vs non-blocking DDL**
- **Cryptographic approval modal displaying SHA-256 payload digest**
