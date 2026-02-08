import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * HTTP method schema
 */
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * Input schema for HTTP request node
 */
export const HttpRequestInputSchema = z.object({
  /** URL to request */
  url: z.string().url(),
  /** HTTP method */
  method: HttpMethodSchema.default('GET'),
  /** Request headers */
  headers: z.record(z.string()).optional(),
  /** Request body (for POST, PUT, PATCH) */
  body: z.unknown().optional(),
  /** Timeout in milliseconds */
  timeout: z.number().min(1000).max(60000).default(30000),
});

export type HttpRequestInput = z.infer<typeof HttpRequestInputSchema>;

/**
 * Output schema for HTTP request node
 */
export const HttpRequestOutputSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string()),
  body: z.unknown(),
  ok: z.boolean(),
  durationMs: z.number(),
});

export type HttpRequestOutput = z.infer<typeof HttpRequestOutputSchema>;

/**
 * HTTP Request node - make HTTP requests to external APIs.
 *
 * Supports all common HTTP methods with configurable headers,
 * body, and timeout.
 *
 * @example
 * ```typescript
 * // GET request
 * {
 *   url: 'https://api.example.com/data',
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer {{apiKey}}' }
 * }
 *
 * // POST request with JSON body
 * {
 *   url: 'https://api.example.com/submit',
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: { name: '{{userName}}', email: '{{userEmail}}' }
 * }
 * ```
 */
export const httpRequestNode = defineNode({
  type: 'http_request',
  name: 'HTTP Request',
  description: 'Make an HTTP request to an external API',
  category: 'integration',
  inputSchema: HttpRequestInputSchema,
  outputSchema: HttpRequestOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsRerun: true,
    supportsCancel: true,
  },
  executor: async (input) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeout);
    const start = Date.now();

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Try to parse as JSON, fall back to text
      let body: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        success: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers,
          body,
          ok: response.ok,
          durationMs: Date.now() - start,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timed out after ${input.timeout}ms`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  },
});
