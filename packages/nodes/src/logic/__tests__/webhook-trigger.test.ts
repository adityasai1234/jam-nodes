import { describe, it, expect } from 'vitest'
import {
  webhookTriggerNode,
  WebhookTriggerInputSchema,
  WebhookTriggerOutputSchema,
} from '../webhook-trigger.js'

/**
 * Creates a mock NodeExecutionContext with an optional webhookRequest injected.
 */
function makeContext(webhookRequest?: unknown) {
  const variables = { webhookRequest }
  return {
    userId: 'test-user',
    workflowExecutionId: 'test-run',
    variables,
    resolveNestedPath: (path: string) =>
      path.split('.').reduce((obj: unknown, key: string) => {
        if (obj && typeof obj === 'object') {
          return (obj as Record<string, unknown>)[key]
        }
        return undefined
      }, variables as unknown),
    credentials: {},
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - metadata', () => {
  it('should have type webhook_trigger', () => {
    expect(webhookTriggerNode.type).toBe('webhook_trigger')
  })

  it('should have category logic', () => {
    expect(webhookTriggerNode.category).toBe('logic')
  })

  it('should not support rerun', () => {
    expect(webhookTriggerNode.capabilities?.supportsRerun).toBe(false)
  })

  it('should not support cancel', () => {
    expect(webhookTriggerNode.capabilities?.supportsCancel).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Input schema validation
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - input schema validation', () => {
  it('should accept minimal valid input (path + method)', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'POST',
    })
    expect(result.success).toBe(true)
  })

  it('should reject a path that does not start with /', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: 'webhooks/test',
      method: 'POST',
    })
    expect(result.success).toBe(false)
  })

  it('should reject an empty path', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '',
      method: 'POST',
    })
    expect(result.success).toBe(false)
  })

  it('should reject an invalid method like DELETE', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'DELETE',
    })
    expect(result.success).toBe(false)
  })

  it('should accept optional responseCode between 100 and 599', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'GET',
      responseCode: 204,
    })
    expect(result.success).toBe(true)
  })

  it('should reject responseCode 99', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'GET',
      responseCode: 99,
    })
    expect(result.success).toBe(false)
  })

  it('should reject responseCode 600', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'GET',
      responseCode: 600,
    })
    expect(result.success).toBe(false)
  })

  it('should accept authentication type none with no credentials', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'POST',
      authentication: { type: 'none' },
    })
    expect(result.success).toBe(true)
  })

  it('should accept authentication type basic with credentials', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'POST',
      authentication: {
        type: 'basic',
        credentials: { username: 'admin', password: 'secret' },
      },
    })
    expect(result.success).toBe(true)
  })

  it('should accept authentication type header with credentials', () => {
    const result = WebhookTriggerInputSchema.safeParse({
      path: '/webhooks/test',
      method: 'POST',
      authentication: {
        type: 'header',
        credentials: { 'x-api-key': 'token123' },
      },
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Executor: no webhookRequest in context
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - executor: no webhookRequest in context', () => {
  it('should return success false with descriptive error when webhookRequest is missing', async () => {
    const context = makeContext(undefined)
    const result = await webhookTriggerNode.executor(
      { path: '/test', method: 'POST' },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('No webhook request data found')
    }
  })
})

// ---------------------------------------------------------------------------
// Executor: method mismatch
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - executor: method mismatch', () => {
  it('should return success false when incoming method does not match configured method', async () => {
    const context = makeContext({
      method: 'GET',
      headers: {},
      body: null,
      path: '/test',
      query: {},
    })
    const result = await webhookTriggerNode.executor(
      { path: '/test', method: 'POST' },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Method mismatch')
    }
  })
})

