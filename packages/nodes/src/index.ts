// Logic nodes
export {
  conditionalNode,
  endNode,
  delayNode,
  ConditionalInputSchema,
  ConditionalOutputSchema,
  ConditionSchema,
  ConditionTypeSchema,
  EndInputSchema,
  EndOutputSchema,
  DelayInputSchema,
  DelayOutputSchema,
} from './logic/index.js';

export type {
  ConditionalInput,
  ConditionalOutput,
  Condition,
  ConditionType,
  EndInput,
  EndOutput,
  DelayInput,
  DelayOutput,
} from './logic/index.js';

// Transform nodes
export {
  mapNode,
  filterNode,
  MapInputSchema,
  MapOutputSchema,
  FilterInputSchema,
  FilterOutputSchema,
  FilterOperatorSchema,
} from './transform/index.js';

export type {
  MapInput,
  MapOutput,
  FilterInput,
  FilterOutput,
  FilterOperator,
} from './transform/index.js';

// Example nodes
export {
  httpRequestNode,
  HttpRequestInputSchema,
  HttpRequestOutputSchema,
  HttpMethodSchema,
} from './examples/index.js';

export type {
  HttpRequestInput,
  HttpRequestOutput,
  HttpMethod,
} from './examples/index.js';

// All nodes as a collection
import { conditionalNode } from './logic/index.js';
import { endNode } from './logic/index.js';
import { delayNode } from './logic/index.js';
import { mapNode } from './transform/index.js';
import { filterNode } from './transform/index.js';
import { httpRequestNode } from './examples/index.js';

/**
 * All built-in nodes as an array for easy registration
 */
export const builtInNodes = [
  conditionalNode,
  endNode,
  delayNode,
  mapNode,
  filterNode,
  httpRequestNode,
];
