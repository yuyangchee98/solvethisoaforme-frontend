import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { TOOLS } from '@/navigation';

const links = [
  ...TOOLS.map((t) => ({ href: t.appHref, label: t.label })),
  { href: '/settings', label: 'Settings' },
];

export function MobileNavDropdown({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive current page label for the button text
  const currentLabel = links.find((l) => l.href === currentPath)?.label ?? 'Menu';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="md:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
      >
        {currentLabel}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-lg border border-black/10 shadow-lg py-1 z-50">
          {links.map(({ href, label }) => {
            const isActive = href === currentPath;
            return (
              <a
                key={href}
                href={href}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
