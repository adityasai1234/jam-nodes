import { NextRequest, NextResponse } from 'next/server';
import { createRegistry, type NodeExecutionContext } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { getMockOutput } from '@/lib/utils';

// Create and populate the registry
const registry = createRegistry();
for (const node of builtInNodes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.register(node as any);
}

export async function POST(request: NextRequest) {
  try {
    const { nodeType, input, credentials, mockMode } = await request.json();

    // Get node definition
    const node = registry.getDefinition(nodeType);
    if (!node) {
      return NextResponse.json(
        { success: false, error: `Node not found: ${nodeType}` },
        { status: 404 }
      );
    }

    // Mock mode - return sample data
    if (mockMode) {
      const mockOutput = getMockOutput(nodeType, node.outputSchema);
      return NextResponse.json({
        success: true,
        output: mockOutput,
      });
    }

    // Validate input
    let validatedInput;
    try {
      validatedInput = node.inputSchema.parse(input);
    } catch (zodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid input: ${zodError instanceof Error ? zodError.message : 'Validation failed'}`,
        },
        { status: 400 }
      );
    }

    // Create execution context
    const context: NodeExecutionContext = {
      userId: 'playground',
      workflowExecutionId: `playground_${Date.now()}`,
      variables: {},
      resolveNestedPath: (path: string) => {
        const parts = path.split('.');
        let current: unknown = context.variables;
        for (const part of parts) {
          if (current && typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
          } else {
            return undefined;
          }
        }
        return current;
      },
      services: createServices(credentials || {}),
    };

    // Execute node
    const result = await node.executor(validatedInput, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Create service implementations from credentials
 * These are placeholder implementations for the playground
 */
function createServices(
  credentials: Record<string, Record<string, string>>
): Record<string, unknown> {
  return {
    apollo: credentials.apollo
      ? {
          searchContacts: async (params: Record<string, unknown>) => {
            // In a real implementation, this would call the Apollo API
            console.log('Apollo searchContacts called with:', params);
            return [];
          },
          enrichContact: async (id: string) => {
            console.log('Apollo enrichContact called with:', id);
            return null;
          },
        }
      : undefined,

    forumScout: credentials.forumscout
      ? {
          searchReddit: async () => [],
          searchLinkedIn: async () => [],
        }
      : undefined,

    twitter: credentials.twitter
      ? {
          search: async () => [],
        }
      : undefined,

    openai: credentials.openai
      ? {
          generateVideo: async () => ({ url: 'mock_url' }),
        }
      : undefined,

    anthropic: credentials.anthropic
      ? {
          complete: async (prompt: string) => {
            console.log('Anthropic complete called with:', prompt);
            return 'Mock response from Anthropic';
          },
        }
      : undefined,

    dataForSeo: credentials.dataforseo
      ? {
          getKeywords: async () => [],
          runAudit: async () => ({ issues: [] }),
        }
      : undefined,
  };
}
