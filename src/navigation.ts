// Single source of truth for site navigation.
//
// LandingNav and TopNav both read from here so the two menus can't drift apart
// (they had diverged before, and login.astro carried a third hand-copied set).

export interface ToolLink {
  /** The description page. Always exists in every build. */
  href: string;
  /** The running app. Only exists in the local build — see siteConfig.APP_ROUTES_ENABLED. */
  appHref: string;
  label: string;
  /** What job this tool does, in the user's terms rather than the tool's. */
  description: string;
}

export const TOOLS: ToolLink[] = [
  {
    href: '/tools/patent-reader',
    appHref: '/patent-reader',
    label: 'Patent Reader',
    description: 'Read the cited art',
  },
  {
    href: '/tools/oa-agent',
    appHref: '/oa-agent',
    label: 'OA Agent',
    description: 'Decide argue or amend',
  },
  {
    href: '/tools/antecedent-basis',
    appHref: '/check-antecedent-basis',
    label: 'Antecedent Basis',
    description: 'Check your amendments',
  },
];

export const BLOG_POSTS = [
  { href: '/blog/best-ai-tools-for-responding-to-patent-office-actions', label: 'Best AI Tools for Patent OA Response' },
  { href: '/blog/how-agentic-ai-reads-prior-art-differently-than-chatgpt', label: 'How Agentic AI Reads Prior Art' },
  { href: '/blog/ai-for-patent-prosecution-what-works-and-what-doesnt', label: 'AI for Patent Prosecution: What Works' },
  { href: '/blog/why-patent-attorneys-still-spend-hours-on-every-office-action', label: 'Why OAs Still Take 6 Hours' },
  { href: '/blog/antecedent-basis-mistakes-examiners-catch-that-ai-catches-first', label: 'Antecedent Basis Mistakes AI Catches' },
];
