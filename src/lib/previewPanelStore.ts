import { create } from "zustand";

interface PreviewFile {
  filePath: string;
  filename: string;
  content: string;
}

interface PreviewPanelState {
  isOpen: boolean;
  file: PreviewFile | null;
  openFile: (file: PreviewFile) => void;
  close: () => void;
}

export const usePreviewPanel = create<PreviewPanelState>((set) => ({
  isOpen: false,
  file: null,
  openFile: (file) => set({ isOpen: true, file }),
  close: () => set({ isOpen: false, file: null }),
}));
