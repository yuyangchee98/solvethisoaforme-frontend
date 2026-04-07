/**
 * Shared React context for citation click handling.
 *
 * PrimaryPane injects a callback here; the custom `span` override
 * inside its markdown components reads the callback on click so that
 * nested citation elements can reach the SourcePane without prop
 * drilling through react-markdown.
 */

import { createContext, useContext } from "react";
import type { Anchor, PullQuoteMatch, SourceDoc } from "./types";

export interface CitationContextValue {
  /** Called when a citation span is clicked in the primary pane. */
  onCitationClick: (anchor: Anchor) => void;
  /** Match a blockquote's text against the source docs. */
  matchPullQuote: (quoteText: string) => PullQuoteMatch | null;
  /** Source docs indexed by id (for label lookups, etc.). */
  sourcesById: Map<string, SourceDoc>;
}

const CitationContext = createContext<CitationContextValue | null>(null);

export const CitationProvider = CitationContext.Provider;

export function useCitationContext(): CitationContextValue {
  const ctx = useContext(CitationContext);
  if (!ctx) {
    throw new Error("useCitationContext must be used inside CitationProvider");
  }
  return ctx;
}
