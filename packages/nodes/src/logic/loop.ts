import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for loop node
 */
export const LoopInputSchema = z.object({
  items: z.array(z.unknown()).min(0, 'Items array is required'),
  concurrency: z.number().int().positive().optional().default(1),
  delayMs: z.number().int().nonnegative().optional().default(0),
  continueOnError: z.boolean().optional().default(false),
});

export type LoopInput = z.infer<typeof LoopInputSchema>;

/**
 * Output schema for loop node
 */
export const LoopOutputSchema = z.object({
  results: z.array(z.unknown()),
  errors: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      error: z.string(),
    })
  ).optional(),
});

export type LoopOutput = z.infer<typeof LoopOutputSchema>;

/**
 * Loop node that iterates over an array of items with rate limiting
 *
 * Executes child nodes for each item in the input array with support for:
 * - Sequential iteration (default)
 * - Parallel execution with concurrency limit
 * - Rate limiting via delay between iterations
 * - Error handling per item with continue option
 */
export const loopNode = defineNode({
  type: 'loop',
  name: 'Loop',
  description: 'Iterate over arrays with rate limiting support',
  category: 'logic',
  inputSchema: LoopInputSchema,
  outputSchema: LoopOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    const { items, concurrency = 1, delayMs = 0, continueOnError = false } = input;
    
    const results: unknown[] = [];
    const errors: { index: number; error: string }[] = [];
    
    // Process items in batches based on concurrency
    for (let batchStart = 0; batchStart < items.length; batchStart += concurrency) {
      const batchEnd = Math.min(batchStart + concurrency, items.length);
      const batchItems = items.slice(batchStart, batchEnd);
      
      // Process each item in the current batch
      const batchPromises = batchItems.map(async (item, batchIndex) => {
        const globalIndex = batchStart + batchIndex;
        
        try {
          // Apply delay if specified (except for first item)
          if (delayMs > 0 && globalIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // For now, we just pass through the item as the result
          // In a real implementation, this would execute child nodes
          results[globalIndex] = item;
          
          return { success: true, index: globalIndex, result: item };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (!continueOnError) {
            throw new Error(`Loop iteration failed at index ${globalIndex}: ${errorMessage}`);
          }
          
          errors.push({
            index: globalIndex,
            error: errorMessage,
          });
          
          return { success: false, index: globalIndex, error: errorMessage };
        }
      });
      
      // Wait for all promises in the batch to complete
      await Promise.all(batchPromises);
    }
    
    return {
      success: true,
      output: {
        results,
        ...(errors.length > 0 && { errors }),
      },
    };
  },
});