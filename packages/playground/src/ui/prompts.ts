import inquirer from 'inquirer';
import chalk from 'chalk';
import type { z } from 'zod';

type ZodDefWithTypeName = z.ZodTypeDef & {
  typeName?: string;
  shape?: () => Record<string, z.ZodTypeAny>;
  innerType?: z.ZodTypeAny;
  defaultValue?: () => unknown;
  values?: string[];
};

/**
 * Prompt user for credential input
 */
export async function promptForCredentials(
  serviceName: string,
  fields: Array<{ name: string; message: string; type?: 'input' | 'password' }>
): Promise<Record<string, string>> {
  console.log();
  console.log(chalk.yellow(`🔑 Enter credentials for ${serviceName}:`));
  console.log();

  const answers = await inquirer.prompt(
    fields.map((field) => ({
      type: field.type || 'password',
      name: field.name,
      message: field.message,
      mask: '*',
    }))
  );

  return answers;
}

/**
 * Prompt user for how to provide credentials
 */
export async function promptCredentialSource(
  serviceName: string
): Promise<'existing' | 'enter' | 'save'> {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: `This node requires ${serviceName} credentials. How would you like to provide them?`,
      choices: [
        { name: 'Use existing (from .env or saved)', value: 'existing' },
        { name: 'Enter now (one-time)', value: 'enter' },
        { name: 'Enter and save for later', value: 'save' },
      ],
    },
  ]);
  return choice;
}

/**
 * Prompt user to save credentials
 */
export async function promptSaveCredentials(): Promise<boolean> {
  const { save } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'save',
      message: 'Would you like to save these credentials for future use?',
      default: false,
    },
  ]);
  return save;
}

/**
 * Generate prompts from a Zod schema
 */
export function generatePromptsFromSchema(
  schema: z.ZodSchema,
  prefix = ''
): Array<{
  name: string;
  message: string;
  type: 'input' | 'number' | 'confirm' | 'list' | 'editor';
  default?: unknown;
  choices?: Array<{ name: string; value: unknown }>;
  required: boolean;
  validate?: (input: unknown) => boolean | string;
}> {
  const prompts: Array<{
    name: string;
    message: string;
    type: 'input' | 'number' | 'confirm' | 'list' | 'editor';
    default?: unknown;
    choices?: Array<{ name: string; value: unknown }>;
    required: boolean;
    validate?: (input: unknown) => boolean | string;
  }> = [];

  // Get the schema shape
  const def = schema._def as ZodDefWithTypeName;

  // Handle ZodObject
  if (def.typeName === 'ZodObject' && def.shape) {
    const shape = def.shape();
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const fieldDef = fieldSchema._def as ZodDefWithTypeName;
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Check if optional
      const isOptional =
        fieldDef.typeName === 'ZodOptional' || fieldDef.typeName === 'ZodDefault';
      let innerDef = fieldDef;
      let defaultValue: unknown = undefined;

      // Unwrap optional/default
      if (fieldDef.typeName === 'ZodOptional' && fieldDef.innerType) {
        innerDef = fieldDef.innerType._def as ZodDefWithTypeName;
      } else if (fieldDef.typeName === 'ZodDefault' && fieldDef.innerType && fieldDef.defaultValue) {
        innerDef = fieldDef.innerType._def as ZodDefWithTypeName;
        defaultValue = fieldDef.defaultValue();
      }

      // Determine prompt type based on Zod type
      let promptType: 'input' | 'number' | 'confirm' | 'list' | 'editor' = 'input';
      let choices: Array<{ name: string; value: unknown }> | undefined;

      if (innerDef.typeName === 'ZodNumber') {
        promptType = 'number';
      } else if (innerDef.typeName === 'ZodBoolean') {
        promptType = 'confirm';
      } else if (innerDef.typeName === 'ZodEnum' && innerDef.values) {
        promptType = 'list';
        choices = innerDef.values.map((v: string) => ({ name: v, value: v }));
      } else if (innerDef.typeName === 'ZodArray') {
        // For arrays, we'll use a comma-separated input
        promptType = 'input';
      } else if (innerDef.typeName === 'ZodObject') {
        // Nested objects use editor for JSON input
        promptType = 'editor';
      }

      // Get description from schema if available
      const description = fieldSchema.description || key;

      prompts.push({
        name: fullKey,
        message: `${description}${isOptional ? ' (optional)' : ' *'}`,
        type: promptType,
        default: defaultValue,
        choices,
        required: !isOptional,
      });
    }
  }

  return prompts;
}

/**
 * Prompt user for node input based on schema
 */
export async function promptForNodeInput(
  schema: z.ZodSchema,
  existingInput?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const prompts = generatePromptsFromSchema(schema);

  // Build inquirer questions
  const questions = prompts.map((p) => {
    const existingValue = existingInput?.[p.name];
    const defaultVal = existingValue !== undefined ? existingValue : p.default;

    const question: {
      type: string;
      name: string;
      message: string;
      default?: unknown;
      choices?: Array<{ name: string; value: unknown }>;
      filter?: (input: string) => unknown;
    } = {
      type: p.type,
      name: p.name,
      message: p.message,
      default: defaultVal,
    };

    if (p.choices) {
      question.choices = p.choices;
    }

    // For optional fields, allow empty input
    if (!p.required && p.type === 'input') {
      question.filter = (input: string) => (input === '' ? undefined : input);
    }

    // Handle array inputs (comma-separated)
    if (p.type === 'input' && p.message.toLowerCase().includes('array')) {
      question.filter = (input: string) => {
        if (!input || input.trim() === '') return undefined;
        return input.split(',').map((s: string) => s.trim());
      };
    }

    return question;
  });

  if (questions.length === 0) {
    return {};
  }

  console.log();
  console.log(chalk.dim('Enter node input:'));
  console.log();

  const answers = await inquirer.prompt(questions);

  // Clean up undefined values
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Confirm before running a node
 */
export async function confirmRun(nodeType: string): Promise<boolean> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Run ${nodeType}?`,
      default: true,
    },
  ]);
  return confirm;
}

/**
 * Select a node from a list
 */
export async function selectNode(
  nodes: Array<{ type: string; name: string; description: string }>
): Promise<string> {
  const { nodeType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'nodeType',
      message: 'Select a node to run:',
      choices: nodes.map((n) => ({
        name: `${n.name} (${n.type}) - ${n.description}`,
        value: n.type,
      })),
    },
  ]);
  return nodeType;
}
