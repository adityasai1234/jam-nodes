'use client';

import { useState, useCallback, useEffect } from 'react';
import type { NodeDefinition, NodeCategory } from '@jam-nodes/core';
import { InputForm } from './InputForm';
import { OutputViewer } from './OutputViewer';
import { CredentialsModal } from './CredentialsModal';
import { getCredential, hasCredential } from '@/lib/credentials';
import { getRequiredServices } from '@/lib/registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeRunnerProps {
  node: NodeDefinition;
}

const CATEGORY_BADGE: Record<NodeCategory, 'logic' | 'transform' | 'integration' | 'action'> = {
  logic: 'logic',
  transform: 'transform',
  integration: 'integration',
  action: 'action',
};

interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export function NodeRunner({ node }: NodeRunnerProps) {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<
    Record<string, boolean>
  >({});

  const requiredServices = getRequiredServices(node.type);
  const needsCredentials = requiredServices.length > 0;

  // Check credentials status
  const checkCredentials = useCallback(() => {
    const status: Record<string, boolean> = {};
    for (const service of requiredServices) {
      status[service] = hasCredential(service);
    }
    setCredentialsStatus(status);
  }, [requiredServices]);

  useEffect(() => {
    checkCredentials();
  }, [checkCredentials]);

  const hasAllCredentials = Object.values(credentialsStatus).every(Boolean);
  const hasSomeCredentials = Object.values(credentialsStatus).some(Boolean);

  const handleSubmit = async (input: Record<string, unknown>) => {
    setIsLoading(true);
    setResult(null);

    try {
      // Collect credentials
      const credentials: Record<string, Record<string, string>> = {};
      for (const service of requiredServices) {
        const cred = getCredential(service);
        if (cred) {
          credentials[service] = cred;
        }
      }

      // Make API call
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeType: node.type,
          input,
          credentials,
          mockMode,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant={CATEGORY_BADGE[node.category]}>
            {node.category}
          </Badge>
          <h1 className="text-xl font-bold text-foreground">
            {node.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {node.description}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70 font-mono">{node.type}</p>

        {/* Capabilities */}
        {node.capabilities && (
          <div className="flex gap-2 mt-3">
            {node.capabilities.supportsEnrichment && (
              <Badge variant="secondary">enrichment</Badge>
            )}
            {node.capabilities.supportsBulkActions && (
              <Badge variant="secondary">bulk</Badge>
            )}
            {node.capabilities.supportsRerun && (
              <Badge variant="secondary">rerun</Badge>
            )}
          </div>
        )}
      </div>

      {/* Credentials status - only show for nodes that need credentials */}
      {needsCredentials && !mockMode && (
        <div
          className={cn(
            'px-6 py-3 border-b border-border flex items-center justify-between',
            hasAllCredentials
              ? 'bg-green-50 dark:bg-green-900/10'
              : 'bg-amber-50 dark:bg-amber-900/10'
          )}
        >
          <div className="flex items-center gap-2">
            {hasAllCredentials ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  All credentials configured
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  {hasSomeCredentials
                    ? 'Some credentials missing'
                    : 'Credentials required'}
                </span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCredentialsModal(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {hasAllCredentials ? 'Manage' : 'Configure'}
          </Button>
        </div>
      )}

      {/* Individual service status */}
      {needsCredentials && !mockMode && !hasAllCredentials && (
        <div className="px-6 py-2 border-b border-border flex gap-2 flex-wrap bg-muted/50">
          {requiredServices.map((service) => (
            <Badge
              key={service}
              variant={credentialsStatus[service] ? 'default' : 'destructive'}
              className="text-xs"
            >
              {credentialsStatus[service] ? '✓' : '✗'} {service}
            </Badge>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Input</CardTitle>
              <CardDescription>Configure node parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <InputForm
                schema={node.inputSchema}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                mockMode={mockMode}
                onMockToggle={() => setMockMode(!mockMode)}
                showMockToggle={needsCredentials}
              />
            </CardContent>
          </Card>

          {/* Output viewer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Output</CardTitle>
              <CardDescription>Execution results</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <OutputViewer
                  data={result.output}
                  success={result.success}
                  error={result.error}
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Run the node to see output
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credentials modal */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        services={requiredServices}
        onCredentialsUpdate={checkCredentials}
      />
    </div>
  );
}
