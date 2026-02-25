import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const FORUMSCOUT_BASE_URL = 'https://forumscout.app/api';

// =============================================================================
// Types
// =============================================================================

/**
 * ForumScout LinkedIn post response format
 */
interface ForumScoutLinkedInPost {
  author?: string;
  date?: string;
  domain?: string;
  snippet?: string;
  source?: string;
  title?: string;
  url?: string;
  text?: string;
  content?: string;
  authorName?: string;
  authorUrl?: string;
  authorProfileUrl?: string;
  authorHeadline?: string;
  authorFollowers?: number;
  likes?: number;
  numLikes?: number;
  comments?: number;
  numComments?: number;
  shares?: number;
  numShares?: number;
  reactions?: number;
  postedAt?: string;
  datePosted?: string;
  postedDate?: string;
  hashtags?: string[];
  id?: string;
  urn?: string;
}

/**
 * LinkedIn post in unified social format
 */
export interface LinkedInPost {
  id: string;
  platform: 'linkedin';
  url: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorUrl: string;
  authorFollowers: number;
  authorHeadline?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  hashtags: string[];
  postedAt: string;
}

// =============================================================================
// Schemas
// =============================================================================

export const LinkedInMonitorInputSchema = z.object({
  /** Keywords to search for */
  keywords: z.array(z.string()),
  /** Time filter for results */
  timeFilter: z.string().optional(),
  /** Maximum number of results */
  maxResults: z.number().optional().default(50),
});

export type LinkedInMonitorInput = z.infer<typeof LinkedInMonitorInputSchema>;

export const LinkedInMonitorOutputSchema = z.object({
  posts: z.array(z.object({
    id: z.string(),
    platform: z.literal('linkedin'),
    url: z.string(),
    text: z.string(),
    authorName: z.string(),
    authorHandle: z.string(),
    authorUrl: z.string(),
    authorFollowers: z.number(),
    authorHeadline: z.string().optional(),
    engagement: z.object({
      likes: z.number(),
      comments: z.number(),
      shares: z.number(),
    }),
    hashtags: z.array(z.string()),
    postedAt: z.string(),
  })),
  totalFound: z.number(),
});

export type LinkedInMonitorOutput = z.infer<typeof LinkedInMonitorOutputSchema>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract hashtags from post text
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

/**
 * Extract LinkedIn handle from profile URL
 */
function extractHandleFromUrl(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    const parts = url.split('/');
    const inIndex = parts.indexOf('in');
    if (inIndex !== -1) {
      const handle = parts[inIndex + 1];
      if (handle) {
        return handle.split('?')[0] ?? 'unknown';
      }
    }
    const companyIndex = parts.indexOf('company');
    if (companyIndex !== -1) {
      const handle = parts[companyIndex + 1];
      if (handle) {
        return handle.split('?')[0] ?? 'unknown';
      }
    }
    const lastPart = parts[parts.length - 1];
    return lastPart?.split('?')[0] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Search LinkedIn using ForumScout API
 */
async function searchLinkedIn(
  apiKey: string,
  keyword: string,
  options: {
    sortBy?: 'relevance' | 'date_posted';
    page?: number;
  } = {}
): Promise<ForumScoutLinkedInPost[]> {
  const url = new URL(`${FORUMSCOUT_BASE_URL}/linkedin_search`);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('sort_by', options.sortBy || 'date_posted');
  if (options.page) {
    url.searchParams.set('page', options.page.toString());
  }

  const response = await fetchWithRetry(
    url.toString(),
    {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 60000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ForumScout API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // ForumScout returns a raw array or wrapped in posts/results/data
  return Array.isArray(data)
    ? data
    : (data.posts || data.results || data.data || []);
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * LinkedIn Monitor Node
 *
 * Searches LinkedIn for posts matching keywords using ForumScout API.
 * Requires `context.credentials.forumScout.apiKey` to be provided.
 *
 * @example
 * ```typescript
 * const result = await linkedinMonitorNode.executor({
 *   keywords: ['hiring', 'remote'],
 *   maxResults: 25
 * }, context);
 * ```
 */
export const linkedinMonitorNode = defineNode({
  type: 'linkedin_monitor',
  name: 'LinkedIn Monitor',
  description: 'Search LinkedIn for posts matching keywords using ForumScout',
  category: 'integration',
  inputSchema: LinkedInMonitorInputSchema,
  outputSchema: LinkedInMonitorOutputSchema,
  estimatedDuration: 60,
  capabilities: {
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      const keywords = input.keywords.map(k => k.trim()).filter(Boolean);

      if (keywords.length === 0) {
        return {
          success: false,
          error: 'No valid keywords provided',
        };
      }

      // Check for API key
      const apiKey = context.credentials?.forumScout?.apiKey;
      if (!apiKey) {
        return {
          success: false,
          error: 'ForumScout API key not configured. Please provide context.credentials.forumScout.apiKey.',
        };
      }

      // Search LinkedIn with combined keywords
      const searchKeyword = keywords.join(' ');
      const results = await searchLinkedIn(apiKey, searchKeyword, {
        sortBy: 'date_posted',
      });

      // Transform to unified format
      const posts: LinkedInPost[] = results
        .slice(0, input.maxResults || 50)
        .map((post, index) => {
          const postId = post.id || post.urn || `linkedin-${index}-${Date.now()}`;
          const postUrl = post.url || '';
          const postText = post.text || post.content || post.snippet || '';
          const authorName = post.authorName || post.author || 'Unknown';
          const authorUrl = post.authorUrl || post.authorProfileUrl || '';
          const postedAt = post.postedAt || post.datePosted || post.postedDate || post.date || new Date().toISOString();

          return {
            id: postId,
            platform: 'linkedin' as const,
            url: postUrl,
            text: postText,
            authorName,
            authorHandle: extractHandleFromUrl(authorUrl),
            authorUrl,
            authorFollowers: post.authorFollowers || 0,
            authorHeadline: post.authorHeadline,
            engagement: {
              likes: post.likes || post.numLikes || post.reactions || 0,
              comments: post.comments || post.numComments || 0,
              shares: post.shares || post.numShares || 0,
            },
            hashtags: post.hashtags || extractHashtags(postText),
            postedAt,
          };
        });

      return {
        success: true,
        output: {
          posts,
          totalFound: posts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to monitor LinkedIn',
      };
    }
  },
});
