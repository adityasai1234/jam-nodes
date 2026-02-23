'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NodeRunner } from '@/components/NodeRunner';
import { getNode } from '@/lib/registry';
import type { NodeDefinition } from '@jam-nodes/core';

export default function NodePage() {
  const params = useParams();
  const router = useRouter();
  const [node, setNode] = useState<NodeDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nodeType = params.type as string;
    const nodeDef = getNode(nodeType);

    if (nodeDef) {
      setNode(nodeDef);
      setError(null);
    } else {
      setNode(null);
      setError(`Node not found: ${nodeType}`);
    }
  }, [params.type]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Back to Playground
          </button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {node.name}
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <NodeRunner node={node} />
        </div>
      </main>
    </div>
  );
}
