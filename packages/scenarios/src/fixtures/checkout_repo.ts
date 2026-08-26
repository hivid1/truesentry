import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface FixtureRepoInfo {
  repoPath: string;
  initialGoodCommit: string;
  badCommitSha: string;
  badCommitPosition: number;
  headCommitSha: string;
}

export function createCheckoutServiceGitFixture(badCommitPosition: 2 | 3 | 4 = 3): FixtureRepoInfo {
  const tmpBase = path.join(os.tmpdir(), "trueforge_fixtures");
  if (!fs.existsSync(tmpBase)) {
    fs.mkdirSync(tmpBase, { recursive: true });
  }

  const repoDir = path.join(tmpBase, `checkout_service_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(repoDir, { recursive: true });

  const run = (cmd: string) => {
    return execSync(cmd, {
      cwd: repoDir,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "ci-bot",
        GIT_AUTHOR_EMAIL: "ci@company.internal",
        GIT_COMMITTER_NAME: "ci-bot",
        GIT_COMMITTER_EMAIL: "ci@company.internal",
      },
    }).toString().trim();
  };

  run("git init");
  run("git config user.name \"ci-bot\"");
  run("git config user.email \"ci@company.internal\"");

  // Setup package.json & test script that strips comments before evaluating DDL lock safety
  const testScript = `
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', 'migrations');
if (fs.existsSync(migrationPath)) {
  const files = fs.readdirSync(migrationPath);
  for (const f of files) {
    const filePath = path.join(migrationPath, f);
    if (fs.statSync(filePath).isFile()) {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const sqlCode = rawContent.replace(/--.*$/gm, '');
      // If migration adds constraint without NOT VALID, it acquires an AccessExclusiveLock
      if (sqlCode.includes('ADD CONSTRAINT') && !sqlCode.includes('NOT VALID')) {
        console.error('FAIL: Concurrency lock test failed! AccessExclusiveLock acquired for > 700s on file: ' + f);
        process.exit(1);
      }
    }
  }
}
console.log('PASS: 48/48 concurrency lock tests passed (0ms lock contention).');
process.exit(0);
`;

  fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "test", "concurrency_lock_spec.js"), testScript, "utf8");

  fs.writeFileSync(
    path.join(repoDir, "package.json"),
    JSON.stringify(
      {
        name: "checkout-service",
        version: "1.0.0",
        scripts: {
          test: "node test/concurrency_lock_spec.js",
        },
      },
      null,
      2
    ),
    "utf8"
  );

  // Commit 1: Initial Commit (Always Good)
  run("git add .");
  run("git commit -m \"feat: initialize checkout service\"");
  const initialGoodCommit = run("git rev-parse HEAD");

  let badCommitSha = "";

  // Commit 2
  if (badCommitPosition === 2) {
    fs.mkdirSync(path.join(repoDir, "migrations"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, "migrations", "048_add_users_role.sql"),
      `-- Migration 048\nALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id);\n`,
      "utf8"
    );
    run("git add .");
    run("git commit -m \"db: Migration 048_add_users_role.sql\"");
    badCommitSha = run("git rev-parse HEAD");
  } else {
    fs.writeFileSync(path.join(repoDir, "cart.js"), "// Cart validation logic\nmodule.exports = {};\n", "utf8");
    run("git add .");
    run("git commit -m \"feat: add shopping cart validation pipeline\"");
  }

  // Commit 3
  if (badCommitPosition === 3) {
    fs.mkdirSync(path.join(repoDir, "migrations"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, "migrations", "049_add_orders_user_fk.sql"),
      `-- Migration 049\nALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);\n`,
      "utf8"
    );
    run("git add .");
    run("git commit -m \"db: Migration 049_add_orders_user_fk.sql\"");
    badCommitSha = run("git rev-parse HEAD");
  } else {
    fs.writeFileSync(path.join(repoDir, "enums.js"), "export const OrderStatus = { PENDING: 'PENDING', COMPLETED: 'COMPLETED' };\n", "utf8");
    run("git add .");
    run("git commit -m \"fix: update order status enum definitions\"");
  }

  // Commit 4
  if (badCommitPosition === 4) {
    fs.mkdirSync(path.join(repoDir, "migrations"), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, "migrations", "050_add_payment_tokens.sql"),
      `-- Migration 050\nALTER TABLE payments ADD CONSTRAINT fk_payment_tokens FOREIGN KEY (token_id) REFERENCES tokens(id);\n`,
      "utf8"
    );
    run("git add .");
    run("git commit -m \"db: Migration 050_add_payment_tokens.sql\"");
    badCommitSha = run("git rev-parse HEAD");
  } else {
    fs.writeFileSync(path.join(repoDir, "metrics.js"), "export function logMetric() { return true; }\n", "utf8");
    run("git add .");
    run("git commit -m \"chore: add prometheus metric counters\"");
  }

  // Commit 5: Head commit
  fs.writeFileSync(path.join(repoDir, "promo.js"), "export function applyPromo() { return true; }\n", "utf8");
  run("git add .");
  run("git commit -m \"feat: add promo code support\"");
  const headCommitSha = run("git rev-parse HEAD");

  return {
    repoPath: repoDir,
    initialGoodCommit,
    badCommitSha,
    badCommitPosition,
    headCommitSha,
  };
}
