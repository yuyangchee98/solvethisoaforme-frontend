import type { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
}

export function ActionBar({ children }: ActionBarProps) {
  return (
    <div className="bg-stone-50 border-y border-stone-200">
      <div className="px-12 py-4 flex items-center justify-between gap-4">
        {/* Left side - primary actions */}
        <div className="flex items-center gap-3">
          {children}
        </div>

        {/* Right side - reserved for future actions */}
        <div className="flex items-center gap-3">
          {/* Can add secondary actions here later */}
        </div>
      </div>
    </div>
  );
}
