"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { SessionQueryChat } from "@/components/session/SessionQueryChat";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useI18n } from "@/lib/i18n";

export default function SessionWorkspace({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const queryOpen =
    searchParams.get("query") === "1" || Boolean(pathname?.replace(/\/$/, "").endsWith("/query"));

  const setQueryOpen = useCallback(
    (open: boolean) => {
      const base = `/session/${id}/view`;
      if (open) {
        router.replace(`${base}?query=1`, { scroll: false });
      } else {
        router.replace(base, { scroll: false });
      }
    },
    [id, router],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.targetTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dy > 48) return;
    if (dx < -56) setQueryOpen(true);
    else if (dx > 56 && queryOpen) setQueryOpen(false);
  };

  const tabBase =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400";
  const tabInactive = "text-stone-600 hover:text-stone-900";
  const tabActive = "bg-[var(--surface)] text-stone-900 shadow-sm shadow-stone-200/50";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-stone-200/90 bg-[var(--background)]/95 backdrop-blur-md">
        <div className="w-full min-w-0 px-4 pb-2 pt-2.5">
          <div className="mb-2.5 flex items-center gap-2">
            <Link
              href="/"
              aria-label={t("session.backToSessions")}
              className="inline-flex shrink-0 rounded-md p-1.5 text-stone-600 transition-colors hover:bg-stone-100/80 hover:text-stone-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <span className="min-w-0 flex-1 select-none text-sm font-medium text-stone-600">
              {t("session.backToSessions")}
            </span>
            <LocaleToggle />
          </div>
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1"
            role="tablist"
            aria-label="Session"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!queryOpen}
              className={`${tabBase} ${!queryOpen ? tabActive : tabInactive} inline-flex items-center justify-center gap-1.5`}
              onClick={() => setQueryOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t("session.view")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={queryOpen}
              className={`${tabBase} ${queryOpen ? tabActive : tabInactive} inline-flex items-center justify-center gap-1.5`}
              onClick={() => setQueryOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              {t("session.query")}
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {queryOpen ? (
          <SessionQueryChat sessionId={id} />
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        )}
      </div>
    </div>
  );
}
