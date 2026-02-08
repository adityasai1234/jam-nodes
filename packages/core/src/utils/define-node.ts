import type { z } from 'zod';
import type {
  NodeDefinition,
  NodeExecutor,
  NodeCapabilities,
  NodeCategory,
} from '../types/index.js';

/**
 * Configuration for defining a node
 */
export interface DefineNodeConfig<TInput, TOutput> {
  /** Unique node type identifier */
  type: string;
  /** Display name */
  name: string;
  /** Description of what the node does */
  description: string;
  /** Category for grouping */
  category: NodeCategory;
  /** Zod schema for validating input */
  inputSchema: z.ZodSchema<TInput>;
  /** Zod schema for validating output */
  outputSchema: z.ZodSchema<TOutput>;
  /** Executor function */
  executor: NodeExecutor<TInput, TOutput>;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Node capabilities */
  capabilities?: NodeCapabilities;
}

/**
 * Type-safe helper for defining nodes.
 *
 * @example
 * ```typescript
 * import { defineNode } from '@jam-nodes/core';
 * import { z } from 'zod';
 *
 * export const myNode = defineNode({
 *   type: 'my_node',
 *   name: 'My Node',
 *   description: 'Does something useful',
 *   category: 'action',
 *   inputSchema: z.object({
 *     message: z.string(),
 *   }),
 *   outputSchema: z.object({
 *     result: z.string(),
 *   }),
 *   executor: async (input, context) => {
 *     return {
 *       success: true,
 *       output: { result: `Processed: ${input.message}` },
 *     };
 *   },
 * });
 * ```
 */
export function defineNode<TInput, TOutput>(
  config: DefineNodeConfig<TInput, TOutput>
): NodeDefinition<TInput, TOutput> {
  return {
    type: config.type,
    name: config.name,
    description: config.description,
    category: config.category,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    executor: config.executor,
    estimatedDuration: config.estimatedDuration,
    capabilities: config.capabilities,
  };
}
