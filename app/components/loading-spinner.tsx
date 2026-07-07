export function LoadingSpinner({ className = 'h-64' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-default-300 border-t-primary" />
    </div>
  );
}
