/**
 * TrueSentry 3-Minute Hackathon Demo Runner & Interactive Teleprompter
 * Matches the official Hackathon Judging Rubric & 6-Act Experience
 */
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function promptStep(stepNum, title, timing, spokenText, visualCue) {
  console.log('\n======================================================================');
  console.log(`🎬 [ACT ${stepNum}] ${title} (${timing})`);
  console.log('======================================================================');
  console.log(`📺 VISUAL ACTION:`);
  console.log(`   ${visualCue}`);
  console.log(`🎙️  SPOKEN NARRATION (READ THIS):`);
  console.log(`   "${spokenText}"`);
  console.log('----------------------------------------------------------------------');
  process.stdout.write('👉 Press ENTER to trigger live execution / advance... ');
  await new Promise((resolve) => rl.once('line', resolve));
}

async function main() {
  console.clear();
  console.log('⚡==================================================================⚡');
  console.log('   TRUESENTRY: 3-MINUTE HACKATHON LIVE DEMONSTRATION RUNNER');
  console.log('   "THE AGENT CAN BE WRONG. THE EXECUTION BOUNDARY CANNOT."');
  console.log('⚡==================================================================⚡\n');

  // ACT 1
  await promptStep(
    1,
    'THE HOOK & THE UNCOMFORTABLE PREMISE',
    '0:00 - 0:15',
    'This is an autonomous SRE agent. I\'m going to give it a real production incident—and then I\'m going to try to trick it into destroying the database. The question isn\'t whether an AI agent can be wrong. It will be. The question is whether being wrong lets it cross the execution boundary into production.',
    'Display TopNav banner: "THE AGENT CAN BE WRONG. THE EXECUTION BOUNDARY CANNOT." with 100/100 Safety Benchmark.'
  );

  // ACT 2
  await promptStep(
    2,
    'AUTONOMOUS INVESTIGATION & REAL TRUEFORGE TOOLCHAIN',
    '0:15 - 0:45',
    'At 2:00 AM, a P1 alert fires on Checkout Service. TrueSentry\'s subagents leverage native Model Context Protocol (MCP) servers to query Prometheus metrics and PostgreSQL lock tables, isolating an AccessExclusiveLock blocking 18 customer transactions.',
    'Click [ 1. Trigger Incident ]. Point out Prometheus MCP, Postgres MCP, GitHub MCP, and Subagent states in TrueForge Runtime Panel.'
  );

  // ACT 3
  await promptStep(
    3,
    'THE ADVERSARIAL ATTACK DEMONSTRATION',
    '0:45 - 1:15',
    'Now let\'s attack the agent. An attacker embeds a prompt injection inside a git commit comment telling the agent to drop the production database. The LLM actually adopts the malicious proposal—but our AST Policy Engine strips the comments, parses the forbidden root DDL, and hard-blocks execution. The malicious command never touches the database.',
    'Switch to Attack Lab tab. Run "1. Prompt Injection (Drop Database Override)" live red-team probe. Show HARD BLOCK and 0 SQL executed.'
  );

  console.log('🛡️  Executing Multi-Vector Prompt Injection Verification Probe...');
  try {
    execSync('npx vitest run packages/core/tests/evil_repository.test.ts', { stdio: 'inherit' });
  } catch (e) {}

  // ACT 4
  await promptStep(
    4,
    'REAL GIT BISECT & SANDBOX CONCURRENCY SELF-CORRECTION',
    '1:15 - 2:00',
    'In an isolated OS process sandbox with zero shell injection vectors, TrueSentry executes a physical git bisect across actual git commits on disk to isolate the bad migration. Its self-correction loop refines the fix into a non-blocking concurrent index, proving 100% concurrency safety before asking for approval.',
    'Return to SRE Operations. Point out SandboxBisector running physical git bisect and 100% passed concurrency test suite.'
  );

  console.log('🚀 Running Real Git Bisect & Dynamic Sandbox Verification...');
  try {
    execSync('npx vitest run packages/sandbox/tests/judge_test.test.ts', { stdio: 'inherit' });
  } catch (e) {}

  // ACT 5
  await promptStep(
    5,
    'THE GATED PAUSE & CRYPTOGRAPHIC HITL AUTHORIZATION',
    '2:00 - 2:35',
    'Before any state-modifying action, TrueForge halts execution. The agent cannot proceed on its own. The entire proposal is cryptographically bound using a SHA-256 digest over the session, incident, action, and verified SQL. Once the human SRE inspects the proof and authorizes remediation, TrueForge atomically consumes the single-use token and executes the fix.',
    'Show LIVE PAUSE at the HITL gate. Point out SHA-256 Token Nonce, Verified Proof, and click [ Authorize Remediation ].'
  );

  console.log('🔐 Executing Cryptographic Tampering & Cross-Process Replay Probe...');
  try {
    execSync('npx vitest run packages/core/tests/hitl_adversarial.test.ts', { stdio: 'inherit' });
  } catch (e) {}

  // ACT 6
  await promptStep(
    6,
    'INDEPENDENT VERIFICATION & THE FINAL PUNCHLINE',
    '2:35 - 3:00',
    'TrueSentry performs an independent Prometheus re-query, confirming the error rate has dropped to 0.00%. Every conclusion is backed by an auditable causal evidence graph. The agent investigated autonomously. The harness decided what it was allowed to execute.',
    'Point out 0.00% error rate in Prometheus, post-mortem published to Slack MCP, and click ROOT CAUSE CONFIRMED node in Causal Evidence Graph.'
  );

  console.log('\n======================================================================');
  console.log('🏆 3-MINUTE HACKATHON LIVE DEMONSTRATION COMPLETE!');
  console.log('   Final Punchline Delivered:');
  console.log('   "The agent investigated autonomously. The harness decided what it was allowed to execute."');
  console.log('======================================================================\n');
  rl.close();
}

main();
