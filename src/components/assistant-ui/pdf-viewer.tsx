"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker for Vite/Astro
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PDFSource = string | { url: string; httpHeaders?: Record<string, string> };

interface PDFViewerProps {
  src: PDFSource;
}

export function PDFViewer({ src }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || "Failed to load PDF");
  }, []);

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        <p>Error loading PDF: {error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      {numPages && (
        <div className="mb-2 text-xs text-muted-foreground">
          {numPages} page{numPages > 1 ? "s" : ""}
        </div>
      )}
      <Document
        file={src}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex h-64 w-full items-center justify-center">
            <FileText className="size-12 text-muted-foreground animate-pulse" />
          </div>
        }
        error={
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="size-12" />
            <span className="text-sm">Failed to load PDF</span>
          </div>
        }
        className="flex w-full flex-col items-center gap-4"
      >
        {numPages && containerWidth && Array.from({ length: numPages }, (_, i) => (
          <Page
            key={`page_${i + 1}`}
            pageNumber={i + 1}
            width={containerWidth}
            className="shadow-lg rounded overflow-hidden"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        ))}
      </Document>
    </div>
  );
}
