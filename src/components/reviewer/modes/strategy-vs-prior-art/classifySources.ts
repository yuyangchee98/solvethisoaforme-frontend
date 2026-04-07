/**
 * File classifier for the strategy-vs-prior-art mode.
 *
 * Takes a flat list of workspace files (from either a reviewer-native
 * session with `strategy/` + `sources/` or an OA-handoff session with
 * `input/` + `rejections/`) and produces:
 *   - primaryDoc: the strategy .md file
 *   - sourceDocs: every PDF/MD source doc with label + prior-art keys
 *
 * Each source doc is paired with its `.extracted.md` sibling if the
 * backend processor produced one.
 */

import type { WorkspaceFile } from "@/lib/api";
import type {
  ClassifiedDocs,
  SourceDoc,
  SourceDocKind,
} from "../../types";

// ── Prior-art publication number parsing ─────────────────────────────

/** Extract every US publication number pattern from a filename. */
function extractPubNumbers(filename: string): string[] {
  const results: string[] = [];
  // US20220075747 / US20220075747A1
  const pubRe = /US\d{10,11}(?:[A-Z]\d?)?/gi;
  // US2022/0075747 / US 2022/0075747
  const slashRe = /US\s*\d{4}[\/\-\s]\d{6,7}(?:[A-Z]\d?)?/gi;
  // Granted patent: US11423567 / US11423567B2
  const grantedRe = /US\d{7,8}(?:[A-Z]\d?)?/gi;
  for (const re of [pubRe, slashRe, grantedRe]) {
    const matches = filename.match(re);
    if (matches) results.push(...matches);
  }
  return results;
}

/** Normalize a publication number to several comparison forms. */
export function normalizePubKeys(raw: string): string[] {
  // Strip whitespace, slashes, dashes, and kind code suffix like B2/A1
  const stripped = raw.replace(/[\s\/\-]/g, "").toUpperCase();
  const noKind = stripped.replace(/[A-Z]\d?$/, "");
  const forms = new Set<string>([stripped, noKind, raw.toUpperCase()]);

  // If it's a publication number like US20220075747, also add the
  // slashed form US2022/0075747 for display-style matching.
  const m = noKind.match(/^US(\d{4})(\d{6,7})$/);
  if (m) {
    forms.add(`US${m[1]}/${m[2]}`);
    forms.add(`US ${m[1]}/${m[2]}`);
  }
  return [...forms];
}

// ── Classification ────────────────────────────────────────────────────

const EXTRACTED_SUFFIX = ".extracted.md";

function isExtractedSibling(path: string): boolean {
  return path.toLowerCase().endsWith(EXTRACTED_SUFFIX);
}

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

function stemOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.(pdf|md|mdx)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Guess the source-doc kind from a filename. */
function classifyKind(filename: string): SourceDocKind {
  const lower = filename.toLowerCase();
  if (/^spec/.test(lower) || /specification/.test(lower)) return "spec";
  if (
    /^(oa|office[-_]?action|rejection)/.test(lower) ||
    /non[-_]?final/.test(lower) ||
    /final[-_]?office/.test(lower)
  ) {
    return "office_action";
  }
  if (extractPubNumbers(filename).length > 0) return "prior_art";
  return "other";
}

