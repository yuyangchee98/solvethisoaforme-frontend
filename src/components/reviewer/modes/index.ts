/**
 * Registry of available Reviewer modes.
 *
 * To add a new mode: create a folder under `modes/`, export a
 * `ReviewMode` from its `index.ts`, and register it here. The key
 * becomes the URL segment (`/reviewer/{id}`).
 */

import type { ReviewMode } from "../types";
import { strategyVsPriorArt } from "./strategy-vs-prior-art";

export const MODES: Record<string, ReviewMode> = {
  "strategy-vs-prior-art": strategyVsPriorArt,
};

export function getMode(id: string): ReviewMode | null {
  return MODES[id] ?? null;
}
