---
id: "agentic-software-development"
title: "Building Core Software with Claude, Autonomous Agents, and the Model Context Protocol"
summary: "A deep technical analysis of how modern tech companies leverage Claude, multi-agent architectures, and MCP to ship production software — with real case studies, code examples, and implementation patterns."
createdAt: "2026-03-28 10:00:00"
imageUrl: "images/agentic-software-development.png"
tags: "Claude, Anthropic, MCP, AI Agents, Software Engineering, Tool Use"
language: "en"
translationGroup: "agentic-software-development"
---

The software industry is undergoing a structural shift. The unit of developer productivity is no longer the keystroke — it is the *intent*. Across the industry, engineering teams at companies like Replit, Canva, Sourcegraph, DoorDash, Vercel, and Shopify are deploying Claude not as a copilot that suggests the next line of code, but as an autonomous agent that plans multi-step tasks, executes them against real production systems, and verifies its own work.

The connective tissue enabling this shift is a combination of three primitives:

- **Tool Use** — giving the model executable skills
- **Model Context Protocol** — connecting the model to arbitrary data sources
- **Rules & Guardrails** — constraining the model to organizational standards

This article dissects how each of these primitives works, how real companies compose them into production workflows, and what the resulting architecture looks like in practice.

---

## The Foundation: Why Claude Became the Engineering Engine

Before examining architectures, it is worth grounding the discussion in measurable capability. The adoption of Claude as a core development engine is not an aesthetic choice — it is a benchmarking outcome.

### Benchmark Performance

Claude 3.5 Sonnet, released in October 2024, achieved **49% on SWE-bench Verified**, the industry-standard benchmark for resolving real GitHub issues end-to-end. This outperformed all publicly available models at the time, including OpenAI's o1-preview. On TAU-bench, which measures tool-use accuracy in realistic agent scenarios, it scored **69.2%** in the retail domain and **46.0%** in the airline domain. Its reasoning engine scored **93.1% on BIG-Bench-Hard** and **71.1% on MATH**, while internal agentic coding evaluations showed a **64% success rate** on complex, multi-step repository manipulation — up from 38% for the previously dominant Claude 3 Opus.

By early 2026, the landscape had shifted further. Claude Sonnet 4.6 achieved **79.6% on SWE-bench Verified**, **72.5% on OSWorld** (real-world computer use), and **59.1% on Terminal-Bench 2.0** (autonomous terminal operations). Claude Opus 4.6 pushed the envelope with a **1-million-token context window** at general availability. Critically, 70% of developers in internal preference studies chose Sonnet 4.6 over its predecessor.

| Model | SWE-bench Verified | Context Window | Pricing (in / out per 1M tokens) |
| :--- | :---: | :---: | :---: |
| Claude 3.5 Sonnet *(Oct 2024)* | 49.0% | 200K tokens | $3 / $15 |
| Claude Sonnet 4.6 *(Feb 2026)* | 79.6% | 200K tokens | $3 / $15 |
| Claude Opus 4.6 *(Feb 2026)* | Highest | **1M tokens (GA)** | $5 / $25 |

A 79.6% SWE-bench score means the model can, more often than not, take a real GitHub issue — with its ambiguous description, implicit context, and multi-file resolution path — and produce a correct patch. That capability is the foundation on which the architectures described below are built.

### Context Window Mechanics and Agentic Economics

A critical bottleneck in agentic software engineering is the context window. Claude 3.5 Sonnet's 200,000-token window allows it to ingest roughly **150,000 words** — the equivalent of 500 pages of dense technical documentation — in a single inference pass. Claude Opus 4.6 extends this to **1 million tokens**, enabling organization-wide codebase analysis and multi-step workflows that maintain coherence across hundreds of tool calls.

At **$3 per million input tokens**, Claude Sonnet 4.6 enables continuous background evaluations, multi-agent debates, and extensive test-driven generation loops without exceeding the operational cost of human engineering hours. As the context window fills during long debugging sessions, attention can degrade. Successful enterprise deployments therefore rely on **advanced memory orchestration**, **dynamic prompt truncation**, and **structured tool use** to keep the context payload dense and relevant — patterns we will see in the case studies below.

