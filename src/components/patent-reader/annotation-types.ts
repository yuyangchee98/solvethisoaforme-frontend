export type AnnotationColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export const ANNOTATION_COLORS: AnnotationColor[] = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

export const ANNOTATION_BG_CLASSES: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-200/40',
  blue: 'bg-blue-200/40',
  green: 'bg-green-200/40',
  pink: 'bg-pink-200/40',
  purple: 'bg-purple-200/40',
  orange: 'bg-orange-200/40',
};

export const ANNOTATION_DOT_CLASSES: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  green: 'bg-green-400',
  pink: 'bg-pink-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
};

export interface PatentAnnotation {
  id: string;
  patentNumber: string;
  section: 'abstract' | 'description' | 'claims';
  sectionIndex: number;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  note: string;
  color: AnnotationColor;
  createdAt: string;
  updatedAt: string;
}

export interface PendingAnnotation {
  section: 'abstract' | 'description' | 'claims';
  sectionIndex: number;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  /** Position for the floating toolbar */
  rect: { top: number; left: number; width: number };
}

export interface AnnotationSpan {
  start: number;
  end: number;
  id: string;
  color: AnnotationColor;
}
