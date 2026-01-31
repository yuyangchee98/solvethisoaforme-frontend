import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    fontFamily: 'JetBrains Mono, SF Mono, Consolas, monospace',
    backgroundColor: 'white',
  },
  '.cm-content': {
    padding: '2rem',
    lineHeight: '1.7',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'JetBrains Mono, SF Mono, Consolas, monospace',
  },
  '.cm-lineNumbers': {
    fontWeight: '500',
    color: 'oklch(60% 0.01 60)',
    paddingRight: '1.5rem',
    paddingLeft: '1rem',
  },
  '.cm-gutters': {
    backgroundColor: 'oklch(99% 0.001 60)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLine': {
    backgroundColor: 'oklch(97% 0.003 60)',
  },
});
