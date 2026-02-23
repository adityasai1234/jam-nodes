'use client';

import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Play, Zap, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';

interface InputFormProps {
  schema: z.ZodSchema;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
  mockMode?: boolean;
  onMockToggle?: () => void;
  showMockToggle?: boolean;
}

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea' | 'array';
  required: boolean;
  default?: unknown;
  options?: string[];
  description?: string;
}

type ZodDefWithTypeName = z.ZodTypeDef & {
  typeName?: string;
  shape?: () => Record<string, z.ZodTypeAny>;
  innerType?: z.ZodTypeAny;
  defaultValue?: () => unknown;
  values?: string[];
};

// Generate example values based on field name and type - ALWAYS returns a value
function getExampleValue(fieldName: string, fieldType: string, options?: string[]): unknown {
  const name = fieldName.toLowerCase();

  // Select fields - always return first option
  if (fieldType === 'select' && options?.length) {
    return options[0];
  }

  // Checkbox fields
  if (fieldType === 'checkbox') {
    return true;
  }

  // Number fields
  if (fieldType === 'number') {
    if (name.includes('limit')) return 10;
    if (name.includes('page')) return 1;
    if (name.includes('count')) return 5;
    if (name.includes('delay') || name.includes('duration') || name.includes('timeout')) return 1000;
    if (name.includes('ms')) return 500;
    if (name.includes('max')) return 100;
    if (name.includes('min')) return 1;
    return 10;
  }

  // Array fields
  if (fieldType === 'array') {
    // For map/filter operations, items should be objects
    if (name === 'items') {
      return [
        { name: 'John Doe', email: 'john@example.com', status: 'active' },
        { name: 'Jane Smith', email: 'jane@example.com', status: 'pending' },
      ];
    }
    if (name.includes('title') || name.includes('person')) return ['Software Engineer', 'CTO', 'VP Engineering'];
    if (name.includes('location')) return ['San Francisco, CA', 'New York, NY'];
    if (name.includes('email')) return ['user@example.com', 'contact@company.com'];
    if (name.includes('keyword')) return ['technology', 'startup', 'SaaS'];
    if (name.includes('seniority') || name.includes('senior')) return ['director', 'vp', 'c_suite'];
    if (name.includes('department')) return ['engineering', 'product', 'sales'];
    if (name.includes('technolog')) return ['React', 'Node.js', 'Python'];
    if (name.includes('range') || name.includes('employee')) return ['11-50', '51-200', '201-500'];
    if (name.includes('industry')) return ['technology', 'software', 'saas'];
    if (name.includes('subreddit')) return ['technology', 'programming', 'startups'];
    if (name.includes('tag')) return ['tag1', 'tag2'];
    return ['example1', 'example2'];
  }

  // Object/textarea fields
  if (fieldType === 'textarea') {
    if (name === 'condition') {
      return { type: 'equals', variableName: 'status', value: 'active' };
    }
    if (name === 'headers') {
      return { 'Content-Type': 'application/json', 'Authorization': 'Bearer your-token-here' };
    }
    if (name === 'body' || name === 'requestbody') {
      return { message: 'Hello', data: { id: 1, name: 'test' } };
    }
    if (name.includes('filter')) {
      return { field: 'status', operator: 'equals', value: 'active' };
    }
    if (name.includes('config') || name.includes('options')) {
      return { enabled: true, setting: 'default' };
    }
    if (name.includes('data') || name.includes('payload')) {
      return { key: 'value', count: 10 };
    }
    if (name.includes('metadata')) {
      return { source: 'playground', timestamp: new Date().toISOString() };
    }
    return { example: 'value' };
  }

  // String fields - comprehensive matching
  // IDs and references
  if (name.includes('truenodeid') || name.includes('true_node')) return 'node_success_branch';
  if (name.includes('falsenodeid') || name.includes('false_node')) return 'node_failure_branch';
  if (name.includes('nextnodeid') || name.includes('next_node')) return 'node_next_step';
  if (name.includes('nodeid') || name.includes('node_id')) return 'node_123';
  if (name.includes('workflowid') || name.includes('workflow_id')) return 'workflow_abc';
  if (name.includes('campaignid') || name.includes('campaign_id')) return 'campaign_xyz';
  if (name.includes('contactid') || name.includes('contact_id')) return 'contact_456';
  if (name.includes('userid') || name.includes('user_id')) return 'user_789';
  if (name === 'id') return 'item_123';

  // Variable names
  if (name.includes('variablename') || name.includes('variable_name') || name === 'variable') return 'userStatus';

  // Personal info
  if (name === 'domain') return 'stripe.com';
  if (name === 'email' || name.includes('email')) return 'john.doe@example.com';
  if (name === 'url' || name.includes('url') || name.includes('link')) return 'https://example.com';
  if (name === 'name') return 'John Doe';
  if (name === 'firstname' || name.includes('first_name')) return 'John';
  if (name === 'lastname' || name.includes('last_name')) return 'Doe';
  if (name === 'company' || name.includes('organization')) return 'Acme Inc';
  if (name === 'title' || name.includes('jobtitle')) return 'Software Engineer';
  if (name.includes('phone')) return '+1-555-123-4567';
  if (name.includes('address')) return '123 Main St, San Francisco, CA';

  // Search and content
  if (name === 'query' || name === 'search' || name === 'keywords' || name.includes('keyword')) return 'technology startup SaaS';
  if (name === 'value') return 'example_value';
  if (name === 'message' || name === 'content' || name === 'body' || name === 'text') return 'Hello, this is a test message for the playground.';
  if (name === 'subject' || name.includes('subject')) return 'Test Subject Line';
  if (name === 'description') return 'A brief description of the item.';
  if (name === 'prompt') return 'Generate a creative response about technology trends.';
  if (name === 'reason') return 'Completed successfully';

  // Social media
  if (name.includes('subreddit')) return 'technology';
  if (name.includes('username') || name.includes('handle')) return 'johndoe';
  if (name.includes('hashtag')) return '#technology';

  // Technical
  if (name.includes('api') && name.includes('key')) return 'sk_test_xxx';
  if (name.includes('token')) return 'token_xxx';
  if (name.includes('secret')) return 'secret_xxx';
  // For transform nodes (map, filter), path is a property name
  if (name === 'path') return 'email';
  if (name.includes('filepath') || name.includes('file_path')) return '/path/to/file.txt';
  if (name.includes('path')) return '/api/v1/resource';
  if (name.includes('endpoint')) return 'https://api.example.com/v1';
  if (name.includes('header')) return 'Authorization';
  if (name.includes('method')) return 'GET';
  if (name.includes('format')) return 'json';
  if (name.includes('type')) return 'default';
  if (name.includes('status')) return 'active';
  if (name.includes('state')) return 'pending';
  if (name.includes('mode')) return 'production';
  if (name.includes('action')) return 'process';

  // Dates and times
  if (name.includes('date')) return new Date().toISOString().split('T')[0];
  if (name.includes('time')) return '12:00:00';

  // Generic fallback - use the field name as a hint
  const cleanName = fieldName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return `example_${cleanName.replace(/\s+/g, '_')}`;
}

