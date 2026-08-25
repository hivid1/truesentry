import { IncidentScenario } from "./types.js";

export const SCENARIO_3_SECURITY: IncidentScenario = {
  id: "scenario_3_security_quarantine",
  title: "Incident #INC-0826: Untrusted Dependency Post-Install Exfiltration",
  category: "SECURITY_QUARANTINE",
  severity: "CRITICAL",
  service: "auth-service",
  initialAlertMessage: "Security Alert: Malicious postinstall script detected attempting outbound connection during dependency installation.",
  rootCauseDescription: "Compromised open-source package 'fast-xml-parser-v4.2.1' attempting to execute unauthorized curl exfiltration of .env variables.",
  proposedActionDescription: "Quarantine malicious package, revert lockfile to secure SHA, and alert security team via Slack.",
  diff: {
    language: "json",
    before: `{
  "dependencies": {
    "compromised-dep": "4.2.1"
  }
}`,
    after: `{
  "dependencies": {
    "compromised-dep": "4.2.0"
  }
}`,
  },
  blastRadius: {
    riskScore: 92,
    estimatedDowntimeSeconds: 0.0,
    affectedServices: ["auth-service", "security-perimeter"],
    dataLossRisk: false,
  },
};
