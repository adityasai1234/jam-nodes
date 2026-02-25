import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../utils/http.js';
import {
  SocialAiAnalyzeInputSchema,
  SocialAiAnalyzeOutputSchema,
  type SocialPost,
  type AnalyzedPost,
} from '../schemas/ai.js';
import {
  buildAnalysisPrompt,
  normalizeSentiment,
  normalizeUrgency,
  MIN_RELEVANCE_SCORE,
  ANALYSIS_BATCH_SIZE,
} from '../prompts/analyze-posts.js';

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
  const { model = 'claude-sonnet-4-20250514', maxTokens = 4000 } = options;

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
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 120000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data: AnthropicMessagesResponse = await response.json();
  return data.content[0]?.text || '';
}

// Re-export schemas and types for convenience
export {
  SocialAiAnalyzeInputSchema,
  SocialAiAnalyzeOutputSchema,
  type SocialAiAnalyzeInput,
  type SocialAiAnalyzeOutput,
  type SocialPost,
  type AnalyzedPost,
} from '../schemas/ai.js';

/**
 * Social AI Analyze Node
 *
 * Uses Claude to analyze social media posts for relevance, sentiment,
 * complaint detection, and urgency. Batches posts to stay within context limits.
 *
 * Requires `context.credentials.anthropic.apiKey` to be provided.
 *
 * Note: This node analyzes posts but does NOT store results.
 * Storage is the responsibility of the host application.
 *
 * @example
 * ```typescript
 * const result = await socialAiAnalyzeNode.executor({
 *   twitterPosts: [...],
 *   redditPosts: [...],
 *   topic: 'Project management software',
 *   userIntent: 'Find people frustrated with current tools'
 * }, context);
 * ```
 */
export const socialAiAnalyzeNode = defineNode({
  type: 'social_ai_analyze',
  name: 'Social AI Analyze',
  description: 'Analyze social media posts for relevance, sentiment, and urgency using AI',
  category: 'action',
  inputSchema: SocialAiAnalyzeInputSchema,
  outputSchema: SocialAiAnalyzeOutputSchema,
  estimatedDuration: 60,
  capabilities: {
    supportsRerun: true,
    supportsBulkActions: true,
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

      // Combine posts from all platforms
      const allPosts: SocialPost[] = [
        ...(input.twitterPosts || []),
        ...(input.redditPosts || []),
        ...(input.linkedinPosts || []),
        ...(input.posts || []),
      ];

      if (allPosts.length === 0) {
        return {
          success: true,
          output: {
            analyzedPosts: [],
            highPriorityPosts: [],
            complaints: [],
            totalAnalyzed: 0,
            highPriorityCount: 0,
            complaintCount: 0,
            averageRelevance: 0,
          },
        };
      }

      // Batch posts for Claude (to stay within context limits)
      const allAnalyzedPosts: AnalyzedPost[] = [];

      for (let i = 0; i < allPosts.length; i += ANALYSIS_BATCH_SIZE) {
        const batch = allPosts.slice(i, i + ANALYSIS_BATCH_SIZE);

        const prompt = buildAnalysisPrompt(input.topic, input.userIntent, batch);

        const responseText = await generateText(apiKey, prompt, {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4000,
        });

        // Parse JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          continue;
        }

        try {
          const analyzed = JSON.parse(jsonMatch[0]) as Array<{
            id: string;
            relevanceScore: number;
            sentiment: string;
            isComplaint: boolean;
            urgencyLevel: string;
            aiSummary: string;
            matchedKeywords: string[];
          }>;

          // Merge analysis with original post data
          for (const analysis of analyzed) {
            const originalPost = batch.find((p) => p.id === analysis.id);
            if (originalPost && analysis.relevanceScore >= MIN_RELEVANCE_SCORE) {
              allAnalyzedPosts.push({
                ...originalPost,
                relevanceScore: analysis.relevanceScore,
                sentiment: normalizeSentiment(analysis.sentiment),
                isComplaint: Boolean(analysis.isComplaint),
                urgencyLevel: normalizeUrgency(analysis.urgencyLevel),
                aiSummary: analysis.aiSummary || '',
                matchedKeywords: analysis.matchedKeywords || [],
              });
            }
          }
        } catch {
          continue;
        }
      }

      // Sort by relevance (highest first)
      allAnalyzedPosts.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Filter high priority and complaints
      const highPriorityPosts = allAnalyzedPosts.filter(
        (p) => p.urgencyLevel === 'high' || p.relevanceScore >= 80
      );
      const complaints = allAnalyzedPosts.filter((p) => p.isComplaint);

      // Calculate average relevance
      const averageRelevance =
        allAnalyzedPosts.length > 0
          ? Math.round(
              allAnalyzedPosts.reduce((sum, p) => sum + p.relevanceScore, 0) /
                allAnalyzedPosts.length
            )
          : 0;

      return {
        success: true,
        output: {
          analyzedPosts: allAnalyzedPosts,
          highPriorityPosts,
          complaints,
          totalAnalyzed: allAnalyzedPosts.length,
          highPriorityCount: highPriorityPosts.length,
          complaintCount: complaints.length,
          averageRelevance,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze posts',
      };
    }
  },
});
