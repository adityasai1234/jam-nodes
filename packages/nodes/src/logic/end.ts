import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for end node
 */
export const EndInputSchema = z.object({
  message: z.string().optional(),
});

export type EndInput = z.infer<typeof EndInputSchema>;

/**
 * Output schema for end node
 */
export const EndOutputSchema = z.object({
  completed: z.boolean(),
  message: z.string().optional(),
});

export type EndOutput = z.infer<typeof EndOutputSchema>;

/**
 * End node - marks the completion of a workflow branch.
 *
 * This is a terminal node that signals the workflow executor
 * that this execution path has completed successfully.
 *
 * @example
 * ```typescript
 * // Simple end
 * { message: 'Workflow completed successfully' }
 * ```
 */
export const endNode = defineNode({
  type: 'end',
  name: 'End',
  description: 'Mark the end of a workflow branch',
  category: 'logic',
  inputSchema: EndInputSchema,
  outputSchema: EndOutputSchema,
  estimatedDuration: 0,
  executor: async (input) => {
    return {
      success: true,
      output: {
        completed: true,
        message: input.message,
      },
    };
  },
});
