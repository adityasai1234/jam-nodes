import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry, sleep } from '../utils/http.js';
import {
  DraftEmailsInputSchema,
  DraftEmailsOutputSchema,
  type DraftEmailsOutput,
  type DraftEmailInfo,
} from '../schemas/ai.js';
import {
  buildEmailPrompt,
  buildSubjectPrompt,
  cleanEmailBody,
  cleanSubjectLine,
} from '../prompts/draft-emails.js';

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
  const { model = 'claude-sonnet-4-20250514', maxTokens = 1000 } = options;

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
  DraftEmailsInputSchema,
  DraftEmailsOutputSchema,
  DraftEmailInfoSchema,
  ContactSchema,
  type DraftEmailsInput,
  type DraftEmailsOutput,
  type DraftEmailInfo,
  type Contact,
} from '../schemas/ai.js';

/**
 * Draft Emails Node
 *
 * Uses Claude to generate personalized email drafts for each contact.
 * Requires `context.credentials.anthropic.apiKey` to be provided.
 *
 * Note: This node generates email content but does NOT store drafts.
 * Storage is the responsibility of the host application.
 *
 * @example
 * ```typescript
 * const result = await draftEmailsNode.executor({
 *   contacts: [{ id: '1', name: 'John', email: 'john@acme.com', title: 'CTO', company: 'Acme' }],
 *   productDescription: 'AI-powered SEO tool'
 * }, context);
 * ```
 */
export const draftEmailsNode = defineNode({
  type: 'draft_emails',
  name: 'Draft Emails',
  description: 'Generate personalized email drafts for contacts using AI',
  category: 'action',
  inputSchema: DraftEmailsInputSchema,
  outputSchema: DraftEmailsOutputSchema,
  estimatedDuration: 30,
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

      // Get sender name from workflow variables
      const senderName = context.variables['senderName'] as string | undefined;
      if (!senderName) {
        return {
          success: false,
          error: 'Please set senderName in context.variables before creating email campaigns.',
        };
      }

      const emails: DraftEmailInfo[] = [];

      // Generate drafts for each contact
      for (const contact of input.contacts) {
        if (!contact.email) {
          continue;
        }

        try {
          // Generate personalized email body using prompt helper
          const emailPrompt = buildEmailPrompt(
            contact,
            input.productDescription,
            senderName,
            input.emailTemplate
          );

          const rawBody = await generateText(apiKey, emailPrompt, {
            model: 'claude-sonnet-4-20250514',
            maxTokens: 250,
          });

          // Clean up the email body
          const emailBody = cleanEmailBody(rawBody);

          // Generate subject line
          const subjectPrompt = buildSubjectPrompt(contact, emailBody);
          const rawSubject = await generateText(apiKey, subjectPrompt, {
            model: 'claude-sonnet-4-20250514',
            maxTokens: 50,
          });

          // Clean up subject
          const emailSubject = cleanSubjectLine(rawSubject);

          emails.push({
            id: `draft-${contact.id}-${Date.now()}`,
            toEmail: contact.email,
            toName: contact.name,
            toCompany: contact.company || '',
            toTitle: contact.title || '',
            subject: emailSubject,
            body: emailBody,
            status: 'draft',
          });

          // Small delay between API calls to avoid rate limiting
          await sleep(200);
        } catch {
          // Continue with other contacts even if one fails
        }
      }

      const output: DraftEmailsOutput = {
        emails,
        draftedCount: emails.length,
      };

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to draft emails',
      };
    }
  },
});
