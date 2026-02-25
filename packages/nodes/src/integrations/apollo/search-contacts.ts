import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';
import { fetchWithRetry, sleep } from '../../utils/http.js';

// =============================================================================
// Constants
// =============================================================================

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';

// =============================================================================
// Apollo API Types
// =============================================================================

interface ApolloPerson {
  id: string;
  first_name: string;
  last_name?: string;
  last_name_obfuscated?: string;
  name?: string;
  email?: string | null;
  has_email?: boolean;
  title: string;
  linkedin_url?: string | null;
  organization_name?: string;
  organization?: {
    id?: string;
    name: string;
    website_url?: string | null;
    linkedin_url?: string | null;
    industry?: string | null;
    estimated_num_employees?: number | null;
  };
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

interface ApolloSearchResponse {
  people?: ApolloPerson[];
  total_entries?: number;
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface ApolloEnrichResponse {
  person?: ApolloPerson | null;
}

// =============================================================================
// Schemas
// =============================================================================

export const SearchContactsInputSchema = z.object({
  /** Job titles to search for */
  personTitles: z.array(z.string()).optional(),
  /** Person locations (cities/countries) */
  personLocations: z.array(z.string()).optional(),
  /** Organization locations */
  organizationLocations: z.array(z.string()).optional(),
  /** Company employee count ranges (e.g., "1-10", "11-50") */
  employeeRanges: z.array(z.string()).optional(),
  /** Keywords for search */
  keywords: z.string().optional(),
  /** Maximum number of contacts to return */
  limit: z.number().optional().default(10),
  /** Include similar job titles */
  includeSimilarTitles: z.boolean().optional(),
  /** Seniority levels (e.g., "vp", "director", "manager") */
  personSeniorities: z.array(z.string()).optional(),
  /** Technologies used by the company */
  technologies: z.array(z.string()).optional(),
  /** Industry tag IDs */
  industryTagIds: z.array(z.string()).optional(),
  /** Departments (e.g., "engineering", "sales") */
  departments: z.array(z.string()).optional(),
});

export type SearchContactsInput = z.infer<typeof SearchContactsInputSchema>;

export const SearchContactsOutputSchema = z.object({
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string(),
    title: z.string().optional(),
    company: z.string(),
    linkedinUrl: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
  })),
  totalFound: z.number(),
});

export type SearchContactsOutput = z.infer<typeof SearchContactsOutputSchema>;

// =============================================================================
// Apollo API Functions
// =============================================================================

/**
 * Search Apollo for contacts matching criteria
 */
async function searchApolloContacts(
  apiKey: string,
  params: {
    personTitles?: string[];
    personLocations?: string[];
    organizationLocations?: string[];
    employeeRanges?: string[];
    keywords?: string;
    limit?: number;
    includeSimilarTitles?: boolean;
    personSeniorities?: string[];
    technologies?: string[];
    industryTagIds?: string[];
    departments?: string[];
  }
): Promise<ApolloPerson[]> {
  const defaultLocation = params.personLocations && params.personLocations.length > 0
    ? params.personLocations
    : ['United States'];

  const requestBody: Record<string, unknown> = {
    ...(params.personTitles && params.personTitles.length > 0 && {
      person_titles: params.personTitles
    }),
    person_locations: defaultLocation,
    include_similar_titles: params.includeSimilarTitles ?? true,
    page: 1,
    per_page: Math.min(params.limit || 100, 100),
    ...(params.keywords && { q_keywords: params.keywords }),
    ...(params.personSeniorities && params.personSeniorities.length > 0 && {
      person_seniorities: params.personSeniorities
    }),
    ...(params.organizationLocations && params.organizationLocations.length > 0 && {
      organization_locations: params.organizationLocations
    }),
    ...(params.employeeRanges && params.employeeRanges.length > 0 && {
      organization_num_employees_ranges: params.employeeRanges
    }),
    ...(params.technologies && params.technologies.length > 0 && {
      currently_using_any_of_technology_uids: params.technologies
    }),
    ...(params.industryTagIds && params.industryTagIds.length > 0 && {
      organization_industry_tag_ids: params.industryTagIds
    }),
    ...(params.departments && params.departments.length > 0 && {
      person_departments: params.departments
    }),
  };

  const response = await fetchWithRetry(
    `${APOLLO_API_BASE}/mixed_people/api_search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
  }

  const data: ApolloSearchResponse = await response.json();
  const allPeople = data.people || [];

  // Filter to contacts with has_email flag (email must be revealed via enrichment)
  return allPeople.filter((person) => person.has_email === true);
}

/**
 * Enrich a contact to reveal their email address
 */
async function enrichApolloContact(
  apiKey: string,
  personId: string
): Promise<ApolloPerson | null> {
  const response = await fetchWithRetry(
    `${APOLLO_API_BASE}/people/match`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        id: personId,
        reveal_personal_emails: true,
      }),
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 30000 }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo enrich error: ${response.status} - ${errorText}`);
  }

  const data: ApolloEnrichResponse = await response.json();
  return data.person || null;
}

