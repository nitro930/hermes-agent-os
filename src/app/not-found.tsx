import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="bg-card border-border max-w-lg w-full mx-4">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">404</h2>
            <p className="text-lg font-medium text-foreground">Page Not Found</p>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has been moved.
              Check the URL or navigate back to the dashboard.
            </p>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400"
            >
              <Home className="w-3 h-3 mr-1" /> Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
