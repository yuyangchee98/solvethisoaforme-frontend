import type {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";

/**
 * Attachment adapter that accepts PDF files and converts them to base64 for transmission.
 * Matches the vercelAttachmentAdapter format for consistency.
 */
export class PDFAttachmentAdapter implements AttachmentAdapter {
  // Accept PDF files
  accept = "application/pdf";

  async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const file = attachment.file;
    if (!file) {
      throw new Error("No file attached");
    }

    // Read file as data URL (matches vercelAttachmentAdapter format)
    const dataUrl = await getFileDataURL(file);

    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          mimeType: attachment.contentType,
          filename: attachment.name,
          data: dataUrl,
        } as unknown as { type: "text"; text: string },
      ],
    };
  }

  async remove(): Promise<void> {
    // noop
  }
}

function getFileDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
