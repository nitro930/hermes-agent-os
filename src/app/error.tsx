'use client';

import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[ServerError]', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="bg-card border-red-500/20 max-w-lg w-full mx-4">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">Server Error</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while processing your request.
              This has been logged and our team has been notified.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400"
              onClick={() => reset()}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = '/')}
            >
              <Home className="w-3 h-3 mr-1" /> Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
