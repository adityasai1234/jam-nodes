'use client';

import { useState, useEffect } from 'react';
import {
  saveCredential,
  getCredential,
  deleteCredential,
  getCredentialSchema,
  type CredentialData,
} from '@/lib/credentials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: string[];
  onCredentialsUpdate: () => void;
}

export function CredentialsModal({
  isOpen,
  onClose,
  services,
  onCredentialsUpdate,
}: CredentialsModalProps) {
  const [credentials, setCredentials] = useState<Record<string, CredentialData>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [saveToStorage, setSaveToStorage] = useState(true);

  // Load existing credentials
  useEffect(() => {
    if (isOpen) {
      const loaded: Record<string, CredentialData> = {};
      for (const service of services) {
        const existing = getCredential(service);
        if (existing) {
          loaded[service] = existing;
        }
      }
      setCredentials(loaded);
    }
  }, [isOpen, services]);

  const handleFieldChange = (
    service: string,
    field: string,
    value: string
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    for (const service of services) {
      const creds = credentials[service];
      if (creds && Object.values(creds).some((v) => v)) {
        if (saveToStorage) {
          saveCredential(service, creds);
        }
      }
    }
    onCredentialsUpdate();
    onClose();
  };

  const handleClear = (service: string) => {
    deleteCredential(service);
    setCredentials((prev) => {
      const updated = { ...prev };
      delete updated[service];
      return updated;
    });
    onCredentialsUpdate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md mx-4 max-h-[80vh] overflow-hidden shadow-lg">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Configure Credentials</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="overflow-y-auto max-h-[50vh]">
          {services.map((service) => {
            const schema = getCredentialSchema(service);
            const fields = schema || [
              { name: 'apiKey', label: 'API Key', type: 'password' as const },
            ];

            const hasCredentials = credentials[service] &&
              Object.values(credentials[service]).some(v => v);

            return (
              <div key={service} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground capitalize">
                    {service}
                  </h3>
                  {hasCredentials && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClear(service)}
                      className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-xs text-muted-foreground mb-1.5">
                        {field.label}
                      </label>
                      <div className="relative">
                        <Input
                          type={
                            field.type === 'password' &&
                            !showPassword[`${service}.${field.name}`]
                              ? 'password'
                              : 'text'
                          }
                          value={credentials[service]?.[field.name] || ''}
                          onChange={(e) =>
                            handleFieldChange(service, field.name, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="pr-10"
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                [`${service}.${field.name}`]:
                                  !prev[`${service}.${field.name}`],
                              }))
                            }
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          >
                            {showPassword[`${service}.${field.name}`] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Save option */}
          <div className="mt-6 pt-4 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToStorage}
                onChange={(e) => setSaveToStorage(e.target.checked)}
                className="h-4 w-4 text-jam-primary border-input rounded focus:ring-jam-primary"
              />
              <span className="text-sm text-foreground">
                Save to browser (encrypted)
              </span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Credentials are stored locally and encrypted
            </p>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="jam"
            onClick={handleSave}
            className="flex-1"
          >
            Save & Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
