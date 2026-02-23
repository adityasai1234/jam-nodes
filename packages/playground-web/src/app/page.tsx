'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { NodeRunner } from '@/components/NodeRunner';
import { getAllNodeMetadata, getNode } from '@/lib/registry';
import { Plug } from 'lucide-react';
import type { NodeMetadata, NodeDefinition } from '@jam-nodes/core';

export default function PlaygroundPage() {
  const [nodes, setNodes] = useState<NodeMetadata[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDefinition | null>(null);

  // Load nodes on mount
  useEffect(() => {
    setNodes(getAllNodeMetadata());
  }, []);

  // Load full node definition when selected
  useEffect(() => {
    if (selectedNodeType) {
      const node = getNode(selectedNodeType);
      setSelectedNode(node || null);
    } else {
      setSelectedNode(null);
    }
  }, [selectedNodeType]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        nodes={nodes}
        selectedNode={selectedNodeType || undefined}
        onSelect={setSelectedNodeType}
      />

      {/* Main area - Node runner */}
      <main className="flex-1 overflow-hidden">
        {selectedNode ? (
          <NodeRunner node={selectedNode} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plug className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">Select a node to get started</p>
              <p className="text-sm mt-1 text-muted-foreground">
                Choose from {nodes.length} available workflow nodes
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