function extractFieldsFromSchema(schema: z.ZodSchema): FieldConfig[] {
  const fields: FieldConfig[] = [];
  const def = schema._def as ZodDefWithTypeName;

  if (def.typeName !== 'ZodObject' || !def.shape) return fields;

  const shape = def.shape();

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const fieldDef = fieldSchema._def as ZodDefWithTypeName;
    let isRequired = true;
    let innerDef = fieldDef;
    let defaultValue: unknown = undefined;

    // Unwrap optional/default
    if (fieldDef.typeName === 'ZodOptional' && fieldDef.innerType) {
      isRequired = false;
      innerDef = fieldDef.innerType._def as ZodDefWithTypeName;
    } else if (fieldDef.typeName === 'ZodDefault' && fieldDef.innerType && fieldDef.defaultValue) {
      isRequired = false;
      innerDef = fieldDef.innerType._def as ZodDefWithTypeName;
      defaultValue = fieldDef.defaultValue();
    }

    // Determine field type
    let fieldType: FieldConfig['type'] = 'text';
    let options: string[] | undefined;

    if (innerDef.typeName === 'ZodNumber') {
      fieldType = 'number';
    } else if (innerDef.typeName === 'ZodBoolean') {
      fieldType = 'checkbox';
    } else if (innerDef.typeName === 'ZodEnum' && innerDef.values) {
      fieldType = 'select';
      options = innerDef.values;
    } else if (innerDef.typeName === 'ZodArray') {
      fieldType = 'array';
    } else if (innerDef.typeName === 'ZodObject' || innerDef.typeName === 'ZodRecord') {
      fieldType = 'textarea';
    }

    // Get description
    const description = fieldSchema.description;

    // ALWAYS generate an example value
    if (defaultValue === undefined) {
      defaultValue = getExampleValue(key, fieldType, options);
    }

    fields.push({
      name: key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      type: fieldType,
      required: isRequired,
      default: defaultValue,
      options,
      description,
    });
  }

  return fields;
}

