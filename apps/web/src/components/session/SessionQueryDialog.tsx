"use client";

import { useEffect } from "react";
import { SessionQueryPanel } from "./SessionQueryPanel";

export function SessionQueryDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-stone-200/90 bg-[var(--surface)] shadow-2xl shadow-stone-300/40 sm:max-h-[min(85dvh,680px)] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-dialog-title"
      >
        <div className="flex shrink-0 flex-col gap-1 border-b border-stone-200/90 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span
              id="query-dialog-title"
              className="text-sm font-medium text-stone-800"
            >
              Query
            </span>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="pr-10 text-xs text-stone-500">
            Voice is transcribed with OpenAI Whisper, then sent through the same query flow.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <SessionQueryPanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
