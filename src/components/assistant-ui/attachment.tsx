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
import { cacheFile } from "@/lib/fileCache";

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

// Hook to get PDF file for preview
const usePdfFile = () => {
  const { file, contentType } = useAuiState(
    useShallow(({ attachment }): { file?: File; contentType?: string } => {
      if (attachment.type !== "document") return {};
      const file = (attachment as { file?: File }).file;
      const contentType = (attachment as { contentType?: string }).contentType;
      return { file, contentType };
    })
  );

  const isPdf = contentType === "application/pdf";
  const src = useFileSrc(isPdf ? file : undefined);

  return { isPdf, src, file };
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
const PdfThumbnail: FC<{ file: File }> = ({ file }) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  return (
    <Document
      file={file}
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

// PDF Preview Dialog - shows scrollable PDF viewer
const PdfPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const { isPdf, file } = usePdfFile();
  const [numPages, setNumPages] = useState<number | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  if (!isPdf || !file) return children;

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
          <span>{file.name}</span>
          {numPages && (
            <span className="text-xs text-muted-foreground">
              {numPages} page{numPages > 1 ? "s" : ""}
            </span>
          )}
        </DialogTitle>
        <div className="aui-pdf-preview relative overflow-auto max-h-[calc(90vh-80px)] bg-muted/30 rounded-lg">
          <Document
            file={file}
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

const AttachmentThumb: FC = () => {
  const isImage = useAuiState(({ attachment }) => attachment.type === "image");
  const src = useAttachmentSrc();
  const { isPdf, file: pdfFile } = usePdfFile();

  // Show PDF thumbnail for PDFs
  if (isPdf && pdfFile) {
    return (
      <div className="h-full w-full bg-white flex items-center justify-center overflow-hidden">
        <PdfThumbnail file={pdfFile} />
      </div>
    );
  }

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
  const { isPdf } = usePdfFile();
  const imageSrc = useAttachmentSrc();

  // Use PDF dialog for PDFs
  if (isPdf) {
    return <PdfPreviewDialog>{children}</PdfPreviewDialog>;
  }

  // Use image dialog for images
  if (imageSrc) {
    return <AttachmentPreviewDialog>{children}</AttachmentPreviewDialog>;
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
                isPdf && "bg-white", // White background for PDF thumbnails
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
