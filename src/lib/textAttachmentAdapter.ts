import type {
  AttachmentAdapter,
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";

/**
 * Attachment adapter that accepts text files and converts them to base64 for transmission.
 * Mirrors PDFAttachmentAdapter so text files are treated as proper file attachments
 * instead of being inlined as XML-wrapped text by SimpleTextAttachmentAdapter.
 */
export class TextAttachmentAdapter implements AttachmentAdapter {
  accept =
    "text/plain,.txt,.md,.csv,.json,.xml,.yaml,.yml,.log,.cfg,.ini,.conf,.sh,.py,.js,.ts,.html,.css";

  async add(state: { file: File }): Promise<PendingAttachment> {
    return {
      id: state.file.name,
      type: "document",
      name: state.file.name,
      contentType: state.file.type || "text/plain",
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
          mimeType: attachment.contentType || "text/plain",
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
