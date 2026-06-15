export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Loading Hermes Agent OS</h2>
          <p className="text-sm text-muted-foreground mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
