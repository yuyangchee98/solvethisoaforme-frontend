import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
];

export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-1.5 text-stone-600 hover:bg-stone-100 transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-black/5 shadow-sm z-40">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-md transition-colors"
              >
                {label}
              </a>
            ))}
            <a
              href="/oa-response"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
            >
              Go to App →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
