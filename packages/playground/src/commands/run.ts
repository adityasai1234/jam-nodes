import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createRegistry, type NodeExecutionContext } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import {
  getCredentials,
  saveCredentials,
  getCredentialSource,
} from '../credentials/index.js';
import {
  promptForNodeInput,
  promptForCredentials,
  promptSaveCredentials,
  selectNode,
} from '../ui/index.js';
import { generateMockOutput } from '../utils/index.js';

// Create and populate the registry
const registry = createRegistry();
for (const node of builtInNodes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.register(node as any);
}

/**
 * Service names required by each node type
 */
const NODE_SERVICE_REQUIREMENTS: Record<string, string[]> = {
  search_contacts: ['apollo'],
  reddit_monitor: ['forumScout'],
  twitter_monitor: ['twitter'],
  linkedin_monitor: ['forumScout'],
  sora_video: ['openai'],
  seo_keyword_research: ['dataForSeo'],
  seo_audit: ['dataForSeo'],
  social_keyword_generator: ['anthropic'],
  draft_emails: ['anthropic'],
  social_ai_analyze: ['anthropic'],
};

/**
 * Run command - executes a node with input
 */
export const runCommand = new Command('run')
  .description('Run a jam-node interactively')
  .argument('[node-type]', 'Node type to run (interactive selection if omitted)')
  .option('-i, --input <json>', 'Input as JSON string')
  .option('-m, --mock', 'Use mock mode (returns sample data without calling APIs)')
  .option('--no-confirm', 'Skip confirmation prompt')
  .action(async (nodeType: string | undefined, options) => {
    try {
      // If no node type specified, show selection
      if (!nodeType) {
        const nodes = registry.getAllMetadata();
        nodeType = await selectNode(nodes);
      }

      // Get node definition
      const definition = registry.getDefinition(nodeType);
      if (!definition) {
        console.error(chalk.red(`Unknown node type: ${nodeType}`));
        console.log(chalk.dim('Use "jam list" to see available nodes'));
        process.exit(1);
      }

      // Display node info
      console.log();
      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────────┐'));
      console.log(chalk.bold.cyan('│  ') + chalk.bold(definition.name).padEnd(57) + chalk.bold.cyan('│'));
      console.log(chalk.bold.cyan('│  ') + chalk.dim(definition.description.slice(0, 55)).padEnd(57) + chalk.bold.cyan('│'));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────────┘'));

      // Mock mode notice
      if (options.mock) {
        console.log();
        console.log(chalk.yellow('⚡ Mock mode enabled - returning sample data without API calls'));
      }

      // Check for required services/credentials
      const requiredServices = NODE_SERVICE_REQUIREMENTS[nodeType] || [];
      const credentials: Record<string, Record<string, string>> = {};

      if (requiredServices.length > 0 && !options.mock) {
        console.log();
        console.log(chalk.dim(`This node requires: ${requiredServices.join(', ')}`));

        for (const service of requiredServices) {
          const source = await getCredentialSource(service);

          if (source) {
            console.log(chalk.green(`✓ ${service} credentials found (${source})`));
            const creds = await getCredentials(service);
            if (creds) {
              credentials[service] = creds;
            }
          } else {
            console.log(chalk.yellow(`⚠ ${service} credentials not found`));

            // Prompt for credentials
            const creds = await promptForCredentials(service, [
              { name: 'apiKey', message: `${service} API Key:`, type: 'password' },
            ]);

            credentials[service] = creds;

            // Ask if they want to save
            const shouldSave = await promptSaveCredentials();
            if (shouldSave) {
              saveCredentials(service, creds);
              console.log(chalk.green(`✓ ${service} credentials saved`));
            }
          }
        }
      }

      // Get input
      let input: Record<string, unknown>;

      if (options.input) {
        try {
          input = JSON.parse(options.input);
        } catch {
          console.error(chalk.red('Invalid JSON input'));
          process.exit(1);
        }
      } else {
        // Interactive input
        input = await promptForNodeInput(definition.inputSchema);
      }

      // Display input summary
      console.log();
      console.log(chalk.dim('Input:'));
      console.log(chalk.dim(JSON.stringify(input, null, 2)));

      // Execute node
      const spinner = ora({
        text: `Executing ${definition.name}...`,
        color: 'cyan',
      }).start();

      try {
        let result;

        if (options.mock) {
          // Mock mode - generate sample output
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
          result = {
            success: true,
            output: generateMockOutput(nodeType, definition.outputSchema),
          };
        } else {
          // Create execution context
          const context: NodeExecutionContext = {
            userId: 'playground',
            workflowExecutionId: `playground_${Date.now()}`,
            variables: {},
            resolveNestedPath: (path: string) => {
              // Simple implementation - look in variables
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
            services: createMockServices(credentials),
          };

          // Validate input
          const validatedInput = definition.inputSchema.parse(input);

          // Execute
          result = await definition.executor(validatedInput, context);
        }

        spinner.stop();

        // Display result
        console.log();
        if (result.success) {
          console.log(chalk.green.bold('✓ Success!'));
          console.log();
          console.log(chalk.dim('Output:'));
          console.log(formatJson(result.output));
        } else {
          console.log(chalk.red.bold('✗ Failed'));
          console.log(chalk.red(result.error || 'Unknown error'));
        }
      } catch (error) {
        spinner.stop();
        console.log();
        console.log(chalk.red.bold('✗ Execution failed'));
        console.log(chalk.red(error instanceof Error ? error.message : 'Unknown error'));

        if (error instanceof Error && error.stack) {
          console.log(chalk.dim(error.stack));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Format JSON with syntax highlighting
 */
function formatJson(data: unknown): string {
  const json = JSON.stringify(data, null, 2);
  return json
    .replace(/"([^"]+)":/g, chalk.cyan('"$1":'))
    .replace(/: "([^"]+)"/g, ': ' + chalk.green('"$1"'))
    .replace(/: (\d+)/g, ': ' + chalk.yellow('$1'))
    .replace(/: (true|false)/g, ': ' + chalk.magenta('$1'))
    .replace(/: (null)/g, ': ' + chalk.dim('$1'));
}

/**
 * Create mock service implementations that use credentials
 */
function createMockServices(
  credentials: Record<string, Record<string, string>>
): Record<string, unknown> {
  // These are placeholder services that would need real implementations
  // For playground purposes, they demonstrate the service injection pattern
  return {
    apollo: credentials['apollo']
      ? {
          searchContacts: async () => {
            console.log(chalk.dim('Apollo API call would happen here...'));
            return [];
          },
          enrichContact: async () => {
            return null;
          },
        }
      : undefined,
    forumScout: credentials['forumScout']
      ? {
          searchReddit: async () => [],
          searchLinkedIn: async () => [],
        }
      : undefined,
    twitter: credentials['twitter']
      ? {
          search: async () => [],
        }
      : undefined,
    openai: credentials['openai']
      ? {
          generateVideo: async () => ({ url: 'mock_url' }),
        }
      : undefined,
    anthropic: credentials['anthropic']
      ? {
          complete: async () => 'mock response',
          generateKeywords: async () => ['keyword1', 'keyword2'],
        }
      : undefined,
    dataForSeo: credentials['dataForSeo']
      ? {
          getKeywords: async () => [],
          runAudit: async () => ({ issues: [] }),
        }
      : undefined,
  };
}
