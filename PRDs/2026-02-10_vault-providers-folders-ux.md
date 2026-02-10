# PRD: Vault, Providers, Project Folders UX

## Goal
Improve the apps/web frontend UX to clarify vault lock/unlock state, make provider setup intuitive with add modal and empty state, and make project folders manageable with add/edit/delete in a clear list.

## Non-goals
- Backend API changes or new endpoints
- Changes to authentication or permissions model
- Redesign of unrelated settings pages

## Stakeholders
- Product: User
- Engineering: Frontend
- QA: Testers

## Constraints
- Use existing design system components and patterns.
- Meet accessibility requirements (labels, focus management, ARIA for modals, contrast).
- Config changes must be disabled when vault is locked; running workflows must remain enabled.
- Deadline: now.

## Functional Requirements
- Vault section shows distinct locked/unlocked state with icon + text.
- Users can lock and unlock the vault from the UI.
- Lock/unlock reflects backend state and is stored in frontend state appropriately.
- When vault is locked, configuration actions are disabled (but workflow runs remain enabled).
- Provider setup is split into list vs add via modal.
- “Mock provider” option is removed.
- Provider list remains editable.
- Provider empty state is shown when none exist.
- Project folders: add via modal; list shows label as title with path below.
- Project folders list supports edit and delete.
- Project folders empty state is shown when none exist.

## Non-functional Requirements
- Accessibility: keyboard navigation and focus traps in modals, ARIA labels for icons and actions.
- Performance: no noticeable regressions in page load or interaction.
- Observability: no new telemetry required.

## Task List by Role
### PO
- Define scope and acceptance criteria (this PRD).

### Architect
- Review current apps/web structure and settings screens.
- Define component structure, state flow, and data sources for vault status/providers/folders.
- Identify required test coverage.

### Frontend
- Implement vault lock/unlock UI with state indicator and description.
- Disable configuration controls when locked.
- Split providers into list + add modal, remove mock provider, add empty state.
- Split project folders into list + add modal, show label+path, add edit/delete, add empty state.
- Add/adjust data-testid hooks as needed for E2E.

### Frontend Tester
- Add/update unit/integration tests for new UI states and disabling logic.

### E2E Tester
- Add/update Playwright tests for vault lock/unlock, provider add flow, folder add/edit/delete.

### Team Lead
- Validate PRD alignment and run required tests.

## Acceptance Criteria by Task
### Vault
- UI displays a lock icon + “Locked” text when locked, unlock icon + “Unlocked” text when unlocked.
- A short description explains why unlocking is required to edit configurations.
- Lock/unlock control exists and toggles state based on backend data.
- When locked, configuration edit controls are disabled; workflow run controls remain enabled.

### Providers
- A clear “Add provider” button opens a modal to add a provider.
- Provider list is visible separately from the add control and remains editable.
- “Mock provider” is not present in the add options.
- If no providers exist, a designed empty state appears with guidance.

### Project Folders
- “Add folder” button opens a modal with fields for label and path.
- List shows each folder label as title with path below.
- Each list item has edit and delete actions.
- If no folders exist, a designed empty state appears with guidance.

### Quality
- Accessibility checks pass for new controls and modals.
- All relevant tests pass (unit/integration/e2e as applicable).
