import { z } from 'zod';
import { defineNode } from '@jam-nodes/core';

/**
 * Condition types for conditional branching
 */
export const ConditionTypeSchema = z.enum([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
  'exists',
]);

export type ConditionType = z.infer<typeof ConditionTypeSchema>;

/**
 * Condition configuration
 */
export const ConditionSchema = z.object({
  type: ConditionTypeSchema,
  variableName: z.string(),
  value: z.unknown().optional(),
});

export type Condition = z.infer<typeof ConditionSchema>;

/**
 * Input schema for conditional node
 */
export const ConditionalInputSchema = z.object({
  condition: ConditionSchema,
  trueNodeId: z.string(),
  falseNodeId: z.string(),
});

export type ConditionalInput = z.infer<typeof ConditionalInputSchema>;

/**
 * Output schema for conditional node
 */
export const ConditionalOutputSchema = z.object({
  conditionMet: z.boolean(),
  selectedBranch: z.enum(['true', 'false']),
});

export type ConditionalOutput = z.infer<typeof ConditionalOutputSchema>;

/**
 * Evaluate a condition against a value
 */
function evaluateCondition(
  type: ConditionType,
  actualValue: unknown,
  expectedValue: unknown
): boolean {
  switch (type) {
    case 'equals':
      return actualValue === expectedValue;

    case 'not_equals':
      return actualValue !== expectedValue;

    case 'greater_than':
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue > expectedValue;
      }
      return false;

    case 'less_than':
      if (typeof actualValue === 'number' && typeof expectedValue === 'number') {
        return actualValue < expectedValue;
      }
      return false;

    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.includes(expectedValue);
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return false;

    case 'exists':
      return actualValue !== null && actualValue !== undefined;

    default:
      return false;
  }
}

/**
 * Conditional branching node.
 *
 * Directs workflow flow based on variable values. Supports:
 * - equals/not_equals: Simple equality checks
 * - greater_than/less_than: Numeric comparisons
 * - contains: String/array membership checks
 * - exists: Null/undefined checks
 *
 * @example
 * ```typescript
 * // Branch based on contact count
 * {
 *   condition: {
 *     type: 'greater_than',
 *     variableName: 'contacts.length',
 *     value: 0
 *   },
 *   trueNodeId: 'send-emails',
 *   falseNodeId: 'no-contacts-found'
 * }
 * ```
 */
export const conditionalNode = defineNode({
  type: 'conditional',
  name: 'Conditional',
  description: 'Branch workflow based on a condition',
  category: 'logic',
  inputSchema: ConditionalInputSchema,
  outputSchema: ConditionalOutputSchema,
  estimatedDuration: 0,
  capabilities: {
    supportsRerun: true,
  },
  executor: async (input, context) => {
    try {
      // Use resolveNestedPath to support dot notation like "contacts.length"
      const variableValue = context.resolveNestedPath(input.condition.variableName);

      // Evaluate the condition
      const conditionMet = evaluateCondition(
        input.condition.type,
        variableValue,
        input.condition.value
      );

      const selectedBranch = conditionMet ? 'true' : 'false';
      const nextNodeId = conditionMet ? input.trueNodeId : input.falseNodeId;

      return {
        success: true,
        output: {
          conditionMet,
          selectedBranch,
        },
        nextNodeId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate condition',
      };
    }
  },
});
