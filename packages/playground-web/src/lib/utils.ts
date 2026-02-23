import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format JSON for display
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate mock data from a Zod schema
 */
export function generateMockFromSchema(schema: import('zod').ZodSchema): unknown {
  const def = schema._def;
  return generateFromDef(def);
}

function generateFromDef(def: import('zod').ZodTypeDef & { typeName?: string }): unknown {
  const typeName = def.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'mock_string';
    case 'ZodNumber':
      return 42;
    case 'ZodBoolean':
      return true;
    case 'ZodNull':
      return null;
    case 'ZodUndefined':
      return undefined;
    case 'ZodLiteral':
      return (def as { value: unknown }).value;
    case 'ZodEnum':
      return (def as { values: string[] }).values[0];
    case 'ZodArray':
      const itemDef = (def as { type: { _def: import('zod').ZodTypeDef } }).type._def;
      return [generateFromDef(itemDef)];
    case 'ZodObject':
      const shape = (def as { shape: () => Record<string, import('zod').ZodTypeAny> }).shape();
      const result: Record<string, unknown> = {};
      for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = generateFromDef(fieldSchema._def);
      }
      return result;
    case 'ZodOptional':
    case 'ZodNullable':
      const innerType = (def as { innerType: import('zod').ZodTypeAny }).innerType;
      return generateFromDef(innerType._def);
    case 'ZodDefault':
      return (def as { defaultValue: () => unknown }).defaultValue();
    default:
      return null;
  }
}

/**
 * Custom mock outputs for known node types
 */
export const MOCK_OUTPUTS: Record<string, unknown> = {
  // Logic nodes
  conditional: {
    conditionMet: true,
    selectedBranch: 'true',
  },
  end: {
    terminated: true,
    reason: 'Workflow completed',
  },
  delay: {
    waited: true,
    actualDurationMs: 1000,
  },

  // Transform nodes
  map: {
    results: ['value1', 'value2', 'value3'],
    count: 3,
  },
  filter: {
    results: [{ id: 1, status: 'active' }, { id: 2, status: 'active' }],
    count: 2,
    filteredOut: 1,
  },

  // Integration nodes
  search_contacts: {
    contacts: [
      {
        id: 'mock_1',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        title: 'CTO',
        company: 'Example Corp',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        location: 'San Francisco, CA',
      },
    ],
    totalFound: 1,
  },
  reddit_monitor: {
    posts: [
      {
        id: 'mock_post',
        title: 'Looking for SaaS recommendations',
        author: 'tech_enthusiast',
        subreddit: 'technology',
        score: 156,
        url: 'https://reddit.com/r/technology/comments/abc123',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  http_request: {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: { success: true, data: { id: 1, message: 'Mock response' } },
  },

  // AI nodes
  social_ai_analyze: {
    analysis: [
      {
        postId: 'post_1',
        platform: 'twitter',
        sentiment: 'positive',
        sentimentScore: 0.85,
        relevanceScore: 0.92,
        urgencyScore: 0.45,
        topics: ['technology', 'startup', 'SaaS'],
        intent: 'information_seeking',
        summary: 'User expressing interest in new technology solutions for their startup.',
      },
      {
        postId: 'post_2',
        platform: 'reddit',
        sentiment: 'neutral',
        sentimentScore: 0.52,
        relevanceScore: 0.78,
        urgencyScore: 0.30,
        topics: ['programming', 'tools'],
        intent: 'recommendation_request',
        summary: 'User asking for tool recommendations in a technical subreddit.',
      },
    ],
    totalAnalyzed: 2,
    averageSentiment: 0.68,
    averageRelevance: 0.85,
  },
  ai_generate: {
    generatedContent: 'This is AI-generated content based on your prompt. It demonstrates the capability of the AI generation node to create contextual responses.',
    tokensUsed: 150,
    model: 'gpt-4',
  },
  ai_summarize: {
    summary: 'The provided content discusses key trends in technology and their impact on modern businesses.',
    keyPoints: ['Technology adoption is accelerating', 'AI is transforming workflows', 'Cloud infrastructure is essential'],
    wordCount: 45,
  },
};

/**
 * Get mock output for a node type
 */
export function getMockOutput(nodeType: string, outputSchema: import('zod').ZodSchema): unknown {
  if (MOCK_OUTPUTS[nodeType]) {
    return MOCK_OUTPUTS[nodeType];
  }
  return generateMockFromSchema(outputSchema);
}
