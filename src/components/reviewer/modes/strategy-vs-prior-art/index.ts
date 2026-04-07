/**
 * Strategy vs Prior Art — the Reviewer's v1 mode.
 *
 * Primary doc: a strategy markdown file (one, produced by the OA agent
 *   or pasted/uploaded standalone).
 * Source docs: the spec, office action, and prior art PDFs referenced
 *   by the strategy.
 */

import type { ReviewMode } from "../../types";
import { classifySources } from "./classifySources";
import { enrichMarkdown } from "./enrichMarkdown";
import { matchPullQuote } from "./matchPullQuote";

export const strategyVsPriorArt: ReviewMode = {
  id: "strategy-vs-prior-art",
  label: "Strategy vs Prior Art",
  slots: {
    primary: {
      label: "Strategy document",
      accept: [".md", ".mdx", ".docx", ".pdf"],
      multiple: false,
    },
    sources: {
      label: "Source documents",
      accept: [".pdf", ".md", ".docx"],
      multiple: true,
    },
  },
  classifySources,
  enrichMarkdown,
  matchPullQuote,
};
