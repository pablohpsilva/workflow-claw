import React from "react";
import { Handle, Position } from "reactflow";

export default function StepNode({
  data,
}: {
  data: {
    name: string;
    provider: string;
    description: string;
    model: string;
    maxIterations: number;
    skills: string[];
    statusIndicators?: Array<{
      runId: string;
      state: string;
      isSelected: boolean;
    }>;
    overflowCount?: number;
  };
}) {
  const stateColor: Record<string, string> = {
    not_started: "bg-slate-300",
    pending: "bg-amber-400",
    started: "bg-sky-400",
    in_progress: "bg-blue-500",
    needs_input: "bg-orange-400",
    error: "bg-red-500",
    success: "bg-emerald-500"
  };

  const stateLabel: Record<string, string> = {
    not_started: "not started",
    pending: "pending",
    started: "started",
    in_progress: "in progress",
    needs_input: "needs input",
    error: "error",
    success: "success"
  };

  const selectedIndicator = data.statusIndicators?.find((indicator) => indicator.isSelected);
  const selectedLabel = selectedIndicator
    ? stateLabel[selectedIndicator.state] ?? selectedIndicator.state
    : "not started";
  const selectedColor = selectedIndicator
    ? stateColor[selectedIndicator.state] ?? "bg-slate-300"
    : "bg-slate-300";

  const skillsCount = data.skills?.length ?? 0;
  const skillsLabel = skillsCount === 0 ? "none" : `${skillsCount}`;

  return (
    <div
      data-testid={`node-${data.name}`}
      className="relative min-w-[220px] rounded-2xl border border-slate/200 bg-white px-4 py-3 text-center shadow-sm"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="h-2 w-2 border-2 border-white bg-slate-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2 w-2 border-2 border-white bg-slate-400"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-2">
          <p
            data-testid={`node-${data.name}-title`}
            className="text-sm font-semibold text-slate/90"
          >
            {data.name}
          </p>
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate/60">
            <span className={`h-2 w-2 rounded-full ${selectedColor}`} />
            {selectedLabel}
          </span>
        </div>
        <p
          data-testid={`node-${data.name}-provider`}
          className="text-xs text-slate/60"
        >
          {data.provider}
        </p>

        <div className="mt-1 grid w-full grid-cols-3 gap-2 text-[11px] text-slate/70">
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-slate-50 px-2 py-1">
            <span className="text-[10px] uppercase tracking-wide text-slate/50">Model</span>
            <span className="font-semibold text-slate/80">{data.model}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-slate-50 px-2 py-1">
            <span className="text-[10px] uppercase tracking-wide text-slate/50">Iterations</span>
            <span className="font-semibold text-slate/80">{data.maxIterations}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-slate-50 px-2 py-1">
            <span className="text-[10px] uppercase tracking-wide text-slate/50">Skills</span>
            <span className="font-semibold text-slate/80">{skillsLabel}</span>
          </div>
        </div>

        <p className="w-full truncate text-[11px] text-slate/60">
          {data.description || "No description"}
        </p>

        {data.statusIndicators && data.statusIndicators.length > 0 && (
          <div className="mt-1 flex w-full flex-col gap-1 text-[10px] text-slate/50">
            {data.statusIndicators.map((indicator) => {
              const color = stateColor[indicator.state] ?? "bg-slate-300";
              const label = stateLabel[indicator.state] ?? indicator.state;
              return (
                <div
                  key={`${indicator.runId}-${indicator.state}`}
                  className="flex items-center justify-center gap-2"
                >
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  <span>
                    {label} • {indicator.runId.slice(0, 6)}
                  </span>
                </div>
              );
            })}
            {data.overflowCount && data.overflowCount > 0 && (
              <div className="text-[10px] text-slate/40">+{data.overflowCount} more</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
