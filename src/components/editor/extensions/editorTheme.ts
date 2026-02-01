import { EditorView } from '@codemirror/view';

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '16px',
    fontFamily: 'Calibri, "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: 'white',
    color: 'oklch(20% 0.01 60)',
  },
  '.cm-content': {
    padding: '3rem 4rem',
    lineHeight: '1.6',
    maxWidth: '90ch',
    margin: '0 auto',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'Calibri, "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  },
  '.cm-line': {
    paddingTop: '0.15em',
    paddingBottom: '0.15em',
  },
  '.cm-lineNumbers': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: '13px',
    fontWeight: '600',
    color: 'oklch(55% 0.02 60)',
    paddingRight: '2rem',
    paddingLeft: '1.5rem',
    minWidth: '3rem',
  },
  '.cm-gutters': {
    backgroundColor: 'oklch(99% 0.001 60)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'oklch(45% 0.12 60)',
  },
  '.cm-activeLine': {
    backgroundColor: 'oklch(97.5% 0.005 60)',
  },
});
