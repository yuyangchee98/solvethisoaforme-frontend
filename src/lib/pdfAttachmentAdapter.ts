import type {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";

/**
 * Attachment adapter that accepts PDF files and converts them to base64 for transmission.
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

    // Read file as base64
    const base64 = await fileToBase64(file);

    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          file: {
            name: attachment.name,
            contentType: file.type,
            base64,
          },
        } as unknown as { type: "text"; text: string },
      ],
    };
  }

  async remove(): Promise<void> {
    // noop
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
