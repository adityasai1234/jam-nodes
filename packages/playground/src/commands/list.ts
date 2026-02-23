import { Command } from 'commander';
import chalk from 'chalk';
import { createRegistry, type NodeCategory } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';

// Create and populate the registry
const registry = createRegistry();
for (const node of builtInNodes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.register(node as any);
}

/**
 * Category colors for display
 */
const categoryColors: Record<NodeCategory, (text: string) => string> = {
  logic: chalk.blue,
  transform: chalk.green,
  integration: chalk.magenta,
  action: chalk.yellow,
};

/**
 * Category labels for display
 */
const categoryLabels: Record<NodeCategory, string> = {
  logic: 'Logic',
  transform: 'Transform',
  integration: 'Integration',
  action: 'Action',
};

/**
 * List command - displays all available nodes
 */
export const listCommand = new Command('list')
  .description('List all available jam-nodes')
  .option('-c, --category <category>', 'Filter by category (logic, transform, integration, action)')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const allDefinitions = registry.getAllDefinitions();

    // Filter by category if specified
    let definitions = allDefinitions;
    if (options.category) {
      const category = options.category.toLowerCase() as NodeCategory;
      definitions = allDefinitions.filter((d) => d.category === category);

      if (definitions.length === 0) {
        console.log(chalk.yellow(`No nodes found in category: ${options.category}`));
        console.log(chalk.dim(`Available categories: logic, transform, integration, action`));
        return;
      }
    }

    // JSON output
    if (options.json) {
      const output = definitions.map((d) => ({
        type: d.type,
        name: d.name,
        description: d.description,
        category: d.category,
        estimatedDuration: d.estimatedDuration,
        capabilities: d.capabilities,
      }));
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Group by category
    const byCategory = definitions.reduce(
      (acc, def) => {
        const cat = def.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(def);
        return acc;
      },
      {} as Record<NodeCategory, typeof definitions>
    );

    // Header
    console.log();
    console.log(chalk.bold('Available jam-nodes'));
    console.log(chalk.dim(`Total: ${definitions.length} nodes`));
    console.log();

    // Display by category
    const categories: NodeCategory[] = ['logic', 'transform', 'integration', 'action'];

    for (const category of categories) {
      const nodes = byCategory[category];
      if (!nodes || nodes.length === 0) continue;

      const colorFn = categoryColors[category];
      const label = categoryLabels[category];

      console.log(colorFn(`━━━ ${label} (${nodes.length}) ━━━`));
      console.log();

      for (const node of nodes) {
        console.log(`  ${chalk.bold(node.type)}`);
        console.log(`  ${chalk.dim(node.name)} - ${node.description}`);

        // Show capabilities if present
        const caps = node.capabilities;
        if (caps) {
          const capList: string[] = [];
          if (caps.supportsEnrichment) capList.push('enrichment');
          if (caps.supportsBulkActions) capList.push('bulk');
          if (caps.supportsRerun) capList.push('rerun');
          if (caps.supportsApproval) capList.push('approval');
          if (capList.length > 0) {
            console.log(`  ${chalk.dim('Capabilities:')} ${capList.join(', ')}`);
          }
        }

        console.log();
      }
    }

    // Usage hint
    console.log(chalk.dim('Run a node: jam-playground run <node-type>'));
    console.log(chalk.dim('Example: jam-playground run conditional'));
  });
