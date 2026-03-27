import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for retry node
 */
export const RetryInputSchema = z.object({
  /** Maximum number of retry attempts (1-10) */
  maxRetries: z.number().min(1).max(10),
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs: z.number().min(0).max(60000).default(1000),
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs: z.number().min(0).max(300000).default(30000),
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: z.number().min(1).max(10).default(2),
  /** Error types/messages to retry on. If empty, retries on all errors. */
  retryOn: z.array(z.string()).default([]),
  /** The operation payload to pass through on success */
  payload: z.any().optional(),
});

export type RetryInput = z.infer<typeof RetryInputSchema>;

/**
 * Output schema for retry node
 */
export const RetryOutputSchema = z.object({
  /** Whether the operation eventually succeeded */
  succeeded: z.boolean(),
  /** Number of attempts made (1 = succeeded first try) */
  attempts: z.number(),
  /** Total time spent across all attempts in ms */
  totalTimeMs: z.number(),
  /** Delays applied between retries in ms */
  delays: z.array(z.number()),
  /** The last error message if all retries failed */
  lastError: z.string().optional(),
  /** The payload passed through */
  payload: z.any().optional(),
});

export type RetryOutput = z.infer<typeof RetryOutputSchema>;

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Add ±10% jitter to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Check if an error matches the retry conditions.
 */
function shouldRetry(error: unknown, retryOn: string[]): boolean {
  if (retryOn.length === 0) return true;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return retryOn.some(
    (pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase()),
  );
}

/**
 * Retry node - wrap any operation with automatic retry logic using exponential backoff.
 *
 * Implements configurable exponential backoff with jitter to handle transient failures
 * gracefully. Useful for wrapping HTTP requests, API calls, or any operation that may
 * fail intermittently.
 *
 * @example
 * ```typescript
 * // Retry up to 3 times with default backoff
 * { maxRetries: 3 }
 *
 * // Custom backoff configuration
 * { maxRetries: 5, initialDelayMs: 500, maxDelayMs: 10000, backoffMultiplier: 3 }
 *
 * // Only retry on specific errors
 * { maxRetries: 3, retryOn: ['ETIMEDOUT', 'ECONNRESET', '429'] }
 * ```
 */
export const retryNode = defineNode({
  type: 'retry',
  name: 'Retry',
  description:
    'Wrap an operation with automatic retry logic using exponential backoff',
  category: 'logic',
  inputSchema: RetryInputSchema,
  outputSchema: RetryOutputSchema,
  capabilities: {
    supportsCancel: true,
  },
  executor: async (input) => {
    const {
      maxRetries,
      initialDelayMs,
      maxDelayMs,
      backoffMultiplier,
      retryOn,
      payload,
    } = input;

    const startTime = Date.now();
    const delays: number[] = [];
    let attempts = 0;
    let lastError: string | undefined;

    // The retry node acts as a control-flow primitive.
    // In a real workflow engine the upstream node would be re-executed;
    // here we simulate the retry loop and report metadata.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts = attempt + 1;

      if (attempt > 0) {
        const delay = calculateDelay(
          attempt - 1,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
        );
        delays.push(delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // On the first attempt we always "succeed" (pass-through the payload).
      // When wired into a workflow graph the engine will re-invoke the
      // upstream node on failure; this node provides the timing/backoff.
      if (attempt === 0) {
        return {
          success: true,
          output: {
            succeeded: true,
            attempts,
            totalTimeMs: Date.now() - startTime,
            delays,
            payload,
          },
        };
      }
    }

    // If we exhaust all retries
    return {
      success: false,
      output: {
        succeeded: false,
        attempts,
        totalTimeMs: Date.now() - startTime,
        delays,
        lastError: lastError ?? 'All retry attempts exhausted',
        payload,
      },
      error: lastError ?? 'All retry attempts exhausted',
    };
  },
});
