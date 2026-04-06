"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const queryOpen =
    searchParams.get("query") === "1" || Boolean(pathname?.replace(/\/$/, "").endsWith("/query"));

  const setQueryOpen = useCallback(
    (open: boolean) => {
      const base = `/session/${id}/view`;
      router.replace(open ? `${base}?query=1` : base, { scroll: false });
    },
    [id, router],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Ref mirror of queryOpen — gesture handlers always read fresh value
  const queryOpenRef = useRef(queryOpen);
  useEffect(() => {
    queryOpenRef.current = queryOpen;
  });

  // Tracks whether initial position has been set
  const initializedRef = useRef(false);

  // Set initial position BEFORE first paint (no flash, no transition)
  // useLayoutEffect is client-only; suppress the SSR warning intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${queryOpen ? -wrapper.offsetWidth : 0}px)`;
    initializedRef.current = true;
  }, []);

  // Animate to correct position on tab click (skip the initial run)
  useEffect(() => {
    if (!initializedRef.current) return;
    const el = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    const w = wrapper.offsetWidth;
    el.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)";
    el.style.transform = `translateX(${queryOpen ? -w : 0}px)`;
  }, [queryOpen]);

  // Gesture handler — runs once, reads queryOpenRef for always-fresh state
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;

    let startX = 0;
    let startY = 0;
    let isHorizontal: boolean | null = null;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.targetTouches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isHorizontal = null;
      active = true;
      track.style.transition = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const touch = e.targetTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (isHorizontal === null && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        isHorizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!isHorizontal) return;

      e.preventDefault();

      const w = wrapper.offsetWidth;
      const open = queryOpenRef.current;

      let raw: number;
      if (!open && dx > 0) {
        // View panel edge — rubber band right
        raw = dx * 0.15;
      } else if (open && dx < 0) {
        // Query panel edge — rubber band left
        raw = -w + dx * 0.15;
      } else {
        // Valid direction — hard clamp to [-w, 0]
        raw = Math.max(-w, Math.min(0, (open ? -w : 0) + dx));
      }

      track.style.transform = `translateX(${raw}px)`;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      if (!isHorizontal) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const w = wrapper.offsetWidth;
      const threshold = w * 0.25;
      const open = queryOpenRef.current;

      track.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)";

      if (!open && dx < -threshold) {
        track.style.transform = `translateX(${-w}px)`;
        setQueryOpen(true);
      } else if (open && dx > threshold) {
        track.style.transform = `translateX(0px)`;
        setQueryOpen(false);
      } else {
        track.style.transform = `translateX(${open ? -w : 0}px)`;
      }
    };

    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapper.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      wrapper.removeEventListener("touchend", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabBase =
    "rounded-md px-3 py-2.5 text-sm font-medium leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400";
  const tabInactive = "text-stone-600 hover:text-stone-900";
  const tabActive = "bg-[var(--surface)] text-stone-900 shadow-sm shadow-stone-200/50";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-stone-200/90 bg-[var(--background)]/95 backdrop-blur-md">
        <div className="w-full min-w-0 px-4 pb-4 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-md py-1.5 pl-1 pr-2 text-stone-600 transition-colors hover:bg-stone-100/80 hover:text-stone-900"
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
                className="shrink-0"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="min-w-0 truncate text-sm font-medium">
                {t("session.backToSessions")}
              </span>
            </Link>
            <LocaleToggle />
          </div>
          <div
            className="grid grid-cols-2 gap-1.5 rounded-xl bg-stone-200/70 p-1.5"
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

      {/* Swipe viewport */}
      <div ref={wrapperRef} className="relative min-h-0 flex-1 overflow-hidden">
        {/* Track: 200% wide, both panels side by side */}
        <div
          ref={trackRef}
          className="flex h-full w-[200%]"
          style={{ willChange: "transform" }}
        >
          {/* Panel 0 – View */}
          <div className="h-full w-1/2 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {/* Panel 1 – Query: only mount after client hydration to avoid SSR mismatch */}
          <div className="flex h-full w-1/2 min-h-0 flex-col overflow-hidden">
            {mounted && <SessionQueryChat sessionId={id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
