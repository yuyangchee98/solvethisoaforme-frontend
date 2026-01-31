import { StateField, StateEffect, RangeSet } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { AnnotationData } from '@/lib/annotationUtils';

// Effect to update annotations
export const updateAnnotations = StateEffect.define<AnnotationData[]>();

// Create decoration from annotation
function createDecoration(annotation: AnnotationData) {
  const className = `cm-annotation cm-annotation-${annotation.type}`;

  return Decoration.mark({
    class: className,
    attributes: {
      'data-type': annotation.type,
      'data-claim': annotation.claimNumber.toString(),
      'data-text': annotation.text,
      'data-start': annotation.start.toString(),
      'data-end': annotation.end.toString(),
    },
  });
}

// State field to manage annotations
export const annotationField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Map decorations through document changes
    decorations = decorations.map(tr.changes);

    // Apply annotation updates
    for (const effect of tr.effects) {
      if (effect.is(updateAnnotations)) {
        const annotations = effect.value;
        const ranges = annotations.map(ann =>
          createDecoration(ann).range(ann.start, ann.end)
        );
        decorations = RangeSet.of(ranges, true);
      }
    }

    return decorations;
  },
  provide: f => EditorView.decorations.from(f),
});
