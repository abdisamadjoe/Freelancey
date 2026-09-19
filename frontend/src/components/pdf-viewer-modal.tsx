"use client";

import { Modal, ModalBody, ModalHeader } from "@/components/ui";

interface PdfViewerModalProps {
  url: string;
  title: string;
  onClose: () => void;
  /** Extra header buttons (download, send, ...). */
  actions?: React.ReactNode;
}

/**
 * Lightweight PDF preview dialog used by the invoice sections.
 *
 * The dialog chrome now comes from the design-system `Modal` (portal, Escape /
 * backdrop close, body scroll lock); the iframe itself is unchanged so the
 * browser's native PDF surface stays exactly as before.
 */
export function PdfViewerModal({
  url,
  title,
  onClose,
  actions,
}: PdfViewerModalProps): React.ReactElement {
  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      scrollable={false}
      className="flex h-[85vh] w-full flex-col overflow-hidden"
    >
      <ModalHeader
        className="shrink-0 pr-14"
        title={<span className="block truncate">{title}</span>}
      >
        {actions}
      </ModalHeader>
      <ModalBody className="min-h-0 flex-1 bg-background-gray-primary p-0">
        <iframe
          src={url}
          title={title}
          className="h-full w-full border-0 bg-background-gray-primary"
        />
      </ModalBody>
    </Modal>
  );
}
