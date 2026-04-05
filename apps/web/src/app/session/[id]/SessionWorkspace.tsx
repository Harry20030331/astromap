"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { SessionQueryDialog } from "@/components/session/SessionQueryDialog";

export default function SessionWorkspace({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    if (!queryOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [queryOpen]);

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
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-[var(--background)]/95 backdrop-blur-md">
        <div className="w-full min-w-0 px-4 py-2">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1"
            role="tablist"
            aria-label="Session"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!queryOpen}
              className={`${tabBase} ${!queryOpen ? tabActive : tabInactive}`}
              onClick={() => setQueryOpen(false)}
            >
              View
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={queryOpen}
              className={`${tabBase} ${queryOpen ? tabActive : tabInactive}`}
              onClick={() => setQueryOpen(true)}
            >
              Query
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex flex-1 touch-pan-y flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-stone-200/90 bg-[var(--background)]/95 px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="text-sm text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-950"
        >
          Back to sessions
        </Link>
      </nav>

      {queryOpen ? (
        <SessionQueryDialog sessionId={id} onClose={() => setQueryOpen(false)} />
      ) : null}
    </div>
  );
}
