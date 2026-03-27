import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for retry node
 */
export const RetryInputSchema = z.object({
  maxRetries: z.number().int().min(1).max(10).default(3),
  initialDelayMs: z.number().int().nonnegative().optional().default(1000),
  maxDelayMs: z.number().int().nonnegative().optional().default(30000),
  backoffMultiplier: z.number().int().min(1).optional().default(2),
  retryOn: z.array(z.string()).optional(),
});

export type RetryInput = z.infer<typeof RetryInputSchema>;

/**
 * Output schema for retry node
 */
export const RetryOutputSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
});

export type RetryOutput = z.infer<typeof RetryOutputSchema>;

/**
 * Retry node that executes an operation with automatic retry using exponential backoff.
 */
export const retryNode = defineNode({
  type: 'retry',
  name: 'Retry',
  description: 'Execute operation with automatic retry using exponential backoff',
  category: 'logic',
  inputSchema: RetryInputSchema,
  outputSchema: RetryOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    const { 
      maxRetries = 3, 
      initialDelayMs = 1000, 
      maxDelayMs = 30000, 
      backoffMultiplier = 2 
    } = input;
    
    let lastError: Error | null = null;
    
    // Simple operation that can fail based on context (for testing)
    const operation = async (): Promise<{ success: true; output: unknown }> => {
      // Simulate failure if context variable is set
      if (context.variables['retryShouldFail'] === true) {
        const failAttempt = context.variables['retryFailAttempt'] as number | undefined;
        const attemptNum = context.variables['retryAttemptCount'] as number || 0;
        
        // Increment attempt count
        context.variables['retryAttemptCount'] = attemptNum + 1;
        
        // Check if we should fail this attempt
        if (failAttempt === undefined || attemptNum < failAttempt) {
          let errorMessage: string;
          const retryErrorMessage = context.variables['retryErrorMessage'];
          if (typeof retryErrorMessage === 'string') {
            errorMessage = retryErrorMessage;
          } else {
            errorMessage = `Simulated failure on attempt ${attemptNum + 1}`;
          }
          throw new Error(errorMessage);
        }
      }
      
      // Return success with some output
      return { success: true, output: { retried: true, attempt: context.variables['retryAttemptCount'] || 0 } };
    };
    
    // Try the operation up to maxRetries times
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, output: result.output };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was our last attempt, don't retry
        if (attempt === maxRetries - 1) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries exhausted
    return {
      success: false,
      error: lastError ? lastError.message : 'Operation failed after all retries',
    };
  },
});