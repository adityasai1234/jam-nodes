import type { z } from 'zod';

/**
 * Types of authentication supported by credentials.
 */
export type CredentialType =
  | 'apiKey'
  | 'oauth2'
  | 'oauth2_pkce'
  | 'bearer'
  | 'basic'
  | 'webhook'
  | 'custom';

/**
 * How credentials are applied to requests.
 */
export type AuthenticateType = 'header' | 'query' | 'body';

/**
 * Authentication configuration - how credentials are applied to requests.
 */
export interface CredentialAuthenticate {
  /** Where to apply the credentials */
  type: AuthenticateType;
  /** Properties to add (supports {{variable}} interpolation) */
  properties: Record<string, string>;
}

/**
 * OAuth2 configuration for oauth2/oauth2_pkce credential types.
 */
export interface OAuth2Config {
  /** URL to redirect user for authorization */
  authorizationUrl: string;
  /** URL to exchange code for tokens */
  tokenUrl: string;
  /** Required OAuth scopes */
  scopes: string[];
  /** Use PKCE flow (required for some APIs like Twitter) */
  pkce?: boolean;
  /** Additional authorization parameters */
  authQueryParameters?: Record<string, string>;
  /** How to send credentials to token endpoint */
  tokenRequestMethod?: 'body' | 'header';
}

/**
 * Base credential definition that all credential types share.
 */
export interface BaseCredentialDefinition {
  /** Unique credential identifier (e.g., 'hunter', 'hubspot') */
  name: string;
  /** Human-readable name for UI */
  displayName: string;
  /** Link to API documentation */
  documentationUrl?: string;
  /** Zod schema for credential fields */
  schema: z.ZodSchema;
  /** Test endpoint to verify credentials work */
  testRequest?: {
    url: string;
    method?: 'GET' | 'POST';
  };
}

/**
 * API Key credential - simple key-based authentication.
 */
export interface ApiKeyCredentialDefinition extends BaseCredentialDefinition {
  type: 'apiKey';
  /** How to apply the API key to requests */
  authenticate: CredentialAuthenticate;
}

/**
 * OAuth2 credential - full OAuth2 authorization code flow.
 */
export interface OAuth2CredentialDefinition extends BaseCredentialDefinition {
  type: 'oauth2' | 'oauth2_pkce';
  /** OAuth2 configuration */
  config: OAuth2Config;
}

/**
 * Bearer token credential - simple bearer token in header.
 */
export interface BearerCredentialDefinition extends BaseCredentialDefinition {
  type: 'bearer';
  /** How to apply the bearer token (usually header with Authorization: Bearer) */
  authenticate: CredentialAuthenticate;
}

/**
 * Basic auth credential - username/password.
 */
export interface BasicCredentialDefinition extends BaseCredentialDefinition {
  type: 'basic';
  /** How to apply basic auth (usually header with Authorization: Basic base64) */
  authenticate: CredentialAuthenticate;
}

/**
 * Webhook credential - just a webhook URL.
 */
export interface WebhookCredentialDefinition extends BaseCredentialDefinition {
  type: 'webhook';
}

/**
 * Custom credential - for non-standard auth patterns.
 */
export interface CustomCredentialDefinition extends BaseCredentialDefinition {
  type: 'custom';
  /** Custom authentication logic description */
  authenticate?: CredentialAuthenticate;
}

/**
 * Union type of all credential definitions.
 */
export type CredentialDefinition =
  | ApiKeyCredentialDefinition
  | OAuth2CredentialDefinition
  | BearerCredentialDefinition
  | BasicCredentialDefinition
  | WebhookCredentialDefinition
  | CustomCredentialDefinition;

/**
 * Credential data after being resolved/decrypted.
 * Shape depends on the credential's schema.
 */
export type ResolvedCredentials = Record<string, unknown>;

/**
 * Interface for credential storage/retrieval.
 * Implemented by the consuming application (e.g., Jam/Minions).
 */
export interface CredentialProvider {
  /**
   * Get credentials by name.
   * @param name - Credential name (e.g., 'hunter', 'hubspot')
   * @returns Resolved credential data or null if not found
   */
  getCredentials(name: string): Promise<ResolvedCredentials | null>;

  /**
   * Check if credentials exist.
   * @param name - Credential name
   * @returns True if credentials are configured
   */
  hasCredentials(name: string): Promise<boolean>;

  /**
   * Refresh OAuth2 tokens if expired.
   * @param name - Credential name
   * @returns Updated credentials or null if refresh failed
   */
  refreshIfNeeded?(name: string): Promise<ResolvedCredentials | null>;
}

/**
 * Registry for credential definitions.
 */
export interface CredentialRegistry {
  /** Register a credential definition */
  register(credential: CredentialDefinition): void;
  /** Get a credential definition by name */
  get(name: string): CredentialDefinition | undefined;
  /** Get all registered credential definitions */
  getAll(): CredentialDefinition[];
  /** Check if a credential is registered */
  has(name: string): boolean;
}

/**
 * Helper to create an API key credential definition.
 */
export function defineApiKeyCredential(
  config: Omit<ApiKeyCredentialDefinition, 'type'>
): ApiKeyCredentialDefinition {
  return { ...config, type: 'apiKey' };
}

/**
 * Helper to create an OAuth2 credential definition.
 */
export function defineOAuth2Credential(
  config: Omit<OAuth2CredentialDefinition, 'type'> & { pkce?: boolean }
): OAuth2CredentialDefinition {
  return {
    ...config,
    type: config.pkce ? 'oauth2_pkce' : 'oauth2',
  };
}

/**
 * Helper to create a bearer token credential definition.
 */
export function defineBearerCredential(
  config: Omit<BearerCredentialDefinition, 'type'>
): BearerCredentialDefinition {
  return { ...config, type: 'bearer' };
}

/**
 * Helper to create a basic auth credential definition.
 */
export function defineBasicCredential(
  config: Omit<BasicCredentialDefinition, 'type'>
): BasicCredentialDefinition {
  return { ...config, type: 'basic' };
}
