'use client';

import { useState, useEffect } from 'react';
import { JsonView, darkStyles, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Copy, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputViewerProps {
  data: unknown;
  success: boolean;
  error?: string;
  className?: string;
}

export function OutputViewer({
  data,
  success,
  error,
  className,
}: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      className={cn(
        'overflow-hidden',
        success
          ? 'border-green-200 dark:border-green-800'
          : 'border-destructive/50',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2',
          success
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-destructive/10'
        )}
      >
        <div className="flex items-center gap-2">
          {success ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Success
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Failed
              </span>
            </>
          )}
        </div>

        {success && data !== null && data !== undefined ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-7 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadJson}
              className="h-7 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 bg-card max-h-96 overflow-auto">
        {success && data ? (
          <JsonView
            data={data as object}
            shouldExpandNode={(level) => level < 2}
            style={isDark ? darkStyles : defaultStyles}
          />
        ) : error ? (
          <div className="text-destructive font-mono text-sm">
            {error}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No output</div>
        )}
      </div>
    </Card>
  );
}
