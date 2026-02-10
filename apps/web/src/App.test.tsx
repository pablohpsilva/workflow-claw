import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

vi.mock("reactflow", async () => {
  const React = await import("react");
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="reactflow-mock">{children}</div>
    ),
    Background: () => <div data-testid="reactflow-background" />,
    Controls: () => <div data-testid="reactflow-controls" />,
    MiniMap: () => <div data-testid="reactflow-minimap" />,
    addEdge: vi.fn(),
    Connection: {},
    Position: {},
    useNodesState: vi.fn(),
    useEdgesState: vi.fn()
  };
});

function mockFetch() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/api/providers")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.endsWith("/api/folders")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.endsWith("/api/workflows")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.endsWith("/api/unlock")) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof fetch;
}

describe("App", () => {
  beforeEach(() => {
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
  });
});
