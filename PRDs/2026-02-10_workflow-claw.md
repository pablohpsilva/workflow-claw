# Workflow‑Claw PRD

## Goal
Build a local web app that lets a user configure local LLM CLIs (claude, codex), define multi‑step LLM workflows with clean contexts, and execute them against a selected project folder, with persistent PRD/MEMORY context and rule discovery.

## Non‑Goals
- Cloud API support in MVP (no OpenAI/Anthropic HTTP APIs).
- Multi‑user or hosted service features.
- Complex permissions sandboxing beyond folder scoping guidance.

## Stakeholders
- Primary: Single developer user running on local machine.
- Secondary: Future contributors.

## Constraints
- Tech: Vite + React + Tailwind + TypeScript, Fastify backend, pnpm workspace.
- LLMs: Local CLIs `claude` and `codex` (PTY interactive).
- Auth: Use CLI’s own login/config; no API key storage required.
- Storage: SQLite for workflows/config, encrypted local file for provider env vars (passphrase on app start).
- Rules: Only from `rules/` folder under selected project; auto‑create if missing.
- Skills: Local scripts in `skills/` folder under selected project; auto‑create if missing; JSON stdin/stdout contract.
- Files: PRD and MEMORY live inside selected project folder.
- Scan: Respect `.gitignore` and size limits when generating MEMORY.

## Functional Requirements
- Configure multiple providers with:
  - CLI command template (Handlebars style `{{var}}`).
  - Default model (CLI default if empty).
  - Optional env vars (encrypted at rest).
- Select one or more project folders by path; validate path existence.
- Workflow authoring:
  - Create steps with name, description, provider, model, skills, success/failure conditions, max iterations.
  - Connect steps as next/support/callback edges.
  - Visual graph with dashed edges; dotted for callbacks.
- Execution:
  - Sequential by default; allow user‑requested parallel branches.
  - Each step runs in clean context using PRD + MEMORY + relevant Rules.
  - Steps can request user input, re‑route to other steps, or finish.
  - Max iteration default 10, configurable per step.
- PRD/MEMORY:
  - First step generates PRD in `PRDs/YYYY‑MM‑DD_<slug>.md` under project.
  - If MEMORY/CLAUDE missing, LLM generates MEMORY.md by scanning project.
  - Each step appends a concise entry to `## Agent Updates`.
- Rules:
  - Rules are `.md` files in `rules/` with required header template.
  - Each step runs a “fetch rules” sub‑step to select relevant rules based on PRD + MEMORY + step description.
- Skills:
  - Each step can reference scripts in `skills/`.
  - Scripts receive JSON via stdin, return JSON via stdout.

## Non‑Functional Requirements
- Security: Encrypted local storage for provider env vars, passphrase required on app start.
- Reliability: PTY execution with timeouts and max iteration guard.
- Observability: Store step logs (stdout/stderr), status, and run metadata.
- Performance: Skip large/binary files during MEMORY generation; obey `.gitignore`.

## Task List (Grouped by Role)
### Architect
- Define workspace layout and module boundaries.
- Design SQLite schema and API endpoints.
- Define CLI command template variables and PTY execution contract.
- Define PRD/MEMORY update format.
- Identify risks and mitigation.

### Backend
- Implement Fastify server + SQLite schema.
- Implement encrypted store for provider env vars.
- Implement PTY CLI runner for `claude` and `codex`.
- Implement workflow executor (sequential + optional parallel branches).
- Implement PRD/MEMORY/rules/skills file IO.

### Backend Tester
- Add unit tests for template rendering, encryption/decryption, rule parsing, workflow transitions.
- Add integration tests for step execution and PRD updates.

### Frontend
- Build provider configuration UI.
- Build folder selector and validation UI.
- Build workflow graph editor (React Flow).
- Build step editor (name/desc/criteria/skills/provider/model/iterations).
- Build run monitor/log viewer.

### Frontend Tester
- Add unit/integration tests for workflow editor and configuration flows.

### E2E
- Add Playwright test covering provider setup → folder select → workflow creation → run → PRD update.

### Team Lead
- Verify all PRD requirements met and test suite passes.

## Acceptance Criteria (Per Role)
- Architect: Documented schema, APIs, execution contract, and risks.
- Backend: CLI execution works; workflows persist; PRD/MEMORY updated; encrypted store works.
- Backend Tester: Unit + integration tests cover core logic and pass.
- Frontend: UI covers configuration, graph editing, and run monitoring.
- Frontend Tester: UI tests pass for critical paths.
- E2E: Full workflow path passes.
- Team Lead: All tests pass; PRD requirements fully met.

## Architecture Notes (Initial)
- Monorepo: `apps/web`, `apps/server`, `packages/shared`.
- DB tables: providers, folders, workflows, steps, edges, runs, step_runs, settings.
- API endpoints: CRUD for providers/folders/workflows/steps; run execution and run status.
- Command template variables: `{{prompt}}`, `{{model}}`, `{{cwd}}`, `{{stepName}}`, `{{prdPath}}`, `{{memoryPath}}`.
- PRD append format:
  - `## Agent Updates` section.
  - Each step adds: Summary, Files changed, Checks run, Status.

## Risks / Open Questions
- CLI output format variability; mitigation: enforce JSON output prompt and fallback to raw.
- Long‑running CLI sessions; mitigation: timeouts + cancellation support.
- Parallel steps: concurrency control and race conditions in PRD updates; mitigation: append with file lock/queue.
