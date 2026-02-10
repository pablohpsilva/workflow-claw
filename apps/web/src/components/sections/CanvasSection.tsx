import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  NodeChange,
  EdgeChange
} from "reactflow";
import "reactflow/dist/style.css";
import Section from "../ui/Section";

export default function CanvasSection({
  nodes,
  flowEdges,
  nodeTypes,
  onNodesChange,
  onNodeDragStop,
  onEdgesChange,
  onConnect,
  configLocked,
  setSelectedStepId
}: {
  nodes: Node[];
  flowEdges: Edge[];
  nodeTypes: Record<string, React.ComponentType<any>>;
  onNodesChange: OnNodesChange;
  onNodeDragStop: (_: React.MouseEvent | React.TouchEvent, node: Node) => void;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  configLocked: boolean;
  setSelectedStepId: (id: string) => void;
}) {
  return (
    <Section title="Workflow Canvas" testId="section-canvas">
      <div data-testid="canvas-wrapper" className="h-[480px] rounded-2xl border border-slate/10 bg-white">
        <ReactFlow
          data-testid="workflow-canvas"
          nodes={nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodesDraggable={!configLocked}
          nodesConnectable={!configLocked}
          onNodeClick={(_, node) => setSelectedStepId(node.id)}
          fitView
        >
          <Background data-testid="canvas-background" gap={24} size={1} />
          <Controls data-testid="canvas-controls" />
          <MiniMap data-testid="canvas-minimap" />
        </ReactFlow>
      </div>
    </Section>
  );
}
