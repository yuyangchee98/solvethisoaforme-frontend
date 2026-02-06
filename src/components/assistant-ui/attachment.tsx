"use client";

import { PropsWithChildren, useEffect, useState, useCallback, type FC } from "react";
import { XIcon, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import { cacheFile, getCachedUrl } from "@/lib/fileCache";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

// Helper: check if a content type looks like text
const isTextContentType = (ct: string | undefined) =>
  !!ct && (ct.startsWith("text/") || ct === "application/json" || ct === "application/xml");

// Hook to get text file content for preview
const useTextFile = () => {
  const attachmentData = useAuiState(
    useShallow(({ attachment }) => {
      const isDocOrFile = attachment.type === "document" || attachment.type === "file";
      if (!isDocOrFile) return { file: undefined, contentType: undefined, name: undefined, dataUrl: undefined };

      const file = (attachment as { file?: File }).file;
      const contentType = (attachment as { contentType?: string }).contentType;
      const name = attachment.name;

      const content = (attachment as { content?: Array<{ type: string; data?: string; mimeType?: string }> }).content;
      const fileContent = content?.find(c => c.type === "file");
      const dataUrl = fileContent?.data;

      return { file, contentType, name, dataUrl };
    })
  );

  const { file, contentType, name, dataUrl } = attachmentData;

  // Detect text files by content type or extension
  const ext = name?.split(".").pop()?.toLowerCase();
  const textExts = ["txt", "md", "csv", "log", "json", "xml", "yaml", "yml", "cfg", "ini", "conf", "sh", "py", "js", "ts", "html", "css"];
  const isText = isTextContentType(contentType) || (ext != null && textExts.includes(ext));

  // Read text content from the File object or decode from data URL
  const [textContent, setTextContent] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isText) {
      setTextContent(undefined);
      return;
    }

    // Priority 1: Read from File object (composer)
    if (file) {
      file.text().then(setTextContent).catch(() => setTextContent(undefined));
      return;
    }

    // Priority 2: Decode from data URL (sent messages with inline data)
    if (dataUrl && dataUrl.startsWith("data:")) {
      try {
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          setTextContent(atob(base64));
          return;
        }
      } catch {
        // fall through
      }
    }

    setTextContent(undefined);
  }, [isText, file, dataUrl]);

  return { isText, textContent, name };
};

// Hook to get PDF file/URL for preview
const usePdfFile = () => {
  const attachmentData = useAuiState(
    useShallow(({ attachment }) => {
      // Check for both "document" (composer) and "file" (sent messages) types
      const isDocOrFile = attachment.type === "document" || attachment.type === "file";
      if (!isDocOrFile) return { file: undefined, contentType: undefined, name: undefined, dataUrl: undefined };

      const file = (attachment as { file?: File }).file;
      const contentType = (attachment as { contentType?: string }).contentType;
      const name = attachment.name;

      // For sent messages, the data URL is in content[0].data
      const content = (attachment as { content?: Array<{ type: string; data?: string; mimeType?: string }> }).content;
      const fileContent = content?.find(c => c.type === "file");
      const dataUrl = fileContent?.data;

      return { file, contentType, name, dataUrl };
    })
  );

  const { file, contentType, name, dataUrl } = attachmentData;
  const isPdf = contentType === "application/pdf";
  const fileSrc = useFileSrc(isPdf ? file : undefined);

  // Priority: File object > data URL from content > cached URL
  const cachedUrl = isPdf && name ? getCachedUrl(`input/${name}`) : undefined;
  const pdfSource = file || dataUrl || cachedUrl;

  return { isPdf, src: fileSrc || dataUrl || cachedUrl, file, pdfSource };
};

const useFileExt = () => {
  return useAuiState(({ attachment }) => {
    const isDocOrFile = attachment.type === "document" || attachment.type === "file";
    if (!isDocOrFile) return undefined;
    return attachment.name?.split(".").pop()?.toLowerCase();
  });
};

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const useIsDocx = () => {
  return useAuiState(({ attachment }) => {
    const isDocOrFile =
      attachment.type === "document" || attachment.type === "file";
    if (!isDocOrFile) return false;
    const ct = (attachment as { contentType?: string }).contentType;
    const ext = attachment.name?.split(".").pop()?.toLowerCase();
    return ct === DOCX_MIME || ext === "docx";
  });
};

