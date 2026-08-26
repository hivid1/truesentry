/**
 * TrueSentry Master Verification & Adversarial Test Runner
 * Validates all 8 hackathon readiness criteria in a single executable command.
 */
const { execSync } = require('child_process');

console.log('\n==================================================================');
console.log('🛡️  TRUESENTRY: MASTER 8-POINT ADVERSARIAL VERIFICATION RUNNER');
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
    name: '3. OS Process Sandbox & Timeout Enforcement',
    cmd: 'npx vitest run packages/sandbox/tests/sandbox.test.ts',
  },
  {
    name: '4. Cryptographic HITL Gate, Tamper Defense & Replay Prevention',
    cmd: 'npx vitest run packages/core/tests/hitl.test.ts',
  },
  {
    name: '5. Adversarial Chaos Matrix (Memory Leak, Failure Abort, Tampering)',
    cmd: 'npx vitest run packages/core/tests/adversarial.test.ts',
  },
  {
    name: '6. MCP Protocol Telemetry Servers (Prometheus, Postgres, GitHub, Slack)',
    cmd: 'npx vitest run packages/mcp-servers/tests/mcp.test.ts',
  },
  {
    name: '7. Full End-to-End Autonomous Incident Response Lifecycle',
    cmd: 'npx vitest run packages/core/tests/e2e.test.ts',
  },
  {
    name: '8. Command Center UI Production Compilation',
    cmd: 'npm run build --workspace=@truesentry/command-center',
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
