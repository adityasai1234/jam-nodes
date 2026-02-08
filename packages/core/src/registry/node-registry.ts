import type {
  NodeDefinition,
  NodeMetadata,
  NodeExecutor,
  NodeCategory,
} from '../types/index.js';

/**
 * Registry for workflow nodes.
 * Manages node definitions and provides lookup utilities.
 *
 * @template TNodeType - String union of valid node types
 *
 * @example
 * ```typescript
 * const registry = new NodeRegistry<'conditional' | 'end' | 'custom'>();
 *
 * registry.register(conditionalNode);
 * registry.register(endNode);
 *
 * const executor = registry.getExecutor('conditional');
 * ```
 */
export class NodeRegistry<TNodeType extends string = string> {
  private definitions = new Map<TNodeType, NodeDefinition>();
  private metadata = new Map<TNodeType, NodeMetadata>();

  /**
   * Register a node definition
   * @throws Error if node type is already registered
   */
  register<TInput, TOutput>(
    definition: NodeDefinition<TInput, TOutput>
  ): this {
    const type = definition.type as TNodeType;

    if (this.definitions.has(type)) {
      throw new Error(`Node type "${type}" is already registered`);
    }

    // Cast to unknown first to satisfy TypeScript's strict variance checks
    this.definitions.set(type, definition as unknown as NodeDefinition);
    this.metadata.set(type, this.extractMetadata(definition as unknown as NodeDefinition));

    return this;
  }

  /**
   * Register multiple node definitions at once
   */
  registerAll(definitions: NodeDefinition[]): this {
    for (const definition of definitions) {
      this.register(definition);
    }
    return this;
  }

  /**
   * Unregister a node type
   */
  unregister(type: TNodeType): boolean {
    const hadDefinition = this.definitions.delete(type);
    this.metadata.delete(type);
    return hadDefinition;
  }

  /**
   * Check if a node type is registered
   */
  has(type: TNodeType): boolean {
    return this.definitions.has(type);
  }

  /**
   * Get node definition (includes executor)
   */
  getDefinition(type: TNodeType): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  /**
   * Get node metadata (client-safe, no executor)
   */
  getMetadata(type: TNodeType): NodeMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get node executor
   */
  getExecutor(type: TNodeType): NodeExecutor | undefined {
    return this.definitions.get(type)?.executor;
  }

  /**
   * Get all registered node types
   */
  getNodeTypes(): TNodeType[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Get all node definitions
   */
  getAllDefinitions(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get all metadata (for client-side rendering)
   */
  getAllMetadata(): NodeMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get definitions by category
   */
  getByCategory(category: NodeCategory): NodeDefinition[] {
    return this.getAllDefinitions().filter((def) => def.category === category);
  }

  /**
   * Get metadata by category
   */
  getMetadataByCategory(category: NodeCategory): NodeMetadata[] {
    return this.getAllMetadata().filter((meta) => meta.category === category);
  }

  /**
   * Validate input against node's input schema
   * @throws ZodError if validation fails
   */
  validateInput<TInput>(type: TNodeType, input: unknown): TInput {
    const definition = this.definitions.get(type);
    if (!definition) {
      throw new Error(`Unknown node type: ${type}`);
    }
    return definition.inputSchema.parse(input) as TInput;
  }

  /**
   * Validate output against node's output schema
   * @throws ZodError if validation fails
   */
  validateOutput<TOutput>(type: TNodeType, output: unknown): TOutput {
    const definition = this.definitions.get(type);
    if (!definition) {
      throw new Error(`Unknown node type: ${type}`);
    }
    return definition.outputSchema.parse(output) as TOutput;
  }

  /**
   * Get count of registered nodes
   */
  get size(): number {
    return this.definitions.size;
  }

  /**
   * Extract client-safe metadata from definition
   */
  private extractMetadata(definition: NodeDefinition): NodeMetadata {
    return {
      type: definition.type,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      estimatedDuration: definition.estimatedDuration,
      capabilities: definition.capabilities,
    };
  }
}

/**
 * Create a new node registry
 */
export function createRegistry<
  TNodeType extends string = string,
>(): NodeRegistry<TNodeType> {
  return new NodeRegistry<TNodeType>();
}
