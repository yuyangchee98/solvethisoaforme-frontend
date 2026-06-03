import { useState, useCallback, useEffect, useRef } from "react";
import { getToken } from "@/lib/auth";
import {
  fetchAnnotations as fetchAnnotationsApi,
  createAnnotationApi,
  updateAnnotationApi,
  deleteAnnotationApi,
  bulkImportAnnotations,
} from "@/lib/api";
import type { PatentAnnotation, PendingAnnotation, AnnotationColor } from "./annotation-types";

const LS_KEY = "patent_annotations";
const LS_COUNT_KEY = "patent_annotation_count";
const SOFT_THRESHOLD = 10;
const HARD_THRESHOLD = 25;

// ── localStorage helpers ─────────────────────────────────────────

function readAllLocal(): Record<string, PatentAnnotation[]> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAllLocal(all: Record<string, PatentAnnotation[]>) {
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  const count = Object.values(all).reduce((sum, arr) => sum + arr.length, 0);
  localStorage.setItem(LS_COUNT_KEY, String(count));
}

function readLocalCount(): number {
  try {
    return parseInt(localStorage.getItem(LS_COUNT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

// ── Hook ─────────────────────────────────────────────────────────

export interface UseAnnotationsReturn {
  annotations: PatentAnnotation[];
  pendingAnnotation: PendingAnnotation | null;
  setPendingAnnotation: (p: PendingAnnotation | null) => void;
  createAnnotation: (color: AnnotationColor, note: string) => void;
  updateAnnotation: (id: string, updates: { note?: string; color?: AnnotationColor }) => void;
  deleteAnnotation: (id: string) => void;
  showSoftPrompt: boolean;
  showHardGate: boolean;
  dismissSoftPrompt: () => void;
  totalCount: number;
}

// Annotations are hidden in prod until the backend endpoints
// (POST/PATCH/DELETE /patents/{pub}/annotations) ship. The exported hook
// returns a no-op so the toolbar never appears and no highlights render.
// To restore: swap the body of `useAnnotations` for a call to
// `useAnnotationsImpl(patentNumber)`.
export function useAnnotations(_patentNumber: string | null): UseAnnotationsReturn {
  return {
    annotations: [],
    pendingAnnotation: null,
    setPendingAnnotation: () => {},
    createAnnotation: () => {},
    updateAnnotation: () => {},
    deleteAnnotation: () => {},
    showSoftPrompt: false,
    showHardGate: false,
    dismissSoftPrompt: () => {},
    totalCount: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useAnnotationsImpl(patentNumber: string | null): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<PatentAnnotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [softDismissed, setSoftDismissed] = useState(
    () => sessionStorage.getItem("annotation_prompt_dismissed") === "true"
  );
  const loadedPatentRef = useRef<string | null>(null);

  const isLoggedIn = !!getToken();

  // Load annotations when patent changes
  useEffect(() => {
    if (!patentNumber) {
      setAnnotations([]);
      loadedPatentRef.current = null;
      return;
    }
    if (patentNumber === loadedPatentRef.current) return;
    loadedPatentRef.current = patentNumber;

    if (isLoggedIn) {
      fetchAnnotationsApi(patentNumber)
        .then(setAnnotations)
        .catch(() => setAnnotations([]));
    } else {
      const all = readAllLocal();
      setAnnotations(all[patentNumber] ?? []);
      setTotalCount(readLocalCount());
    }
  }, [patentNumber, isLoggedIn]);

  // Create
  const createAnnotation = useCallback(
    (color: AnnotationColor, note: string) => {
      if (!patentNumber || !pendingAnnotation) return;

      const now = new Date().toISOString();
      const annotation: PatentAnnotation = {
        id: crypto.randomUUID(),
        patentNumber,
        section: pendingAnnotation.section,
        sectionIndex: pendingAnnotation.sectionIndex,
        paragraphIndex: pendingAnnotation.paragraphIndex,
        startOffset: pendingAnnotation.startOffset,
        endOffset: pendingAnnotation.endOffset,
        selectedText: pendingAnnotation.selectedText,
        note,
        color,
        createdAt: now,
        updatedAt: now,
      };

      if (isLoggedIn) {
        createAnnotationApi(patentNumber, annotation)
          .then((saved) => setAnnotations((prev) => [...prev, saved]))
          .catch(console.error);
      } else {
        const all = readAllLocal();
        const list = all[patentNumber] ?? [];
        list.push(annotation);
        all[patentNumber] = list;
        writeAllLocal(all);
        setAnnotations(list);
        setTotalCount(readLocalCount());
      }

      setPendingAnnotation(null);
      // Clear text selection
      window.getSelection()?.removeAllRanges();
    },
    [patentNumber, pendingAnnotation, isLoggedIn]
  );

  // Update
  const updateAnnotation = useCallback(
    (id: string, updates: { note?: string; color?: AnnotationColor }) => {
      if (!patentNumber) return;

      const now = new Date().toISOString();

      if (isLoggedIn) {
        updateAnnotationApi(patentNumber, id, updates)
          .then(() => {
            setAnnotations((prev) =>
              prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a))
            );
          })
          .catch(console.error);
      } else {
        const all = readAllLocal();
        const list = all[patentNumber] ?? [];
        const idx = list.findIndex((a) => a.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updates, updatedAt: now };
          all[patentNumber] = list;
          writeAllLocal(all);
          setAnnotations([...list]);
        }
      }
    },
    [patentNumber, isLoggedIn]
  );

  // Delete
  const deleteAnnotation = useCallback(
    (id: string) => {
      if (!patentNumber) return;

      if (isLoggedIn) {
        deleteAnnotationApi(patentNumber, id)
          .then(() => setAnnotations((prev) => prev.filter((a) => a.id !== id)))
          .catch(console.error);
      } else {
        const all = readAllLocal();
        const list = (all[patentNumber] ?? []).filter((a) => a.id !== id);
        all[patentNumber] = list;
        if (list.length === 0) delete all[patentNumber];
        writeAllLocal(all);
        setAnnotations(list);
        setTotalCount(readLocalCount());
      }
    },
    [patentNumber, isLoggedIn]
  );

  // Dismiss soft prompt
  const dismissSoftPrompt = useCallback(() => {
    sessionStorage.setItem("annotation_prompt_dismissed", "true");
    setSoftDismissed(true);
  }, []);

  // Migrate localStorage → server after login
  useEffect(() => {
    if (!isLoggedIn) return;
    const all = readAllLocal();
    const allAnnotations = Object.values(all).flat();
    if (allAnnotations.length === 0) return;

    bulkImportAnnotations(allAnnotations)
      .then(() => {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_COUNT_KEY);
        // Reload current patent's annotations from server
        if (patentNumber) {
          loadedPatentRef.current = null; // force reload
          fetchAnnotationsApi(patentNumber)
            .then(setAnnotations)
            .catch(() => {});
        }
      })
      .catch(console.error);
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSoftPrompt = !isLoggedIn && totalCount >= SOFT_THRESHOLD && !softDismissed;
  const showHardGate = !isLoggedIn && totalCount >= HARD_THRESHOLD;

  return {
    annotations,
    pendingAnnotation,
    setPendingAnnotation,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    showSoftPrompt,
    showHardGate,
    dismissSoftPrompt,
    totalCount,
  };
}
