import React from "react";
import { Handle, Position } from "reactflow";

export default function StepNode({ data }: { data: { name: string; provider: string; status?: string } }) {
  return (
    <div
      data-testid={`node-${data.name}`}
      className="relative min-w-[140px] rounded-xl border border-slate/200 bg-white px-3 py-2 shadow-sm"
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
      <div className="flex flex-col gap-1">
        <p data-testid={`node-${data.name}-title`} className="text-sm font-semibold text-slate/90">
          {data.name}
        </p>
        <p data-testid={`node-${data.name}-provider`} className="text-xs text-slate/60">
          {data.provider}
        </p>
      </div>
    </div>
  );
}