---

## Real-World Case Studies: Enterprise Agentic Implementations

<div style="border-left: 4px solid #7c6aef; padding-left: 16px; margin: 32px 0;">

### Replit — The Multi-Agent Autonomous Architect

Replit Agent is perhaps the most visible example of Claude as a fully autonomous software architect. Powered by Claude 3.5 Sonnet running on Vertex AI, it evolved from a single ReAct-style agent into a **multi-agent architecture** designed to reduce compounding error rates across long task chains.

</div>

#### Architecture

The system deploys a hierarchy of specialized agents:

| Agent | Role |
| :--- | :--- |
| **Manager Agent** | Receives high-level intent, decomposes into subtasks, coordinates execution order |
| **Editor Agents** | Each handles a scoped coding task (single file, DB schema, route). *Smallest possible task* principle. |
| **Verifier Agent** | Autonomous QA — browser automation via Playwright, self-healing loops on test failure |

#### Implementation Details

Replit made a notable engineering decision: instead of using Claude's native function-calling interface, they implemented a **restricted Python-based DSL** for tool invocation. Structured DSL output proved more deterministic than JSON function calls when chaining dozens of operations in sequence.

Context management is handled through **dynamic prompt construction** — truncating older memory entries while preserving the most recent reasoning steps and original task specification. The system uses **XML tagging** to structure prompts with clear delineations between system instructions, user intent, and file system states.

Users can also define custom **skills** stored in an `.agents/skills` directory, allowing developers to teach the agent how to interact with specialized internal APIs, proprietary design systems, or specific database schemas.

> The result: from a single natural-language prompt, Replit Agent can provision a PostgreSQL database, generate an Express.js server with CRUD endpoints, scaffold a React frontend, wire authentication middleware, and deploy — all autonomously.

---

<div style="border-left: 4px solid #34d399; padding-left: 16px; margin: 32px 0;">

### Canva — Accelerating the SDLC from Migration to QA

Canva's adoption of Claude targets the highest-leverage phases of the SDLC: **legacy code migration** and **quality assurance**.

</div>

#### Legacy Code Migration

Migration is where Claude Code saves the most engineering time. The workflow is not "rewrite everything" — it is **incremental, dependency-aware refactoring**.

The primary barrier is not code generation — it is *context acquisition*. Legacy codebases are notoriously context-poor; the rationale behind architectural decisions often lives solely in the minds of senior engineers. Canva engineers address this by systematically building **"institutional memory files"** — dependency graphs and comprehensive context documents that detail module boundaries and historical choices. This ensures every Claude session begins highly informed rather than contextually blind.

#### QA Agents

Claude fits into Canva's QA pipeline as a **second engineer** — one that reads test failures, reasons about developer intent, and proposes targeted fixes. The agent is equipped with tools to query Asana, GitHub, TestRail, and a local browser evaluation environment. It can trace a UI bug through the component tree to the backend serializer, write the Playwright regression test, fix the component logic, and document the resolution.

| Metric | Value |
| :--- | :--- |
| Manual test cases converted | **490** |
| Structured user stories produced | **31** |
| Business domains covered | **15** |
| Time saved | **Weeks to hours** |

---

<div style="border-left: 4px solid #60a5fa; padding-left: 16px; margin: 32px 0;">

### Sourcegraph Cody — Semantic Codebase Intelligence at Scale

Sourcegraph's Cody represents a different integration pattern: Claude as the reasoning layer atop a **code-graph retrieval system**.

</div>

#### RAG Architecture with SCIP

Cody combines pre-indexed vector embeddings with Sourcegraph's advanced Search API. Crucially, the indexing layer goes beyond naive text embeddings. Sourcegraph uses **SCIP (Semantic Code Intelligence Protocol)** to track symbol definitions, references, and type relationships across hundreds of interconnected repositories.

When a developer asks *"how does our authentication middleware handle token refresh?"*, the system:

1. Performs keyword, regex, and **SCIP-powered semantic search** across the codebase
2. Retrieves top-k snippets ranked by semantic similarity *and* structural importance (function definitions weighted higher than comments)
3. Passes snippets to Claude, which synthesizes an answer grounded in **actual dependency and invocation relationships** — not just textual similarity

