import type {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";

/**
 * Attachment adapter that accepts .docx files and converts them to base64 for transmission.
 */
export class DocxAttachmentAdapter implements AttachmentAdapter {
  accept =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx";

  async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType:
        state.file.type ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const file = attachment.file;
    if (!file) {
      throw new Error("No file attached");
    }

    const dataUrl = await getFileDataURL(file);

    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "file",
          mimeType:
            attachment.contentType ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
