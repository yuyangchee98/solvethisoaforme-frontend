// Single source of truth for site navigation.
//
// LandingNav and TopNav both read from here so the two menus can't drift apart.

export interface ToolLink {
  /** The description page. Always exists in every build. */
  href: string;
  /** The running app. Injected when PUBLIC_APP_ROUTES=1 — see siteConfig.APP_ROUTES_ENABLED. */
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