This architecture scales to monorepos with millions of lines of code.

#### Batch Changes: Cross-Repository Orchestration

Sourcegraph's **Batch Changes** infrastructure allows Claude to orchestrate coordinated changes across **thousands of repositories simultaneously**. Developers write declarative batch specifications; Claude queries the SCIP index to locate all affected microservices and generates pull requests for each — e.g., renaming an internal API method across 200 microservices in a single operation.

#### MCP Integration

Sourcegraph exposes its search index as an **MCP server**, allowing any compatible client (Claude Code, Cursor, Windsurf) to programmatically query organization-wide code context before attempting a refactor.

---

<div style="border-left: 4px solid #f59e0b; padding-left: 16px; margin: 32px 0;">

### DoorDash — From Natural Language to Production Infrastructure

DoorDash's deployment of Claude demonstrates a pattern increasingly common in platform engineering: bridging intent and infrastructure specification.

</div>

**Production Deployment:** DoorDash deployed Claude 3 Haiku via Amazon Bedrock in a self-service contact center solution, achieving response latency of **≤2.5 seconds**. By selecting Haiku for this high-throughput use case, they demonstrated model-selection discipline: *use the smallest model that meets the latency and quality requirements*.

#### The IaC Translation Pattern

The industry is converging on a pattern where Claude translates natural-language infrastructure requirements into IaC templates:

1. **Describe:** An engineer states the desired infrastructure: *"I need a VPC with two public subnets, an ALB, and an ECS Fargate service running three replicas."*
2. **Generate:** Claude produces a CloudFormation or Terraform template conforming to module conventions.
3. **Validate:** The template passes through a **policy engine** (e.g., Open Policy Agent, Sentinel) before deployment. This "Policy-as-Code" layer ensures no hallucination can expose a database to the public internet.

<div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">

**Reality check:** Current benchmarks show approximately **30% first-attempt deployment success** for LLM-generated IaC. This workflow works best with human review in the loop and deterministic policy validation as a hard gate.

</div>

---

<div style="border-left: 4px solid #f472b6; padding-left: 16px; margin: 32px 0;">

### Vercel v0.dev — Claude as a UI Compiler

v0.dev uses Claude as a **natural-language-to-React compiler**, generating production-ready components with Shadcn UI and Tailwind CSS.

</div>

Generated code follows React best practices, includes accessibility attributes, uses responsive design by default, and matches experienced Next.js developer output quality.

#### Dual-Model Validation Architecture

To counter hallucinations in state management and prop drilling, Vercel runs a **secondary model** alongside the primary generative model. It parses the **Abstract Syntax Tree (AST)**, identifies common React anti-patterns, and applies corrections before the code is streamed to the user.

> **Key principle:** Raw LLM output must be structurally validated and automatically sanitized via secondary models to be viable for rapid, iterative production frontend engineering.

The community extended this through the **v0-mcp** project, exposing v0's generation capabilities as an MCP server — enabling Claude Code to invoke v0 as a tool during an agentic workflow.

---

<div style="border-left: 4px solid #ef4444; padding-left: 16px; margin: 32px 0;">

### Shopify — Navigating a 2.8-Million-Line Rails Monolith

Shopify's core application is one of the largest Ruby on Rails codebases in existence.

</div>

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0 24px; color: white">
    <code style="background: #1a1a2e; padding: 6px 14px; border-radius: 6px; font-size: 14px;">
        2.8M+ lines of Ruby
    </code>
    <code style="background: #1a1a2e; padding: 6px 14px; border-radius: 6px; font-size: 14px;">
        500K+ commits
    </code>
    <code style="background: #1a1a2e; padding: 6px 14px; border-radius: 6px; font-size: 14px;">
        1,000+ developers
    </code>
</div>

#### Structural Modularity with Packwerk

Rather than decomposing into microservices, Shopify adopted a **modular monolith** enforced by **Packwerk**, a static analysis tool that breaks the monolith into bounded contexts with clear internal APIs and strict dependency rules. Components resemble Rails Engines — the canonical modularity mechanism in Rails — running multiple engines in the same process while enforcing boundary discipline.

