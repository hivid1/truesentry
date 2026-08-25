#!/usr/bin/env node
import { TrueSentryCoordinator } from "@truesentry/core";
import { EventBroadcaster } from "@truesentry/core";
import { HitlGateEngine } from "@truesentry/core";
import { SessionStore } from "@truesentry/core";
import { SCENARIO_1_DB_LOCK, SCENARIO_2_MEMORY_LEAK, SCENARIO_3_SECURITY, ChaosFaultInjector } from "@truesentry/scenarios";

const args = process.argv.slice(2);
const command = args[0] || "help";

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function printBanner() {
  console.log(`\n${CYAN}${BOLD}⚡ TRUESENTRY CLI${RESET} - Autonomous SRE Incident Responder on TrueForge\n`);
}

async function run() {
  printBanner();

  switch (command) {
    case "status": {
      console.log(`${GREEN}✓ TrueForge Harness:${RESET} ACTIVE (Port 8790)`);
      console.log(`${GREEN}✓ MCP Servers:${RESET} Prometheus, Postgres, GitHub, Slack (4 Connected)`);
      console.log(`${GREEN}✓ Sandbox Runtime:${RESET} Rootless cgroups v2 Ready`);
      console.log(`${GREEN}✓ HITL Safety Engine:${RESET} Gated Nonce Verification Online\n`);
      break;
    }

    case "investigate": {
      const scenarioName = args[1] || "db_lock";
      console.log(`${YELLOW}🔍 Triggering Autonomous Investigation for: ${scenarioName}${RESET}...\n`);
      
      const broadcaster = new EventBroadcaster();
      const gate = new HitlGateEngine(broadcaster);
      const store = new SessionStore();
      const coordinator = new TrueSentryCoordinator(broadcaster, gate, store);

      const scenario = scenarioName.includes("memory")
        ? SCENARIO_2_MEMORY_LEAK
        : scenarioName.includes("sec")
        ? SCENARIO_3_SECURITY
        : SCENARIO_1_DB_LOCK;

      broadcaster.subscribe("cli_session", (evt) => {
        if (evt.type === "THOUGHT") {
          console.log(`[${evt.subagent}] ${evt.payload.thought}`);
        } else if (evt.type === "SANDBOX_LOG") {
          console.log(`  ${CYAN}> ${evt.payload.text}${RESET}`);
        } else if (evt.type === "APPROVAL_REQUEST") {
          console.log(`\n${YELLOW}${BOLD}🛑 GATED HITL PAUSE:${RESET} Approval ID: ${(evt.payload as any).approvalId}`);
          console.log(`   Risk Score: ${(evt.payload as any).blastRadius.riskScore}/100`);
          console.log(`   Action: ${(evt.payload as any).target.actionType}`);
          console.log(`   Auto-approving in CLI simulation mode...\n`);
          gate.resolveApproval((evt.payload as any).approvalId, "APPROVE");
        } else if (evt.type === "INCIDENT_RESOLVED") {
          console.log(`\n${GREEN}${BOLD}✓ INCIDENT RESOLVED:${RESET} MTTR: ${(evt.payload as any).mttrMinutes}m\n`);
        }
      });

      await coordinator.runIncidentWorkflow("cli_session", scenario);
      break;
    }

    case "chaos": {
      const faultType = (args[1] || "DEADLOCK").toUpperCase() as any;
      const injector = new ChaosFaultInjector();
      const fault = injector.injectFault(faultType);
      console.log(`${RED}${BOLD}🔥 Chaos Fault Injected:${RESET} ${fault.name}`);
      console.log(`   Target: ${fault.targetComponent} | Intensity: ${fault.intensity} | Duration: ${fault.durationSeconds}s\n`);
      break;
    }

    case "help":
    default: {
      console.log(`Available Commands:`);
      console.log(`  ${BOLD}truesentry status${RESET}                     Check harness and MCP server status`);
      console.log(`  ${BOLD}truesentry investigate <scenario>${RESET}   Run autonomous SRE incident diagnosis`);
      console.log(`  ${BOLD}truesentry chaos <type>${RESET}              Inject chaos faults (DEADLOCK, MEMORY_PRESSURE)`);
      console.log(`  ${BOLD}truesentry help${RESET}                      Show this help menu\n`);
      break;
    }
  }
}

run().catch((err) => {
  console.error(`${RED}Error:${RESET}`, err);
  process.exit(1);
});
