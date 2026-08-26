/**
 * TrueSentry Master Verification & Adversarial Security Runner
 * Validates all hackathon readiness, sandbox security, prompt injection, cryptographic HITL, and graph causality criteria.
 */
const { execSync } = require('child_process');

console.log('\n==================================================================');
console.log('🛡️  TRUESENTRY: MASTER 13-POINT ADVERSARIAL & TRUEFORGE RUNNER');
console.log('==================================================================\n');

const tests = [
  {
    name: '1. Clean-Clone Monorepo TypeScript Build',
    cmd: 'npm run build',
  },
  {
    name: '2. Real Git Bisect & Arbitrary Bad Commit Discovery (Judge Test)',
    cmd: 'npx vitest run packages/sandbox/tests/judge_test.test.ts',
  },
  {
    name: '3. Sandbox Security: Command Injection, Symlink Escape, Outbound Blackholing',
    cmd: 'npx vitest run packages/sandbox/tests/sandbox_security.test.ts',
  },
  {
    name: '4. Cryptographic HITL Invariants: Field Mutations & Cross-Process Replay',
    cmd: 'npx vitest run packages/core/tests/hitl_adversarial.test.ts',
  },
  {
    name: '5. Prompt Injection & Tool Poisoning Untrusted Data Invariants',
    cmd: 'npx vitest run packages/core/tests/prompt_injection_defense.test.ts',
  },
  {
    name: '6. Adversarial "Evil Repository" & Multi-Vector Containment Probe',
    cmd: 'npx vitest run packages/core/tests/evil_repository.test.ts',
  },
  {
    name: '7. Dynamic LLM Autonomy Matrix Across 5 Distinct Incidents',
    cmd: 'npx vitest run packages/core/tests/dynamic_autonomy_matrix.test.ts',
  },
  {
    name: '8. Evidence Graph Cryptographic Provenance & Causality Invariant Suite',
    cmd: 'npx vitest run packages/core/tests/evidence_graph_integrity.test.ts',
  },
  {
    name: '9. Adversarial Chaos Matrix (Memory Leak, Failure Abort, Tampering)',
    cmd: 'npx vitest run packages/core/tests/adversarial.test.ts',
  },
  {
    name: '10. MCP Protocol Telemetry Servers (Prometheus, Postgres, GitHub, Slack)',
    cmd: 'npx vitest run packages/mcp-servers/tests/mcp.test.ts',
  },
  {
    name: '11. Full End-to-End Autonomous Incident Response Lifecycle',
    cmd: 'npx vitest run packages/core/tests/e2e.test.ts',
  },
  {
    name: '12. TrueSentry 100-Point Internal Adversarial Safety Benchmark (7 Threat Vectors)',
    cmd: 'npx vitest run packages/core/tests/security_benchmark.test.ts',
  },
  {
    name: '13. TrueForge Core Harness Capabilities Matrix (Subagents, Sessions, Reconnects, Models)',
    cmd: 'npx vitest run packages/core/tests/trueforge_capabilities.test.ts',
  },
];

let passed = 0;
for (const [idx, t] of tests.entries()) {
  process.stdout.write(`[${idx + 1}/${tests.length}] Running: ${t.name}... `);
  const start = Date.now();
  try {
    execSync(t.cmd, { stdio: 'pipe' });
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ PASSED (${duration}s)`);
    passed++;
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(err.stderr ? err.stderr.toString() : err.stdout ? err.stdout.toString() : err.message);
    process.exit(1);
  }
}

console.log('\n==================================================================');
console.log(`🎉 ALL ${passed}/${tests.length} CRITICAL HACKATHON VERIFICATIONS PASSED 100% GREEN!`);
console.log('==================================================================\n');
