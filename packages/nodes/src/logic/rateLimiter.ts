import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Input schema for rate limiter node
 */
export const RateLimiterInputSchema = z.object({
  requestsPerWindow: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  strategy: z.enum(['fixed', 'sliding']),
});

export type RateLimiterInput = z.infer<typeof RateLimiterInputSchema>;

/**
 * Output schema for rate limiter node
 */
export const RateLimiterOutputSchema = z.object({
  limited: z.boolean(),
  currentRequests: z.number(),
  limit: z.number(),
  windowMs: z.number(),
  strategy: z.enum(['fixed', 'sliding']),
});

export type RateLimiterOutput = z.infer<typeof RateLimiterOutputSchema>;

/**
 * Rate limiter node that queues requests to stay within API limits.
 * 
 * This node implements rate limiting by tracking request timestamps and 
 * delaying execution when limits are exceeded.
 * 
 * Strategies:
 * - fixed: Reset counter at fixed intervals
 * - sliding: Use sliding window algorithm
 */
export const rateLimiterNode = defineNode({
  type: 'rateLimiter',
  name: 'Rate Limiter',
  description: 'Queue requests to stay within API rate limits',
  category: 'logic',
  inputSchema: RateLimiterInputSchema,
  outputSchema: RateLimiterOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    const { requestsPerWindow, windowMs, strategy } = input;
    
    // Initialize rate limiting state in context if not present
    const rateLimitKey = `rateLimit_${JSON.stringify(input)}`;
    let state = context.variables[rateLimitKey] as {
      requests: number[];
      windowStart: number;
    } | undefined;
    
    if (!state) {
      state = {
        requests: [],
        windowStart: Date.now(),
      };
      context.variables[rateLimitKey] = state;
    }
    
    const now = Date.now();
    const windowStart = state.windowStart;
    
    // Remove requests outside the current window
    if (strategy === 'fixed') {
      // Fixed window: reset if we've passed the window
      if (now - windowStart >= windowMs) {
        state.requests = [];
        state.windowStart = now;
      }
    } else {
      // Sliding window: remove old requests
      state.requests = state.requests.filter(timestamp => now - timestamp < windowMs);
    }
    
    // Check if we're at the limit
    if (state.requests.length >= requestsPerWindow) {
      // Calculate when the next request will be allowed
      const oldestRequest = Math.min(...state.requests);
      const waitTime = windowMs - (now - oldestRequest);
      
      // Wait until we can make another request
      await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
      
      // After waiting, update state
      const newNow = Date.now();
      if (strategy === 'fixed') {
        // Check if we need to reset the window
        if (newNow - state.windowStart >= windowMs) {
          state.requests = [];
          state.windowStart = newNow;
        }
      } else {
        // Sliding window: remove old requests again
        state.requests = state.requests.filter(timestamp => newNow - timestamp < windowMs);
      }
    }
    
    // Record this request
    state.requests.push(Date.now());
    
    // Operation succeeded - return success
    return {
      success: true,
      output: { 
        limited: false,
        currentRequests: state.requests.length,
        limit: requestsPerWindow,
        windowMs,
        strategy
      },
    };
  },
});