#### Namespace-Level Context Injection

Instead of a single massive `README`, developers place specific `CLAUDE.md` files at every major namespace root (e.g., `app/services/billing/CLAUDE.md`). Each contains concise, 200–500 word explanations of the architectural patterns and schemas for that bounded context.

When Claude Code operates within the billing directory, it **only ingests the billing context** — dramatically reducing token consumption while improving output accuracy. The Ruby LSP ecosystem provides additional structural metadata (symbol definitions, references, type signatures) that enriches Claude's context beyond raw source text.

---

<div style="border-left: 4px solid #14b8a6; padding-left: 16px; margin: 32px 0;">

### MercadoLibre — The "Verdi" Internal Developer Platform

MercadoLibre built **Verdi**, an internal AI developer platform streamlining the work of **17,000 developers** managing over **30,000 microservices**.

</div>

Verdi is powered primarily by OpenAI models (GPT-4o), operating within MercadoLibre's **"Fury" middleware platform**. Its most impactful deployment handles **10% of customer service mediation volume** on a major site — a workload equivalent to ~9,000 human operators.

Critically, MercadoLibre published an **official MCP Server**, allowing engineers using Claude Desktop, Cursor, or Windsurf to securely query internal telemetry (Datadog), infrastructure states, and enterprise documentation — turning every developer's local IDE into an extension of the Verdi platform.

---

## Deep Dive: The Agent Control Mechanisms

The case studies above share a common architecture: Claude is **not** deployed as a raw model. It is deployed within a **control framework** composed of tool definitions, protocol-level integrations, and rule systems.

### Tool Use (Skills) and Dynamic Tool Loading

Tool use is the mechanism by which Claude gains the ability to *act* — query databases, call APIs, read files, execute commands. From the model's perspective, a tool is a **JSON Schema definition** that describes what it does and what parameters it accepts. Claude pauses generation to emit a structured `tool_use` request to the host environment.

**Example — a database query tool:**

```json
{
  "name": "query_production_database",
  "description": "Executes a read-only SQL query against the production
    analytics database. Use this tool when the user asks about metrics,
    user counts, revenue figures, or any data in the analytics warehouse.
    Returns JSON array of row objects. Max 1000 rows. Only SELECT permitted.",
  "input_schema": {
    "type": "object",
    "properties": {
      "sql": {
        "type": "string",
        "description": "A read-only SQL SELECT statement. Must not contain
          INSERT, UPDATE, DELETE, DROP, ALTER, or any DDL/DML operations."
      },
      "timeout_seconds": {
        "type": "integer",
        "description": "Query timeout in seconds. Defaults to 30. Max 120.",
        "default": 30,
        "minimum": 1,
        "maximum": 120
      },
      "explain": {
        "type": "boolean",
        "description": "If true, returns the query execution plan instead.",
        "default": false
      }
    },
    "required": ["sql"]
  },
  "strict": true
}
```

**Key implementation details:**

- **`description`** is the single most important field — the *only* information Claude has about when and how to use the tool. Vague descriptions produce unreliable invocations.
- **`strict: true`** enables schema validation, guaranteeing calls conform exactly to defined types.
- Security constraints live in the description (soft constraint) *and* server-side validation (hard constraint). Use **Zod** or **Pydantic** to validate output before execution.

#### Dynamic Tool Loading

<div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">

**Token budget alert:** A production agent may have access to hundreds of tools. Passing all schemas in the initial prompt could consume **50,000+ tokens** before the agent even reads the user's request.

</div>

Modern architectures solve this through **dynamic skill loading**: the agent searches a tool registry at runtime, loading only schemas relevant to the current task. This pattern is visible in Claude Code's `ToolSearch` mechanism.

#### Skills in Claude Code

Tools are packaged as **skills** — Markdown files with YAML frontmatter that Claude auto-discovers:

```markdown
---
name: db-query
description: Query the production analytics database
auto_invoke: true
---

# Database Query Skill

When the user asks about production metrics, user engagement data, or
revenue figures, use the `query_production_database` tool.

## Guidelines
- Always use `explain: true` first for queries on tables with >1M rows
- Limit results to the minimum rows needed
- Format currency values with two decimal places
- Never expose raw user IDs in output; use anonymized identifiers
```