// Generate a full example object from schema
function generateExampleFromSchema(schema: z.ZodSchema): Record<string, unknown> {
  const fields = extractFieldsFromSchema(schema);
  const example: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.default !== undefined) {
      example[field.name] = field.default;
    }
  }

  return example;
}

export function InputForm({
  schema,
  onSubmit,
  isLoading,
  mockMode,
  onMockToggle,
  showMockToggle = false,
}: InputFormProps) {
  const fields = useMemo(() => extractFieldsFromSchema(schema), [schema]);
  const [showExample, setShowExample] = useState(false);
  const exampleJson = useMemo(() => generateExampleFromSchema(schema), [schema]);

  // Create a resolver that transforms values before Zod validation
  const transformingResolver: Resolver = useCallback(async (values, context, options) => {
    // Transform values based on field types before validation
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find(f => f.name === key);

      if (field?.type === 'array' && typeof value === 'string') {
        // Try JSON parse first (for object arrays), then fall back to comma-separated
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
          try {
            transformed[key] = JSON.parse(trimmed);
          } catch {
            // Fall back to comma-separated
            const arr = value.split(',').map(s => s.trim()).filter(Boolean);
            transformed[key] = arr.length > 0 ? arr : undefined;
          }
        } else {
          // Comma-separated string
          const arr = value.split(',').map(s => s.trim()).filter(Boolean);
          transformed[key] = arr.length > 0 ? arr : undefined;
        }
      } else if (field?.type === 'textarea' && typeof value === 'string' && value.trim()) {
        // Parse JSON string to object
        try {
          transformed[key] = JSON.parse(value);
        } catch {
          transformed[key] = value;
        }
      } else if (value === '' || value === undefined || value === null) {
        // Skip empty values
      } else {
        transformed[key] = value;
      }
    }

    // Run Zod validation on transformed values
    const zodResolverFn = zodResolver(schema);
    return zodResolverFn(transformed, context, options);
  }, [schema, fields]);

  const defaultValues = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        if (field.default !== undefined) {
          // For arrays, check if items are objects or primitives
          if (field.type === 'array' && Array.isArray(field.default)) {
            const arr = field.default as unknown[];
            // If array contains objects, serialize as JSON
            if (arr.length > 0 && typeof arr[0] === 'object') {
              acc[field.name] = JSON.stringify(arr, null, 2);
            } else {
              // Primitive array - comma-separated
              acc[field.name] = (arr as string[]).join(', ');
            }
          } else if (field.type === 'textarea' && typeof field.default === 'object') {
            acc[field.name] = JSON.stringify(field.default, null, 2);
          } else {
            acc[field.name] = field.default;
          }
        }
        return acc;
      },
      {} as Record<string, unknown>
    );
  }, [fields]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: transformingResolver,
    defaultValues,
    mode: 'onSubmit', // Only validate when submitting, not on initial render
  });

  // Reset form when defaultValues change (e.g., when switching nodes)
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onFormSubmit = (data: Record<string, unknown>) => {
    // Transform and clean up values based on field types
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === '' || value === undefined || value === null) {
        continue;
      }

      // Find the field config to determine type
      const field = fields.find(f => f.name === key);

      if (field?.type === 'array' && typeof value === 'string') {
        // Try JSON parse first (for object arrays), then fall back to comma-separated
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
          try {
            cleaned[key] = JSON.parse(trimmed);
          } catch {
            const arr = value.split(',').map(s => s.trim()).filter(Boolean);
            if (arr.length > 0) cleaned[key] = arr;
          }
        } else {
          const arr = value.split(',').map(s => s.trim()).filter(Boolean);
          if (arr.length > 0) cleaned[key] = arr;
        }
      } else if (field?.type === 'textarea' && typeof value === 'string') {
        // Parse JSON string to object
        try {
          cleaned[key] = JSON.parse(value);
        } catch {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
    onSubmit(cleaned);
  };

  // Handle form submission - bypass validation in mock mode
  const handleFormSubmit = (e: React.FormEvent) => {
    if (mockMode) {
      e.preventDefault();
      // In mock mode, just submit with current values - no validation needed
      const values = getValues();
      onFormSubmit(values);
    } else {
      // Normal mode - use react-hook-form validation
      handleSubmit(onFormSubmit)(e);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Mock mode toggle - only show if node requires credentials */}
      {showMockToggle && onMockToggle && (
        <Card className={cn(
          'p-3',
          mockMode
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-muted/50'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={cn(
                'h-4 w-4',
                mockMode ? 'text-amber-600' : 'text-muted-foreground'
              )} />
              <div>
                <span className={cn(
                  'text-sm font-medium',
                  mockMode ? 'text-amber-800 dark:text-amber-200' : 'text-foreground'
                )}>
                  Mock Mode
                </span>
                <p className="text-xs text-muted-foreground">
                  Returns sample data without API calls
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onMockToggle}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                mockMode ? 'bg-amber-500' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  mockMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </Card>
      )}

      {/* Example JSON toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {fields.length} field{fields.length !== 1 ? 's' : ''} • all pre-filled with examples
        </span>
        <button
          type="button"
          onClick={() => setShowExample(!showExample)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code className="h-3 w-3" />
          {showExample ? 'Hide' : 'Show'} JSON
        </button>
      </div>

      {/* Example JSON */}
      {showExample && (
        <Card className="p-3 bg-muted/50">
          <pre className="text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(exampleJson, null, 2)}
          </pre>
        </Card>
      )}

      {/* Form fields */}
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>

          {field.type === 'text' && (
            <Input
              key={`${field.name}-${String(defaultValues[field.name] ?? '')}`}
              type="text"
              {...register(field.name)}
              defaultValue={defaultValues[field.name] as string}
              placeholder={field.description || `Enter ${field.label.toLowerCase()}`}
            />
          )}

          {field.type === 'number' && (
            <Input
              key={`${field.name}-${String(defaultValues[field.name] ?? '')}`}
              type="number"
              {...register(field.name, { valueAsNumber: true })}
              defaultValue={defaultValues[field.name] as number}
              placeholder={field.description || `Enter ${field.label.toLowerCase()}`}
            />
          )}

          {field.type === 'checkbox' && (
            <Controller
              name={field.name}
              control={control}
              render={({ field: controllerField }) => (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!controllerField.value}
                    onChange={(e) => controllerField.onChange(e.target.checked)}
                    className="h-4 w-4 text-jam-primary border-input rounded focus:ring-jam-primary"
                  />
                </div>
              )}
            />
          )}

          {field.type === 'select' && field.options && (
            <select
              key={`${field.name}-${String(defaultValues[field.name] ?? '')}`}
              {...register(field.name)}
              defaultValue={defaultValues[field.name] as string}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {field.type === 'array' && (() => {
            const defaultVal = defaultValues[field.name] as string;
            const isJsonArray = defaultVal?.trim().startsWith('[');

            return isJsonArray ? (
              <textarea
                key={`${field.name}-${defaultVal?.slice(0, 50) ?? ''}`}
                {...register(field.name)}
                defaultValue={defaultVal}
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                placeholder="JSON array"
              />
            ) : (
              <Input
                key={`${field.name}-${defaultVal ?? ''}`}
                type="text"
                {...register(field.name)}
                defaultValue={defaultVal}
                placeholder="Comma-separated values"
              />
            );
          })()}

          {field.type === 'textarea' && (
            <textarea
              key={`${field.name}-${String(defaultValues[field.name] ?? '').slice(0, 50)}`}
              {...register(field.name, {
                setValueAs: (v: unknown) => {
                  // If already an object, return as-is
                  if (typeof v === 'object' && v !== null) return v;
                  // If not a string, return undefined
                  if (typeof v !== 'string') return undefined;
                  if (!v || v.trim() === '') return undefined;
                  try {
                    return JSON.parse(v);
                  } catch {
                    return v;
                  }
                },
              })}
              defaultValue={defaultValues[field.name] as string}
              rows={4}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              placeholder="JSON object"
            />
          )}

          {field.description && field.type !== 'text' && field.type !== 'number' && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}

          {errors[field.name] && (
            <p className="text-xs text-destructive">
              {errors[field.name]?.message as string}
            </p>
          )}
        </div>
      ))}

      {/* Submit button */}
      <Button
        type="submit"
        variant="jam"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Node
          </>
        )}
      </Button>
    </form>
  );
}