// Hook to get DOCX file content as HTML (via mammoth)
const useDocxFile = () => {
  const attachmentData = useAuiState(
    useShallow(({ attachment }) => {
      const isDocOrFile =
        attachment.type === "document" || attachment.type === "file";
      if (!isDocOrFile)
        return {
          file: undefined,
          contentType: undefined,
          name: undefined,
          dataUrl: undefined,
        };

      const file = (attachment as { file?: File }).file;
      const contentType = (attachment as { contentType?: string }).contentType;
      const name = attachment.name;

      const content = (
        attachment as {
          content?: Array<{ type: string; data?: string; mimeType?: string }>;
        }
      ).content;
      const fileContent = content?.find((c) => c.type === "file");
      const dataUrl = fileContent?.data;

      return { file, contentType, name, dataUrl };
    }),
  );

  const { file, contentType, name, dataUrl } = attachmentData;
  const ext = name?.split(".").pop()?.toLowerCase();
  const isDocx = contentType === DOCX_MIME || ext === "docx";

  const [htmlContent, setHtmlContent] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const cachedUrl = isDocx && name ? getCachedUrl(`input/${name}`) : undefined;

  useEffect(() => {
    if (!isDocx) {
      setHtmlContent(undefined);
      setError(undefined);
      return;
    }

    let cancelled = false;

    const convert = async () => {
      setLoading(true);
      setError(undefined);
      try {
        let arrayBuffer: ArrayBuffer;

        if (file) {
          // Priority 1: File object (composer)
          arrayBuffer = await file.arrayBuffer();
        } else if (dataUrl && dataUrl.startsWith("data:")) {
          // Priority 2: data URL from content
          const base64 = dataUrl.split(",")[1];
          if (!base64) throw new Error("Invalid data URL");
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          arrayBuffer = bytes.buffer as ArrayBuffer;
        } else if (cachedUrl) {
          // Priority 3: cached blob URL
          const resp = await fetch(cachedUrl);
          arrayBuffer = await resp.arrayBuffer();
        } else {
          setLoading(false);
          return;
        }

        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtmlContent(result.value);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    convert();
    return () => { cancelled = true; };
  }, [isDocx, file, dataUrl, cachedUrl]);

  return { isDocx, htmlContent, error, loading, name };
};

// Cache files when they are attached in the composer
const useCacheAttachmentFile = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source === "composer";

  const { file, name } = useAuiState(
    useShallow(({ attachment }) => {
      const file =
        attachment.type === "document" || attachment.type === "file"
          ? (attachment as { file?: File }).file
          : undefined;
      return {
        file,
        name: attachment.name,
      };
    })
  );

  useEffect(() => {
    // Only cache files from the composer (user uploads)
    if (!file || !name || !isComposer) return;

    // Cache with the path format the backend uses: input/<filename>
    cacheFile(`input/${name}`, file);
  }, [file, name, isComposer]);
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow(({ attachment }): { file?: File; src?: string } => {
      if (attachment.type !== "image") return {};
      if (attachment.file) return { file: attachment.file };
      const src = attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Image Preview"
      className={cn(
        "block h-auto max-h-[80vh] w-auto max-w-full object-contain",
        isLoaded
          ? "aui-attachment-preview-image-loaded"
          : "aui-attachment-preview-image-loading invisible",
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-attachment-preview-dialog-content p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="aui-sr-only sr-only">
          Image Attachment Preview
        </DialogTitle>
        <div className="aui-attachment-preview relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// PDF Thumbnail component - renders first page as a small preview
// Accepts either a File object or a blob URL string
const PdfThumbnail: FC<{ source: File | string }> = ({ source }) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  return (
    <Document
      file={source}
      onLoadSuccess={onDocumentLoadSuccess}
      loading={
        <div className="flex h-full w-full items-center justify-center">
          <FileText className="size-6 text-muted-foreground animate-pulse" />
        </div>
      }
      error={
        <FileText className="size-8 text-muted-foreground" />
      }
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      {numPages && (
        <Page
          pageNumber={1}
          width={56}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="[&_canvas]:!h-full [&_canvas]:!w-auto [&_canvas]:object-cover"
        />
      )}
    </Document>
  );
};

// Branded file extension thumbnail - reusable across file types
const FileExtThumbnail: FC<{ label: string; colorClass: string }> = ({ label, colorClass }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-white">
    <FileText className={cn("size-6", colorClass)} />
    <span className={cn("text-[7px] font-semibold leading-none", colorClass)}>
      {label}
    </span>
  </div>
);

// DOCX Preview Dialog - shows rendered HTML from mammoth
const DocxPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const { isDocx, htmlContent, error, loading, name } = useDocxFile();

  if (!isDocx) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-docx-preview-dialog-content p-4 sm:max-w-4xl max-h-[90vh] overflow-hidden [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="text-sm font-medium mb-2">
          {name}
        </DialogTitle>
        <div className="relative overflow-auto max-h-[calc(90vh-80px)] rounded-lg bg-white">
          {loading && (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="size-12 animate-pulse text-blue-600" />
              <span className="text-sm">Loading document...</span>
            </div>
          )}
          {error && (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="size-12" />
              <span className="text-sm">Failed to load document</span>
            </div>
          )}
          {htmlContent && (
            <div
              className="p-6 text-sm leading-relaxed text-foreground [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-muted [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-muted [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_strong]:font-bold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// PDF Preview Dialog - shows scrollable PDF viewer
const PdfPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const { isPdf, pdfSource } = usePdfFile();
  const [numPages, setNumPages] = useState<number | null>(null);

  // Get the filename for display
  const fileName = useAuiState(({ attachment }) => attachment.name);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  if (!isPdf || !pdfSource) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-pdf-preview-dialog-content p-4 sm:max-w-4xl max-h-[90vh] overflow-hidden [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="text-sm font-medium mb-2 flex items-center justify-between">
          <span>{fileName}</span>
          {numPages && (
            <span className="text-xs text-muted-foreground">
              {numPages} page{numPages > 1 ? "s" : ""}
            </span>
          )}
        </DialogTitle>
        <div className="aui-pdf-preview relative overflow-auto max-h-[calc(90vh-80px)] bg-muted/30 rounded-lg">
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
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
            className="flex flex-col items-center gap-4 py-4"
          >
            {numPages && Array.from({ length: numPages }, (_, i) => (
              <Page
                key={`page_${i + 1}`}
                pageNumber={i + 1}
                width={600}
                className="shadow-lg rounded overflow-hidden"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            ))}
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Text Preview Dialog - shows scrollable text content
const TextPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const { isText, textContent, name } = useTextFile();

  if (!isText || textContent == null) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-text-preview-dialog-content p-4 sm:max-w-3xl max-h-[90vh] overflow-hidden [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="text-sm font-medium mb-2">
          {name}
        </DialogTitle>
        <div className="relative overflow-auto max-h-[calc(90vh-80px)] bg-muted/30 rounded-lg">
          <pre className="p-4 text-sm whitespace-pre-wrap break-words font-mono leading-relaxed">
            {textContent}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const isImage = useAuiState(({ attachment }) => attachment.type === "image");
  const src = useAttachmentSrc();
  const { isPdf, pdfSource } = usePdfFile();
  const isDocx = useIsDocx();
  const ext = useFileExt();

  // Show PDF thumbnail for PDFs (works for both composer and sent messages)
  if (isPdf && pdfSource) {
    return (
      <div className="h-full w-full bg-white flex items-center justify-center overflow-hidden">
        <PdfThumbnail source={pdfSource} />
      </div>
    );
  }

  // Show branded thumbnails for known file types
  if (isDocx) return <FileExtThumbnail label="DOCX" colorClass="text-blue-600" />;
  if (ext === "txt") return <FileExtThumbnail label="TXT" colorClass="text-slate-500" />;
  if (ext === "csv") return <FileExtThumbnail label="CSV" colorClass="text-emerald-600" />;

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

// Wrapper component that chooses the right preview dialog
const AttachmentDialogWrapper: FC<PropsWithChildren> = ({ children }) => {
  const { isPdf, pdfSource } = usePdfFile();
  const isDocx = useIsDocx();
  const imageSrc = useAttachmentSrc();
  const { isText, textContent } = useTextFile();

  // Use PDF dialog for PDFs (only if we have a source to display)
  if (isPdf && pdfSource) {
    return <PdfPreviewDialog>{children}</PdfPreviewDialog>;
  }

  // Use DOCX dialog for Word documents
  if (isDocx) {
    return <DocxPreviewDialog>{children}</DocxPreviewDialog>;
  }

  // Use image dialog for images
  if (imageSrc) {
    return <AttachmentPreviewDialog>{children}</AttachmentPreviewDialog>;
  }

  // Use text dialog for text files
  if (isText && textContent != null) {
    return <TextPreviewDialog>{children}</TextPreviewDialog>;
  }

  // No dialog for other file types
  return <>{children}</>;
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source === "composer";

  // Cache the file for instant display when agent reads it
  useCacheAttachmentFile();

  const isImage = useAuiState(({ attachment }) => attachment.type === "image");
  const { isPdf } = usePdfFile();
  const isDocx = useIsDocx();
  const ext = useFileExt();
  const typeLabel = useAuiState(({ attachment }) => {
    const type = attachment.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
    }
  });

  return (
    <Tooltip>
      <AttachmentPrimitive.Root
        className={cn(
          "aui-attachment-root relative",
          isImage &&
            "aui-attachment-root-composer only:[&>#attachment-tile]:size-24",
        )}
      >
        <AttachmentDialogWrapper>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "aui-attachment-tile size-14 cursor-pointer overflow-hidden rounded-[14px] border bg-muted transition-opacity hover:opacity-75",
                isComposer &&
                  "aui-attachment-tile-composer border-foreground/20",
                (isPdf || isDocx || ext === "txt" || ext === "csv") && "bg-white",
              )}
              role="button"
              id="attachment-tile"
              aria-label={`${typeLabel} attachment`}
            >
              <AttachmentThumb />
            </div>
          </TooltipTrigger>
        </AttachmentDialogWrapper>
        {isComposer && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip="Remove file"
        className="aui-attachment-tile-remove absolute top-1.5 right-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black hover:[&_svg]:text-destructive"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments components={{ Attachment: AttachmentUI }} />
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1 empty:hidden">
      <ComposerPrimitive.Attachments
        components={{ Attachment: AttachmentUI }}
      />
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton
        tooltip="Add Attachment"
        side="bottom"
        variant="ghost"
        size="icon"
        className="aui-composer-add-attachment size-8.5 rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
        aria-label="Add Attachment"
      >
        <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