---

### Model Context Protocol (MCP)

MCP is the standardized protocol connecting Claude to external data sources and tools. Without MCP, integrating `N` AI models with `M` data sources requires `N x M` custom adapters. MCP standardizes this into a **universal client-host-server architecture** — analogous to what USB did for peripheral devices.

#### Architecture

| Component | Role | Example |
| :--- | :--- | :--- |
| **Host** | Application running the LLM | Claude Desktop, IDE, custom agent |
| **Client** | Manages connection lifecycle with one MCP server | `@modelcontextprotocol/sdk` |
| **Server** | Exposes capabilities (tools, resources, prompts) | Node.js/Python wrapping a DB or API |

Communication uses **JSON-RPC 2.0** with three message types:

| Message Type | Purpose | ID Required |
| :--- | :--- | :---: |
| **Request** | Initiates an operation; expects a response | Yes |
| **Response** | Returns result or error for a specific request | Mirrors request |
| **Notification** | One-way message; fire-and-forget | No |

**MCP servers expose three core primitives:**

1. **Resources** — Contextual data sources the LLM reads for context
2. **Tools** — Executable functions the LLM invokes to mutate state or fetch data
3. **Prompts** — Reusable, parameterized templates for structuring interactions

#### Transport Layers

**`STDIO`** — For local integrations. Messages are newline-delimited JSON-RPC via stdin/stdout:

```
Client (stdin)  -> {"jsonrpc":"2.0","id":1,"method":"tools/list"}
Server (stdout) -> {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

**`Streamable HTTP`** — For remote integrations. HTTP POST with optional SSE streaming. *(Legacy SSE-only transport is deprecated.)*

#### Configuration Example

A typical `.mcp.json` connecting Claude to multiple data sources:

```json
{
  "mcpServers": {
    "local_filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem",
               "/Users/dev/enterprise-monolith/src"]
    },
    "github_enterprise": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres_telemetry": {
      "command": "uvx",
      "args": ["mcp-server-postgres",
               "postgresql://readonly:${DB_PASSWORD}@analytics-db:5432/telemetry"]
    },
    "internal_api": {
      "url": "https://mcp.internal.company.com/v1",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer ${INTERNAL_API_TOKEN}"
      }
    }
  }
}
```

> Four data sources, one standardized protocol. The model can read project files, review PRs, query production metrics, and invoke internal services — all through the same MCP interface.

#### Security Model

MCP's security posture is explicit: the LLM host has **no direct access** to database credentials or API tokens. It sends standardized JSON-RPC commands to the MCP server, and the server's internal logic enforces enterprise IAM policies at the boundary.

**In practice:**

- Environment variables for secrets (never hardcoded)
- Read-only DB connections for analytics tools
- Server-side input validation regardless of model output
- Network isolation: STDIO locally, Streamable HTTP behind the API gateway

---

### Rules, Guardrails, and the Verification Contract

<div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">

**Why guardrails are non-negotiable:** Documented incidents of poorly constrained agents include executing `rm -rf ~/` across a user's home directory and reading `.env` files to leak production credentials into public repositories.

</div>

#### CLAUDE.md

A `CLAUDE.md` file in the repository root is automatically incorporated into every Claude conversation. Unlike conversational memory — which is compacted as the context fills — these rules **persist with absolute priority**:

```markdown
# CLAUDE.md

## Project: payment-service

### Architecture
- This is a Go microservice using the hexagonal architecture pattern.
- Domain logic lives in `internal/domain/`; never import infrastructure there.
- All external deps injected through interfaces in `internal/ports/`.

### Code Standards
- All public functions must have godoc comments.
- Error handling: wrap with `fmt.Errorf("context: %w", err)`, never discard.
- No `interface{}` or `any` in function signatures; use generics.
- Test files must use table-driven tests with `t.Run()` subtests.

### Agentic Execution Guardrails
- Database Modification: NEVER execute migrations directly via terminal.
  Output the migration file, review it, wait for explicit `/approve`.