// ---------------------------------------------------------------------------
// Executor: auth type none
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - executor: auth type none', () => {
  const baseRequest = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { event: 'push' },
    path: '/webhooks/github',
    query: { ref: 'main' },
  }

  it('should return success true and authenticated true regardless of headers', async () => {
    const context = makeContext(baseRequest)
    const result = await webhookTriggerNode.executor(
      { path: '/webhooks/github', method: 'POST', authentication: { type: 'none' } },
      context as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.authenticated).toBe(true)
    }
  })

  it('should include body, headers, method, path, query, timestamp, authenticated in output', async () => {
    const context = makeContext(baseRequest)
    const result = await webhookTriggerNode.executor(
      { path: '/webhooks/github', method: 'POST' },
      context as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.body).toEqual({ event: 'push' })
      expect(result.output.headers).toEqual({ 'content-type': 'application/json' })
      expect(result.output.method).toBe('POST')
      expect(result.output.path).toBe('/webhooks/github')
      expect(result.output.query).toEqual({ ref: 'main' })
      expect(typeof result.output.timestamp).toBe('string')
      expect(result.output.authenticated).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Executor: auth type basic
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - executor: auth type basic', () => {
  const correctCreds = Buffer.from('admin:secret').toString('base64')

  function makeBasicRequest(authHeader?: string) {
    return {
      method: 'POST',
      headers: authHeader ? { authorization: authHeader } : {},
      body: { data: 1 },
      path: '/secure',
      query: {},
    }
  }

  it('should return success true when Authorization header has correct base64 credentials', async () => {
    const context = makeContext(makeBasicRequest(`Basic ${correctCreds}`))
    const result = await webhookTriggerNode.executor(
      {
        path: '/secure',
        method: 'POST',
        authentication: {
          type: 'basic',
          credentials: { username: 'admin', password: 'secret' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.authenticated).toBe(true)
    }
  })

  it('should return success false when credentials are wrong', async () => {
    const wrongCreds = Buffer.from('admin:wrong').toString('base64')
    const context = makeContext(makeBasicRequest(`Basic ${wrongCreds}`))
    const result = await webhookTriggerNode.executor(
      {
        path: '/secure',
        method: 'POST',
        authentication: {
          type: 'basic',
          credentials: { username: 'admin', password: 'secret' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Basic authentication failed')
    }
  })

  it('should return success false when Authorization header is missing', async () => {
    const context = makeContext(makeBasicRequest())
    const result = await webhookTriggerNode.executor(
      {
        path: '/secure',
        method: 'POST',
        authentication: {
          type: 'basic',
          credentials: { username: 'admin', password: 'secret' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Basic authentication failed')
    }
  })

  it('should return success false when Authorization header is not Basic type', async () => {
    const context = makeContext(makeBasicRequest('Bearer some-token'))
    const result = await webhookTriggerNode.executor(
      {
        path: '/secure',
        method: 'POST',
        authentication: {
          type: 'basic',
          credentials: { username: 'admin', password: 'secret' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Basic authentication failed')
    }
  })
})

// ---------------------------------------------------------------------------
// Executor: auth type header
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - executor: auth type header', () => {
  it('should return success true when all required headers are present and match', async () => {
    const context = makeContext({
      method: 'POST',
      headers: { 'x-api-key': 'secret123', 'content-type': 'application/json' },
      body: null,
      path: '/hook',
      query: {},
    })
    const result = await webhookTriggerNode.executor(
      {
        path: '/hook',
        method: 'POST',
        authentication: {
          type: 'header',
          credentials: { 'x-api-key': 'secret123' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.authenticated).toBe(true)
    }
  })

  it('should return success false when a required header is missing', async () => {
    const context = makeContext({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: null,
      path: '/hook',
      query: {},
    })
    const result = await webhookTriggerNode.executor(
      {
        path: '/hook',
        method: 'POST',
        authentication: {
          type: 'header',
          credentials: { 'x-api-key': 'secret123' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Header authentication failed')
    }
  })

  it('should return success false when a required header has the wrong value', async () => {
    const context = makeContext({
      method: 'POST',
      headers: { 'x-api-key': 'wrong-value' },
      body: null,
      path: '/hook',
      query: {},
    })
    const result = await webhookTriggerNode.executor(
      {
        path: '/hook',
        method: 'POST',
        authentication: {
          type: 'header',
          credentials: { 'x-api-key': 'secret123' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Header authentication failed')
    }
  })

  it('should match headers case-insensitively', async () => {
    // The executor lowercases the credential key when looking up in request headers.
    // The incoming request headers should already be lowercase (per convention).
    const context = makeContext({
      method: 'POST',
      headers: { 'x-custom-token': 'token-abc' },
      body: null,
      path: '/hook',
      query: {},
    })
    const result = await webhookTriggerNode.executor(
      {
        path: '/hook',
        method: 'POST',
        authentication: {
          type: 'header',
          // Credential key provided in mixed case — executor must lowercase it
          credentials: { 'X-Custom-Token': 'token-abc' },
        },
      },
      context as never,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output.authenticated).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

describe('webhookTriggerNode - output schema', () => {
  it('should validate a well-formed output successfully', () => {
    const result = WebhookTriggerOutputSchema.safeParse({
      body: { event: 'push' },
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      path: '/webhooks/github',
      query: {},
      timestamp: new Date().toISOString(),
      authenticated: true,
    })
    expect(result.success).toBe(true)
  })

  it('should reject output missing authenticated field', () => {
    const result = WebhookTriggerOutputSchema.safeParse({
      body: null,
      headers: {},
      method: 'POST',
      path: '/hook',
      query: {},
      timestamp: new Date().toISOString(),
      // authenticated is missing
    })
    expect(result.success).toBe(false)
  })
})
