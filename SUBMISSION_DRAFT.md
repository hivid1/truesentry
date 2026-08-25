# 📝 TrueSentry: Hackathon Submission Draft

Copy and paste these pre-formatted fields directly into the [WeMakeDevs Hackathon Submission Portal](https://www.wemakedevs.org/hackathons/trueforge).

---

### 1. Project Title
**TrueSentry: Autonomous SRE Incident Responder & Safe Self-Healing Agent on TrueForge**

### 2. Elevator Pitch / Tagline (Under 140 chars)
**Autonomous SRE agent that investigates with real MCP tools, reproduces bugs in isolated sandboxes, and halts for human sign-off before irreversible actions.**

### 3. Track Submissions (Select all that apply)
- [x] **Double-O Track (Best Use of TrueForge)**
- [x] **Q Branch Track (Best Code Quality with Qodo)**
- [x] **Savile Row Track (Best UI)**
- [x] **Field Report (Best Blog Post)**
- [x] **Radio Traffic (Best Social Posts)**

### 4. GitHub Repository URL
`https://github.com/YOUR_USERNAME/truesentry`

### 5. Demo Video URL (3 Minutes)
`https://youtu.be/YOUR_DEMO_VIDEO_ID` (or Loom link)

### 6. Technical Description & What TrueForge Handled
```markdown
TrueSentry is an autonomous Site Reliability Engineering (SRE) agent designed to resolve high-severity production incidents safely and reliably. 

When a critical alert fires (e.g. checkout 500 error spike to 48.2%), TrueSentry uses TrueForge's runtime superpowers:
1. **MCP Connectivity**: Connects to Prometheus (metric queries), PostgreSQL (inspecting pg_locks table contention), GitHub (deploy logs), and Slack (alert channels).
2. **Isolated Sandboxing**: TrueForge spins up an isolated container sandbox to clone the repo, run automated git bisect, reproduce the lock timeout, and validate a rollback patch across 48 unit tests.
3. **State-Gated Human-in-the-Loop (HITL)**: Before applying the rollback to live production, TrueForge pauses execution. On our Next.js Command Center, an interactive Approval Card displays the Monaco SQL diff, blast-radius risk gauge (74/100), and 0-data-loss proof.
4. **Subagent Swarms**: Coordinator delegates work across specialized workers: Telemetry Scout, Sandbox Bisector, Blast-Radius Auditor, and Post-Mortem Scribe.
5. **Code Quality**: Built with 100% TypeScript strict typing, Vitest test suites across all packages, and audited with Qodo AI PR reviews.
```

### 7. Tech Stack
- **Agent Harness**: TrueForge (`@truefoundry/trueforge-core`)
- **Protocol**: Model Context Protocol (MCP) (`@modelcontextprotocol/sdk`)
- **Sandboxing**: Container Sandbox Runtime & AST Error Parser
- **Frontend UI**: Next.js 15 App Router, Tailwind CSS, Monaco Diff Editor, Lucide Icons, Web Speech API
- **Backend API**: Hono, Node.js, Server-Sent Events (SSE)
- **Quality & Testing**: Qodo AI, Vitest, TypeScript, ESLint
- **Target Hardware**: NVIDIA DGX Spark, Apple Silicon (Mac Mini)

### 8. License
**MIT License (Open Source)**