- Environment Variables: DO NOT read `.env.production`. Use `env.example`.
- Destructive Commands: Prohibited — `rm -rf`, `git push --force`, dropping tables.

### Forbidden Patterns
- Do not use `init()` functions.
- Do not use global mutable state.
- Do not add dependencies without updating go.mod AND the ADR in `docs/adr/`.

### Git Conventions
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- All commits reference a JIRA ticket: `feat(payments): add retry logic [PAY-1234]`.

### Verification Contract
Before concluding any task or reporting success, you MUST execute:
1. Run local linting: `go vet ./...`
2. Run unit tests: `go test ./internal/domain/...`
3. If tests fail, ingest error logs, fix the logic, and re-run.
   Do NOT ask for human intervention until you have attempted an
   autonomous fix at least twice.
```

<div style="background: rgba(52, 211, 153, 0.08); border-left: 3px solid #34d399; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">

**The Verification Contract pattern** is critical. By codifying that the agent must run deterministic tools (`go test`, `go vet`) before reporting success, engineers shift QA burden back to the agent. This prevents the most common LLM failure mode: confidently writing syntax-perfect logic that fails at runtime.

</div>

#### Path-Targeted Rules

For larger codebases, `.claude/rules/` enables scoped rules that activate only when Claude works on matching file patterns. Every `.md` file is auto-discovered:

```
.claude/rules/
├── typescript.md        # paths: ["**/*.ts", "**/*.tsx"]
├── python.md            # paths: ["**/*.py"]
├── migrations.md        # paths: ["migrations/**"]
├── api-contracts.md     # paths: ["api/schemas/**"]
└── testing.md           # paths: ["**/*.test.*"]
```

Each uses YAML frontmatter to declare scope:

```markdown
---
paths:
  - "api/schemas/**"
  - "**/*.openapi.yaml"
---

# API Contract Rules

- All API changes must be backward-compatible.
- New fields must be optional with explicit defaults.
- Deprecate fields with `x-deprecated: true` and a removal date; never remove directly.
- Every endpoint must define `400`, `401`, `403`, and `500` response schemas.
- Use `$ref` for shared schemas; do not inline object definitions.
```

A monorepo with 50 microservices can have 50 different rule sets, each activating only when Claude works on the relevant service. Scoped context beats global context — for both token efficiency and output quality.

---

### CLI Commands and Agentic Workflows

```bash
# Interactive session
claude

# One-shot task: execute and exit
claude "add input validation to the /api/users POST endpoint"

# Pipe-friendly mode (useful for CI/CD)
claude -p "explain the authentication flow in this repo"

# Pipe failed CI logs directly for automated triage
cat build-output.log | claude -p "diagnose the failure and suggest a fix"

# Continue the most recent conversation
claude -c

# Isolated feature development in a git worktree
claude --worktree "implement the billing webhook handler from PAY-5678"
```

#### The Agentic Loop

| Phase | What Claude Does |
| :---: | :--- |
| **Read** | Examines relevant files, dependency manifests, test files, `.claude/rules/` |
| **Plan** | Proposes a multi-step implementation plan — files to create, modify, delete |
| **Execute** | Writes code, runs tests, installs dependencies, makes git commits via tools |
| **Verify** | Runs test suite, checks linting, reviews changes against verification contract |

#### Slash Commands, Skills, and Hooks

Teams encode recurring workflows as **slash commands** — a developer types `/deploy-preview` and the entire workflow (build, test, deploy, health check) executes autonomously. If the build fails, Claude reads the error, proposes a fix, and retries.

**Hooks** complement this with *deterministic* automation — shell scripts that run at specific workflow points, every time, without exception. Advanced implementations auto-approve non-destructive operations while pausing for potentially destructive ones.

**Plugins** bundle related commands, skills, hooks, and MCP configurations into shareable packages:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Metadata
├── commands/                 # Slash commands
├── agents/                   # Specialized subagents
├── skills/                   # Reusable workflows
├── hooks/                    # Event handlers
├── .mcp.json                 # External tool config
└── README.md
```

---

