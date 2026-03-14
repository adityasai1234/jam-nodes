import { describe, it, expect, beforeEach } from 'vitest';
import { loopNode } from './loop';
import { ExecutionContext } from '@jam-nodes/core';

describe('loopNode', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = new ExecutionContext();
  });

  it('should iterate sequentially by default', async () => {
    const input = {
      items: [1, 2, 3],
      concurrency: 1,
      delayMs: 0,
      continueOnError: false,
    };

    const result = await loopNode.executor(input, context.toNodeContext('test', 'workflow'));

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual([1, 2, 3]);
    expect(result.output?.errors).toBeUndefined();
  });

  it('should process items in parallel with concurrency > 1', async () => {
    const input = {
      items: [1, 2, 3, 4, 5],
      concurrency: 2,
      delayMs: 0,
      continueOnError: false,
    };

    const result = await loopNode.executor(input, context.toNodeContext('test', 'workflow'));

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual([1, 2, 3, 4, 5]);
    expect(result.output?.errors).toBeUndefined();
  });

  it('should handle empty array', async () => {
    const input = {
      items: [],
      concurrency: 1,
      delayMs: 0,
      continueOnError: false,
    };

    const result = await loopNode.executor(input, context.toNodeContext('test', 'workflow'));

    expect(result.success).toBe(true);
    expect(result.output?.results).toEqual([]);
    expect(result.output?.errors).toBeUndefined();
  });

  it('should respect delay between iterations', async () => {
    const start = Date.now();
    const input = {
      items: [1, 2],
      concurrency: 1,
      delayMs: 10,
      continueOnError: false,
    };

    await loopNode.executor(input, context.toNodeContext('test', 'workflow'));
    const end = Date.now();
    
    // Should take at least 5ms (delay between first and second item)
    // Using a lower threshold due to potential timing variations in test environment
    expect(end - start).toBeGreaterThanOrEqual(5);
  });
});