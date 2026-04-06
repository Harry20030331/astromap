"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const [queryOpen, setQueryOpen] = useState(
    () => searchParams.get("query") === "1" || Boolean(pathname?.replace(/\/$/, "").endsWith("/query")),
  );

  // Keep URL in sync (fire-and-forget, does not drive UI — skip initial mount)
  const skipUrlSync = useRef(true);
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const base = `/session/${id}/view`;
    router.replace(queryOpen ? `${base}?query=1` : base, { scroll: false });
  }, [queryOpen, id, router]);

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

  // Track: [View (left)] [Query (right)]
  //   View  (queryOpen=false) → translateX(0)
  //   Query (queryOpen=true)  → translateX(-w)
  // Swipe right-to-left (dx < 0) moves from View into Query
  const pos = (w: number) => (queryOpen ? -w : 0);

  // Set initial position BEFORE first paint (no flash, no transition)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${pos(wrapper.offsetWidth)}px)`;
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
    el.style.transform = `translateX(${pos(w)}px)`;
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

      // open=false (View at 0): dx>0 rubber-band; dx<0 drags toward Query
      // open=true (Query at -w): dx<0 rubber-band; dx>0 drags back toward View
      let raw: number;
      if (!open && dx > 0) {
        raw = dx * 0.15;
      } else if (open && dx < 0) {
        raw = -w + dx * 0.15;
      } else {
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
        // View → swipe right-to-left → Query
        track.style.transform = `translateX(${-w}px)`;
        setQueryOpen(true);
      } else if (open && dx > threshold) {
        // Query → swipe left-to-right → View
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
      <div ref={wrapperRef} className="relative min-h-0 flex-1" style={{ overflow: "hidden" }}>
        <div
          ref={trackRef}
          style={{ display: "flex", height: "100%", willChange: "transform" }}
        >
          {/* Panel 0 – View (left, visible at translateX(0)) */}
          <div style={{ flex: "0 0 100vw", height: "100%", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
            {children}
          </div>
          {/* Panel 1 – Query (right, visible at translateX(-w)) */}
          <div style={{ flex: "0 0 100vw", height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {mounted && <SessionQueryChat sessionId={id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
