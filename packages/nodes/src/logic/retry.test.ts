import { describe, it, expect } from 'vitest';
import { retryNode, RetryInputSchema } from './retry.js';

describe('RetryInputSchema', () => {
  it('validates valid input', () => {
    const result = RetryInputSchema.safeParse({ maxRetries: 3 });
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const result = RetryInputSchema.parse({ maxRetries: 3 });
    expect(result.initialDelayMs).toBe(1000);
    expect(result.maxDelayMs).toBe(30000);
    expect(result.backoffMultiplier).toBe(2);
    expect(result.retryOn).toEqual([]);
  });

  it('rejects maxRetries < 1', () => {
    const result = RetryInputSchema.safeParse({ maxRetries: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects maxRetries > 10', () => {
    const result = RetryInputSchema.safeParse({ maxRetries: 11 });
    expect(result.success).toBe(false);
  });
});

describe('retryNode', () => {
  it('has correct metadata', () => {
    expect(retryNode.type).toBe('retry');
    expect(retryNode.name).toBe('Retry');
    expect(retryNode.category).toBe('logic');
  });

  it('executes successfully on first attempt', async () => {
    const result = await retryNode.executor({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      retryOn: [],
      payload: { data: 'test' },
    });
    expect(result.success).toBe(true);
    expect(result.output.succeeded).toBe(true);
    expect(result.output.attempts).toBe(1);
    expect(result.output.delays).toEqual([]);
    expect(result.output.payload).toEqual({ data: 'test' });
  });

  it('passes through payload', async () => {
    const payload = { url: 'https://api.example.com', method: 'GET' };
    const result = await retryNode.executor({
      maxRetries: 1,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      retryOn: [],
      payload,
    });
    expect(result.output.payload).toEqual(payload);
  });

  it('works without payload', async () => {
    const result = await retryNode.executor({
      maxRetries: 2,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      retryOn: [],
    });
    expect(result.success).toBe(true);
    expect(result.output.payload).toBeUndefined();
  });
});
