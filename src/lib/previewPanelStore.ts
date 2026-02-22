import { create } from "zustand";

interface PreviewFile {
  filePath: string;
  filename: string;
  content: string;
}

interface PreviewPanelState {
  isOpen: boolean;
  mode: 'preview' | 'browser';
  file: PreviewFile | null;
  openFile: (file: PreviewFile) => void;
  openBrowser: () => void;
  backToBrowser: () => void;
  close: () => void;
}

export const usePreviewPanel = create<PreviewPanelState>((set) => ({
  isOpen: false,
  mode: 'preview',
  file: null,
  openFile: (file) => set({ isOpen: true, mode: 'preview', file }),
  openBrowser: () => set({ isOpen: true, mode: 'browser', file: null }),
  backToBrowser: () => set({ mode: 'browser', file: null }),
  close: () => set({ isOpen: false, mode: 'preview', file: null }),
}));
