import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

let lastEdges: any[] = [];

vi.mock("reactflow", async () => {
  const React = await import("react");
  return {
    __esModule: true,
    default: ({ children, edges = [] }: { children: React.ReactNode; edges?: any[] }) => {
      lastEdges = edges;
      return <div data-testid="reactflow-mock">{children}</div>;
    },
    Background: () => <div data-testid="reactflow-background" />,
    Controls: () => <div data-testid="reactflow-controls" />,
    MiniMap: () => <div data-testid="reactflow-minimap" />,
    Handle: () => <div data-testid="reactflow-handle" />,
    MarkerType: { ArrowClosed: "arrowclosed" },
    Position: { Left: "left", Right: "right" },
    addEdge: vi.fn(),
    Connection: {},
    useNodesState: vi.fn(),
    useEdgesState: vi.fn()
  };
});

function mockFetch({
  initialUnlocked = false,
  workflows = [],
  workflowDetails = {}
}: {
  initialUnlocked?: boolean;
  workflows?: any[];
  workflowDetails?: Record<string, { workflow: any; steps: any[]; edges: any[] }>;
} = {}) {
  let unlocked = initialUnlocked;
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const workflowMatch = url.match(/\/api\/workflows\/([^/]+)$/);
    if (workflowMatch) {
      const workflowId = workflowMatch[1];
      const detail = workflowDetails[workflowId] ?? { workflow: null, steps: [], edges: [] };
      return new Response(JSON.stringify(detail), { status: 200 });
    }
    if (url.endsWith("/api/vault")) {
      return new Response(JSON.stringify({ unlocked }), { status: 200 });
    }
    if (url.endsWith("/api/providers")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.endsWith("/api/folders")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.endsWith("/api/workflows")) {
      return new Response(JSON.stringify(workflows), { status: 200 });
    }
    if (url.endsWith("/api/unlock")) {
      unlocked = true;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (url.endsWith("/api/lock")) {
      unlocked = false;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;
}

describe("App", () => {
  beforeEach(() => {
    lastEdges = [];
    mockFetch();
  });

  it("renders core sections", async () => {
    render(<App />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(screen.getByTestId("app-root")).toBeInTheDocument();
    expect(screen.getByTestId("section-vault")).toBeInTheDocument();
    expect(screen.getByTestId("section-providers")).toBeInTheDocument();
    expect(screen.getByTestId("section-folders")).toBeInTheDocument();
    expect(screen.getByTestId("section-workflow")).toBeInTheDocument();
    expect(screen.getByTestId("section-steps")).toBeInTheDocument();
    expect(screen.getByTestId("section-edges")).toBeInTheDocument();
    expect(screen.getByTestId("section-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("section-run")).toBeInTheDocument();
  });

  it("unlocks vault with passphrase", async () => {
    render(<App />);
    const input = screen.getByTestId("vault-passphrase-input");
    await userEvent.type(input, "pass123");
    await userEvent.click(screen.getByTestId("vault-unlock-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/unlock",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      const statuses = screen.getAllByTestId("vault-status-text");
      statuses.forEach((status) => expect(status).toHaveTextContent("Unlocked"));
    });
  });

  it("disables config actions when vault is locked", async () => {
    mockFetch({ initialUnlocked: false });
    render(<App />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId("provider-open-add")).toBeDisabled();
    expect(screen.getByTestId("folder-open-add")).toBeDisabled();
    expect(screen.getByTestId("workflow-create")).toBeDisabled();
  });

  it("opens provider modal when unlocked", async () => {
    mockFetch({ initialUnlocked: true });
    render(<App />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId("provider-open-add"));
    expect(screen.getByTestId("provider-modal")).toBeInTheDocument();
  });

  it("adds arrow markers to workflow edges", async () => {
    const workflow = {
      id: "wf-1",
      name: "Arrow Workflow",
      description: null,
      folder_id: "folder-1",
      execution_mode: "sequential"
    };
    mockFetch({
      initialUnlocked: true,
      workflows: [workflow],
      workflowDetails: {
        "wf-1": {
          workflow,
          steps: [
            {
              id: "step-1",
              workflow_id: "wf-1",
              name: "Plan",
              description: "Plan",
              provider_id: "prov-1",
              model: null,
              max_iterations: 10,
              skills_json: "[]",
              success_criteria: null,
              failure_criteria: null,
              pos_x: 10,
              pos_y: 10
            },
            {
              id: "step-2",
              workflow_id: "wf-1",
              name: "Build",
              description: "Build",
              provider_id: "prov-1",
              model: null,
              max_iterations: 10,
              skills_json: "[]",
              success_criteria: null,
              failure_criteria: null,
              pos_x: 220,
              pos_y: 40
            }
          ],
          edges: [
            {
              id: "edge-1",
              workflow_id: "wf-1",
              from_step_id: "step-1",
              to_step_id: "step-2",
              type: "next"
            }
          ]
        }
      }
    });

    render(<App />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    await userEvent.click(screen.getByTestId("workflow-card-wf-1-select"));

    await waitFor(() => {
      expect(lastEdges.length).toBeGreaterThan(0);
      expect(lastEdges[0].markerEnd?.type).toBe("arrowclosed");
    });
  });
});
