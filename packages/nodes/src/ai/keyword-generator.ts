import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../utils/http.js';
import {
  SocialKeywordGeneratorInputSchema,
  SocialKeywordGeneratorOutputSchema,
  type SocialKeywordGeneratorOutput,
} from '../schemas/ai.js';
import { buildKeywordPrompt } from '../prompts/keyword-generator.js';

// =============================================================================
// Constants
// =============================================================================

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

// =============================================================================
// Types
// =============================================================================

interface AnthropicMessagesResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Generate text using Anthropic Claude API
 */
async function generateText(
  apiKey: string,
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { model = 'claude-sonnet-4-20250514', maxTokens = 2000 } = options;

  const response = await fetchWithRetry(
    `${ANTHROPIC_API_BASE}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 60000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data: AnthropicMessagesResponse = await response.json();
  return data.content[0]?.text || '';
}

// Re-export schemas for convenience
export {
  SocialKeywordGeneratorInputSchema,
  SocialKeywordGeneratorOutputSchema,
  type SocialKeywordGeneratorInput,
  type SocialKeywordGeneratorOutput,
} from '../schemas/ai.js';

/**
 * Social Keyword Generator Node
 *
 * Uses Claude to generate platform-specific search keywords from a user's
 * natural language topic description. Outputs ready-to-use search queries
 * for Twitter, Reddit, and LinkedIn.
 *
 * Requires `context.credentials.anthropic.apiKey` to be provided.
 *
 * @example
 * ```typescript
 * const result = await socialKeywordGeneratorNode.executor({
 *   topic: 'People frustrated with project management tools',
 *   userKeywords: ['asana', 'monday.com']
 * }, context);
 * ```
 */
export const socialKeywordGeneratorNode = defineNode({
  type: 'social_keyword_generator',
  name: 'Social Keyword Generator',
  description: 'Generate platform-specific search keywords using AI for social monitoring',
  category: 'action',
  inputSchema: SocialKeywordGeneratorInputSchema,
  outputSchema: SocialKeywordGeneratorOutputSchema,
  estimatedDuration: 15,
  capabilities: {
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      // Check for API key
      const apiKey = context.credentials?.anthropic?.apiKey;
      if (!apiKey) {
        return {
          success: false,
          error: 'Anthropic API key not configured. Please provide context.credentials.anthropic.apiKey.',
        };
      }

      // Build prompt using helper
      const prompt = buildKeywordPrompt(input.topic, input.userKeywords);

      // Call Claude to generate keywords
      const responseText = await generateText(apiKey, prompt, {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 2000,
      });

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Could not parse keyword response' };
      }

      let parsed: {
        twitter: { keywords: string[]; searchQuery: string };
        reddit: { keywords: string[] };
        linkedin: { keywords: string[]; searchQueries: string[] };
      };

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return { success: false, error: 'Failed to parse keyword JSON response' };
      }

      // Merge user keywords into generated keywords (deduplicated)
      const mergedTwitterKeywords = [...new Set([
        ...parsed.twitter.keywords,
        ...(input.userKeywords || []),
      ])];

      const mergedRedditKeywords = [...new Set([
        ...parsed.reddit.keywords,
        ...(input.userKeywords || []),
      ])];

      const mergedLinkedInKeywords = [...new Set([
        ...parsed.linkedin.keywords,
        ...(input.userKeywords || []),
      ])];

      // Collect all unique keywords
      const allKeywords = [...new Set([
        ...mergedTwitterKeywords,
        ...mergedRedditKeywords,
        ...mergedLinkedInKeywords,
      ])];

      const output: SocialKeywordGeneratorOutput = {
        topic: input.topic,
        twitter: {
          keywords: mergedTwitterKeywords,
          searchQuery: parsed.twitter.searchQuery,
        },
        reddit: {
          keywords: mergedRedditKeywords,
        },
        linkedin: {
          keywords: mergedLinkedInKeywords,
          searchQueries: parsed.linkedin.searchQueries,
        },
        allKeywords,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate keywords',
      };
    }
  },
});