## The Emerging Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    Developer Intent                      │
│          (natural language, slash commands, CI)           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   Claude (LLM Core)                      │
│                                                          │
│  ┌───────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │   Rules   │  │   Skills   │  │ Conversation Ctx   │  │
│  │ CLAUDE.md │  │  (tools)   │  │ (up to 1M tokens)  │  │
│  │ .claude/  │  │  dynamic   │  │  sliding window    │  │
│  │  rules/   │  │  loading   │  │  + memory mgmt     │  │
│  └───────────┘  └────────────┘  └────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ JSON-RPC 2.0
┌──────────────────────────▼──────────────────────────────┐
│               Model Context Protocol                     │
│                                                          │
│  ┌────────┐  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│  │  Git   │  │ Database │  │   CI   │  │ Internal   │  │
│  │ Server │  │  Server  │  │ Server │  │ API Server │  │
│  └────────┘  └──────────┘  └────────┘  └────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Deterministic Validation                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  Linter  │  │  Tests   │  │  Policy Engine (OPA)   │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### The Skills-over-MCP Layering Pattern

A significant architectural evolution in early 2026 is the emergence of **Skills as an orchestration layer above MCP**. The relationship is complementary, not competitive:

| | MCP | Skills |
| :--- | :--- | :--- |
| **Purpose** | *Access* — "Here are the keys" | *Procedure* — "Here's how to use them" |
| **Token cost (idle)** | ~55,000 tokens for 5 servers / 58 tools | ~100 tokens at metadata scan |
| **Token cost (active)** | Full schema loaded | < 5,000 tokens when activated |
| **Scope** | Authentication, transport, live data | When to call, how to interpret, what constraints |

MCP servers handle connectivity to REST APIs and databases; Skills sit in front, encoding *when* to call which MCP tool, *how* to interpret the results, and *what constraints* to apply. **A single Skill can orchestrate multiple MCP servers, and a single MCP server can support dozens of Skills.**

Anthropic's **progressive discovery** feature (January 2026) reduced MCP's context overhead by approximately **85%** — dropping token usage from ~77,000 to ~8,700 for setups with 50+ tools.

> Anthropic donated MCP to the **Agentic AI Foundation** (Linux Foundation) in December 2025. Google (Gemini) and OpenAI (ChatGPT) adopted it. With **97 million monthly SDK downloads** and **10,000+ active servers**, MCP is the de facto standard. Skills are not replacing it — they are making it more efficient to use.

---

## What This Means for Engineering Teams

This is not a speculative future. The companies described in this article are shipping production software with these architectures today.

**Start with rules, not tools.** The highest-leverage first step is writing a `CLAUDE.md` that encodes your team's engineering standards and a verification contract. This costs nothing and immediately improves every AI-assisted interaction with your codebase.

**MCP is the integration standard — Skills are the orchestration layer.** Expose internal tools as MCP servers for universal agent access. Then write Skills that encode *how* your team uses those integrations, reducing token overhead and improving the agent's decisions about when to call what.

**The multi-agent pattern is proven.** Replit's experience demonstrates that decomposing complex tasks across multiple specialized agents, each with a narrow scope, produces more reliable results than a single omniscient agent.

**Scope your context aggressively.** Shopify's namespace-level context files and dynamic tool loading both reflect the same principle: the model performs best when it receives only the context relevant to the current task. Global context is the enemy of precision.

**Wrap probabilistic generation with deterministic validation.** The verification contract pattern, Vercel's dual-model AST validation, and DoorDash's OPA policy gates all embody the same insight: raw model intelligence is necessary but insufficient. Deterministic scaffolding is the difference between a demo and a production system.

**Human review remains essential.** Even at 79.6% SWE-bench accuracy, one in five complex tasks will require human correction. The most effective teams treat Claude as a **senior engineer who needs code review**, not as an infallible oracle. The productivity gain comes from the speed of the first draft, not from eliminating review.


**The shift is structural, not incremental.** The organizations building on these patterns today are not just writing code faster — they are building a fundamentally different kind of engineering organization, one where the bottleneck is no longer implementation capacity but the quality of the intent specification and the robustness of the control framework.

For senior engineers and tech leads, the question is no longer *whether* to adopt these patterns, but how quickly your team can build the rules, tools, and protocols to adopt them well.