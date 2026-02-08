import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for delay node
 */
export const DelayInputSchema = z.object({
  /** Duration to wait in milliseconds */
  durationMs: z.number().min(0).max(3600000), // Max 1 hour
  /** Optional message to log */
  message: z.string().optional(),
});

export type DelayInput = z.infer<typeof DelayInputSchema>;

/**
 * Output schema for delay node
 */
export const DelayOutputSchema = z.object({
  waited: z.boolean(),
  actualDurationMs: z.number(),
  message: z.string().optional(),
});

export type DelayOutput = z.infer<typeof DelayOutputSchema>;

/**
 * Delay node - pause workflow execution for a specified duration.
 *
 * Useful for rate limiting, scheduling, or waiting for external processes.
 *
 * @example
 * ```typescript
 * // Wait 5 seconds
 * { durationMs: 5000, message: 'Waiting before next API call' }
 * ```
 */
export const delayNode = defineNode({
  type: 'delay',
  name: 'Delay',
  description: 'Wait for a specified duration before continuing',
  category: 'logic',
  inputSchema: DelayInputSchema,
  outputSchema: DelayOutputSchema,
  capabilities: {
    supportsCancel: true,
  },
  executor: async (input) => {
    const start = Date.now();

    await new Promise((resolve) => setTimeout(resolve, input.durationMs));

    return {
      success: true,
      output: {
        waited: true,
        actualDurationMs: Date.now() - start,
        message: input.message,
      },
    };
  },
});
