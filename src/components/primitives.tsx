import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-border rounded-[10px] p-4 ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-muted text-[10px] tracking-[1.2px] uppercase">{children}</div>;
}

export function PrivacyNote() {
  return (
    <div className="text-[11px] text-[#3f5563] text-center mt-3">
      🔒 Your addresses and history stay in this browser and never leave your device.
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="animate-pulse h-24 bg-panel border border-border rounded-[10px]" aria-label="loading" />;
}
