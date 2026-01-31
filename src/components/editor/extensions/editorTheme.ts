import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, SF Mono, Consolas, monospace',
  },
  '.cm-content': {
    padding: '1rem',
    lineHeight: '1.6',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'JetBrains Mono, SF Mono, Consolas, monospace',
  },
  '.cm-lineNumbers': {
    fontWeight: '600',
    color: 'oklch(50% 0.019 257.28)',
    paddingRight: '1rem',
  },
  '.cm-gutters': {
    backgroundColor: '#FAFAF9',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLine': {
    backgroundColor: 'oklch(98% 0.002 264.54)',
  },
});
