import { useEffect, useRef, useState } from 'react';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { editorTheme } from './extensions/editorTheme';
import { annotationField, updateAnnotations } from './extensions/annotationExtension';
import type { AnnotationData } from '@/lib/annotationUtils';

interface ClaimEditorProps {
  value: string;
  onChange: (value: string) => void;
  annotations?: AnnotationData[];
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

export function ClaimEditor({
  value,
  onChange,
  annotations = [],
  onAnnotationClick,
  onAnnotationHover,
}: ClaimEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [mounted, setMounted] = useState(false);

  // Use ref to keep current annotations accessible in event handlers
  const annotationsRef = useRef<AnnotationData[]>(annotations);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || mounted) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        editorTheme,
        annotationField,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          click: (event, view) => {
            if (!onAnnotationClick) return false;

            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null) return false;

            // Find annotation at this position using ref
            const annotation = annotationsRef.current.find(
              (ann) => pos >= ann.start && pos < ann.end
            );

            if (annotation) {
              onAnnotationClick(annotation);
              return true;
            }

            return false;
          },
          mousemove: (event, view) => {
            if (!onAnnotationHover) return false;

            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos === null) {
              onAnnotationHover(null);
              return false;
            }

            // Find annotation at this position using ref
            const annotation = annotationsRef.current.find(
              (ann) => pos >= ann.start && pos < ann.end
            );

            onAnnotationHover(annotation || null);
            return false;
          },
          mouseleave: () => {
            if (onAnnotationHover) {
              onAnnotationHover(null);
            }
            return false;
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setMounted(true);

    return () => {
      view.destroy();
      viewRef.current = null;
      setMounted(false);
    };
  }, []);

  // Update document when value changes externally
  useEffect(() => {
    if (!viewRef.current || !mounted) return;

    const currentValue = viewRef.current.state.doc.toString();
    if (currentValue !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value, mounted]);

  // Update annotations
  useEffect(() => {
    if (!viewRef.current || !mounted) return;

    viewRef.current.dispatch({
      effects: updateAnnotations.of(annotations),
    });
  }, [annotations, mounted]);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl bg-white soft-shadow-lg">
      <div ref={editorRef} className="h-full" />
    </div>
  );
}