/** Build a friendly display label for a source doc tab. */
function buildLabel(filename: string, kind: SourceDocKind): string {
  const stem = stemOf(baseName(filename));
  if (kind === "spec") return "Spec";
  if (kind === "office_action") return "Office Action";
  if (kind === "prior_art") {
    // Try to extract an author-ish prefix + pub number
    // e.g. "shuler-US20220075747A1.pdf" → "Shuler (US20220075747)"
    const pubs = extractPubNumbers(stem);
    const pub = pubs[0];
    const prefix = pub
      ? stem.split(pub)[0].replace(/[-_\s]+$/, "")
      : stem;
    const cleaned = prefix
      .replace(/[-_]+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    if (cleaned && pub) return `${cleaned} (${pub})`;
    if (pub) return pub;
    return stem;
  }
  return stem;
}

/**
 * Classify a session's files into a primary doc + source docs.
 *
 * Handles two layouts:
 * - reviewer-native: files in `strategy/` and `sources/`
 * - OA-handoff: files in `input/` and `rejections/` (no dedicated
 *   strategy dir; the primary doc is identified by `primaryDocOverride`
 *   or by finding the first .md file whose name matches /strategy/i)
 */
export function classifySources(
  files: WorkspaceFile[],
  opts: { primaryDocOverride?: string } = {},
): ClassifiedDocs {
  // Bucket all non-extracted files; build an extracted-sibling lookup.
  // EXCEPTION: extracted files inside `strategy/` are kept as
  // candidates because that's where the primary doc lives when the
  // user uploaded a .docx/.pdf strategy and the backend ran extraction.
  const extractedByStem = new Map<string, string>();
  const candidates: WorkspaceFile[] = [];
  for (const f of files) {
    if (f.is_directory) continue;
    if (isExtractedSibling(f.path) && !f.path.startsWith("strategy/")) {
      // key by the parent dir + stem (without the .extracted.md suffix)
      const withoutExt = f.path.slice(0, -EXTRACTED_SUFFIX.length);
      extractedByStem.set(withoutExt, f.path);
    } else {
      candidates.push(f);
    }
  }

  // ── Locate the primary doc ────────────────────────────────────────
  let primaryPath: string | null = null;
  if (opts.primaryDocOverride) {
    const normalized = opts.primaryDocOverride.replace(/^\/+/, "");
    const found = candidates.find((f) => f.path === normalized);
    if (found) primaryPath = found.path;
  }
  if (!primaryPath) {
    // Reviewer-native: prefer the .extracted.md (if present, from a
    // .docx/.pdf upload), otherwise the .md the user uploaded directly.
    const inStrategyExtracted = candidates.find(
      (f) =>
        f.path.startsWith("strategy/") &&
        f.path.toLowerCase().endsWith(EXTRACTED_SUFFIX),
    );
    if (inStrategyExtracted) {
      primaryPath = inStrategyExtracted.path;
    } else {
      const inStrategy = candidates.find(
        (f) => f.path.startsWith("strategy/") && /\.mdx?$/i.test(f.name),
      );
      if (inStrategy) primaryPath = inStrategy.path;
    }
  }
  if (!primaryPath) {
    // OA-handoff fallback: first .md file named strategy*
    const likely = candidates.find(
      (f) =>
        /\.mdx?$/i.test(f.name) && /strategy/i.test(f.name),
    );
    if (likely) primaryPath = likely.path;
  }
  if (!primaryPath) {
    // Last resort: any .md file in the root
    const anyMd = candidates.find(
      (f) => /\.mdx?$/i.test(f.name) && !f.path.includes("/"),
    );
    if (anyMd) primaryPath = anyMd.path;
  }

  const primaryDoc = primaryPath
    ? { filePath: primaryPath, filename: baseName(primaryPath) }
    : null;

  // ── Collect source docs (everything other than the primary) ──────
  const sourceDocs: SourceDoc[] = [];
  for (const f of candidates) {
    if (f.path === primaryPath) continue;
    // Skip strategy/ dir entirely (reviewer-native) — only the primary lives there
    if (f.path.startsWith("strategy/")) continue;

    const kind = classifyKind(f.name);
    // Pure .md files that aren't classified as anything and are in a
    // non-source-looking dir are probably scratch notes — skip.
    const inSourceDir =
      f.path.startsWith("sources/") ||
      f.path.startsWith("input/") ||
      f.path.startsWith("rejections/") ||
      !f.path.includes("/");
    if (!inSourceDir) continue;

    // Only real source formats become tabs
    if (!/\.(pdf|md|mdx|txt)$/i.test(f.name)) continue;
    // Extracted siblings are never themselves source tabs
    if (isExtractedSibling(f.path)) continue;

    const stemKey = f.path.replace(/\.[^.]+$/, "");
    const extractedPath = extractedByStem.get(stemKey) ?? null;

    const pubs = extractPubNumbers(f.name);
    const priorArtKeys: string[] = [];
    for (const p of pubs) {
      priorArtKeys.push(...normalizePubKeys(p));
    }

    sourceDocs.push({
      id: slugify(f.path),
      label: buildLabel(f.name, kind),
      kind,
      filePath: f.path,
      extractedPath,
      priorArtKeys,
    });
  }

  // Stable order: spec first, then office action, then prior art,
  // then everything else. Within each bucket alphabetical.
  const kindOrder: Record<SourceDocKind, number> = {
    spec: 0,
    office_action: 1,
    prior_art: 2,
    other: 3,
  };
  sourceDocs.sort((a, b) => {
    const ko = kindOrder[a.kind] - kindOrder[b.kind];
    if (ko !== 0) return ko;
    return a.label.localeCompare(b.label);
  });

  return { primaryDoc, sourceDocs };
}
