// Single source of truth for site navigation.
//
// LandingNav and TopNav both read from here so the two menus can't drift apart.

export interface ToolLink {
  /** The tool's page: the running app with its description below it. */
  href: string;
  label: string;
  /** What job this tool does, in the user's terms rather than the tool's. */
  description: string;
}

export const TOOLS: ToolLink[] = [
  {
    href: '/patent-reader',
    label: 'Patent Reader',
    description: 'Read the cited art',
  },
  {
    href: '/oa-agent',
    label: 'OA Agent',
    description: 'Decide argue or amend',
  },
  {
    href: '/check-antecedent-basis',
    label: 'Antecedent Basis',
    description: 'Check your amendments',
  },
];