// =============================================================================
// Node Definition
// =============================================================================

/**
 * Search Contacts Node
 *
 * Searches for contacts using Apollo.io API with email enrichment.
 * Requires `context.credentials.apollo.apiKey` to be provided.
 *
 * Process:
 * 1. Search Apollo for contacts matching criteria
 * 2. Enrich contacts to reveal email addresses
 * 3. Return contacts with verified emails
 *
 * @example
 * ```typescript
 * const result = await searchContactsNode.executor({
 *   personTitles: ['CTO', 'VP Engineering'],
 *   personLocations: ['San Francisco'],
 *   limit: 25
 * }, context);
 * ```
 */
export const searchContactsNode = defineNode({
  type: 'search_contacts',
  name: 'Search Contacts',
  description: 'Search for contacts using Apollo.io People Search API',
  category: 'integration',
  inputSchema: SearchContactsInputSchema,
  outputSchema: SearchContactsOutputSchema,
  estimatedDuration: 5,
  capabilities: {
    supportsEnrichment: true,
    supportsBulkActions: true,
    supportsRerun: true,
  },

  executor: async (input, context) => {
    try {
      // Check for API key
      const apiKey = context.credentials?.apollo?.apiKey;
      if (!apiKey) {
        return {
          success: false,
          error: 'Apollo API key not configured. Please provide context.credentials.apollo.apiKey.',
        };
      }

      // Search contacts
      const results = await searchApolloContacts(apiKey, {
        personTitles: input.personTitles,
        personLocations: input.personLocations,
        organizationLocations: input.organizationLocations,
        employeeRanges: input.employeeRanges,
        keywords: input.keywords,
        limit: Math.min(input.limit || 10, 100),
        includeSimilarTitles: input.includeSimilarTitles,
        personSeniorities: input.personSeniorities,
        technologies: input.technologies,
        industryTagIds: input.industryTagIds,
        departments: input.departments,
      });

      if (results.length === 0) {
        return {
          success: true,
          output: {
            contacts: [],
            totalFound: 0,
          },
        };
      }

      // Enrich contacts to get emails
      const enrichedContacts: Array<{
        id: string;
        name: string;
        firstName?: string;
        lastName?: string;
        email: string;
        title?: string;
        company: string;
        linkedinUrl?: string | null;
        location?: string | null;
      }> = [];

      for (const contact of results) {
        if (contact.id) {
          try {
            const enriched = await enrichApolloContact(apiKey, contact.id);
            if (enriched?.email) {
              const lastName = enriched.last_name || enriched.last_name_obfuscated || '';
              const fullName = enriched.name || `${enriched.first_name || ''} ${lastName}`.trim() || 'Unknown';
              const company = enriched.organization_name || enriched.organization?.name || 'Unknown';

              enrichedContacts.push({
                id: enriched.id,
                name: fullName,
                firstName: enriched.first_name,
                lastName: lastName || undefined,
                email: enriched.email,
                title: enriched.title,
                company,
                linkedinUrl: enriched.linkedin_url,
                location: [enriched.city, enriched.state, enriched.country]
                  .filter(Boolean)
                  .join(', ') || null,
              });
            }
            // Small delay to avoid rate limiting
            await sleep(200);
          } catch {
            // Skip contacts that fail to enrich
          }
        }
      }

      return {
        success: true,
        output: {
          contacts: enrichedContacts,
          totalFound: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search contacts',
      };
    }
  },
});
