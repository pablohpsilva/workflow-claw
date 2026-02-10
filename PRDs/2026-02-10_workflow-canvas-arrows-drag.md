# PRD: Workflow Canvas Arrows + Persistent Drag Rearrangement

## Goal
Ensure workflow step connections are visually represented with arrows, and enable users to drag-rearrange steps in the workflow canvas with persisted layout.

## Non-goals
- Redesigning the entire workflow editor UI/UX.
- Changing workflow execution semantics.
- Introducing new workflow step types.

## Stakeholders
- Product/Operations team using workflow canvas
- Engineering (apps/web, apps/server)

## Constraints
- Use existing frameworks and libraries in `apps/web` and `apps/server`.

## Functional requirements
- Render directional arrows for every connection between workflow steps.
- Arrows must visibly connect the source and target steps, indicating direction.
- Users can click and drag steps to rearrange their positions on the canvas.
- Dragged positions persist so the same arrangement is shown on subsequent visits.

## Non-functional requirements
- Security: no new insecure data exposure; validate updates server-side.
- Performance: dragging should feel responsive; avoid excessive re-renders.
- Observability: log/trace layout update failures on the server.

## Task list grouped by role
### Architect
- Inspect current workflow canvas implementation in `apps/web`.
- Inspect workflow data model / persistence in `apps/server`.
- Decide approach for arrows rendering and persisted layout storage.
- Identify risks (e.g., layout collisions, legacy data without positions).

### DevOps
- None expected unless storage or migrations require infra changes.

### Backend
- Add/extend API to persist step positions (per workflow).
- Add/extend storage schema/fields for positions.
- Validate updates and return persisted layout on fetch.

### Backend Tester
- Unit/integration tests for layout persistence endpoints.
- Tests for backward compatibility when positions are missing.

### Frontend
- Render arrows for step connections using existing canvas/graph tooling.
- Implement drag-to-reposition steps.
- Persist positions via backend API; load persisted positions on init.
- Provide sensible default layout for workflows without saved positions.

### Frontend Tester
- Unit/integration tests for drag behavior and persistence calls.
- Tests for rendering arrows with multiple connections.

### E2E Tester
- E2E test: create workflow, verify arrows appear, drag steps, reload, verify positions persist.

### Team Lead
- Verify PRD tasks are complete and align with acceptance criteria.
- Run full test suite as appropriate.

## Acceptance criteria per task
### Architect
- Documented approach for arrow rendering and layout persistence.
- Risks and data migration considerations identified.

### Backend
- API persists and returns positions per workflow.
- Existing workflows without positions continue to render with default layout.

### Backend Tester
- Tests cover successful persistence, retrieval, and missing positions.

### Frontend
- Arrows appear for all defined connections with clear direction.
- Steps can be dragged to rearrange; changes saved and restored on reload.

### Frontend Tester
- Tests cover drag events and persistence calls.
- Tests cover arrow rendering for multiple connections.

### E2E Tester
- Workflow canvas shows arrows and preserves drag layout across reload.

### Team Lead
- All acceptance criteria satisfied; no regressions.
