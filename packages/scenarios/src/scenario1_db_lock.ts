import { IncidentScenario } from "./types.js";

export const SCENARIO_1_DB_LOCK: IncidentScenario = {
  id: "scenario_1_db_lock",
  title: "Incident #INC-0824: Checkout 500 Outage & Table Lock Contention",
  category: "DATABASE_LOCK",
  severity: "CRITICAL",
  service: "checkout-service",
  initialAlertMessage: "P1 Alert: Checkout HTTP 500 rate spiked to 48.2% following deployment #4c21.",
  rootCauseDescription: "Migration 049 added an unindexed foreign key on table 'orders', acquiring an exclusive lock and blocking 18 concurrent checkout transactions.",
  proposedActionDescription: "Drop blocking foreign key constraint and apply non-blocking concurrent index.",
  diff: {
    language: "sql",
    before: `-- Deployed in commit 4c21e90
ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);`,
    after: `-- Rollback verified in TrueForge Sandbox
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_user_id;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);`,
  },
  blastRadius: {
    riskScore: 74,
    estimatedDowntimeSeconds: 3.0,
    affectedServices: ["checkout-service", "billing-worker", "order-fulfillment", "analytics-sync"],
    dataLossRisk: false,
  },
};
