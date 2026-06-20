"use client";

import { useState } from "react";

export type FeedbackAttachment = {
  filename: string;
  content_type: string;
  size_bytes?: number;
  data_base64: string;
};

export function attachmentDataUrl(attachment: FeedbackAttachment): string {
  if (attachment.data_base64.startsWith("data:")) {
    return attachment.data_base64;
  }
  return `data:${attachment.content_type};base64,${attachment.data_base64}`;
}

export function isImageAttachment(contentType: string): boolean {
  return contentType.toLowerCase().startsWith("image/");
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white hover:bg-white/20"
        aria-label="Close preview"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function FeedbackAttachmentCard({
  attachment,
  index,
}: {
  attachment: FeedbackAttachment;
  index: number;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const href = attachmentDataUrl(attachment);
  const isImage = isImageAttachment(attachment.content_type);
  const isText = attachment.content_type === "text/plain";
  const sizeLabel = formatBytes(attachment.size_bytes);

  let textPreview: string | null = null;
  if (isText && attachment.data_base64) {
    try {
      const raw = attachment.data_base64.includes(",")
        ? attachment.data_base64.split(",").pop() || ""
        : attachment.data_base64;
      textPreview = atob(raw).slice(0, 2000);
    } catch {
      textPreview = null;
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {isImage && (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full bg-zinc-50 hover:bg-zinc-100 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={attachment.filename}
            className="max-h-72 w-full object-contain"
          />
        </button>
      )}

      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-800">
            {attachment.filename}
          </p>
          <p className="text-xs text-zinc-500">
            {attachment.content_type}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        </div>
        <a
          href={href}
          download={attachment.filename}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
        >
          Download
        </a>
      </div>

      {isText && textPreview && (
        <pre className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
          {textPreview}
        </pre>
      )}

      {!isImage && !isText && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-3 text-xs text-zinc-500">
          Preview not available — use download to view this file.
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          src={href}
          alt={`${attachment.filename} ${index + 1}`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

export function FeedbackAttachments({
  attachments,
}: {
  attachments: FeedbackAttachment[];
}) {
  if (!attachments.length) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        Attachments ({attachments.length})
      </p>
      <div className="space-y-3">
        {attachments.map((attachment, index) => (
          <FeedbackAttachmentCard
            key={`${attachment.filename}-${index}`}
            attachment={attachment}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
