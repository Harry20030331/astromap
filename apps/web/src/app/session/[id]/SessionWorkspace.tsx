"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { SessionView } from "@/components/session/SessionView";
import { SessionQueryChat } from "@/components/session/SessionQueryChat";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useI18n } from "@/lib/i18n";

// children is passed by Next.js layout but not rendered here —
// both panels are always in the DOM so swipe gestures work seamlessly.
export default function SessionWorkspace({ children: _children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();
  const router = useRouter();

  // Derive active panel from URL — single source of truth, never out-of-sync.
  const queryOpen = Boolean(pathname?.replace(/\/$/, "").endsWith("/query"));

  // SessionQueryChat reads localStorage in its useState initializer, which causes a
  // hydration mismatch (server has no localStorage, client does). Guard it with mounted
  // so it is never SSR-ed — the panel div itself still exists for swipe gestures.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep a ref that gesture handlers (created once) can always read fresh values from.
  const queryOpenRef = useRef(queryOpen);
  useEffect(() => {
    queryOpenRef.current = queryOpen;
  });

  // Swipe gesture: only View→Query (swipe left) and Query→View (swipe right) are allowed.
  // The opposite directions rubber-band to signal the boundary.
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

      // View (open=false): block rightward swipe (dx>0), allow leftward (dx<0)
      // Query (open=true): block leftward swipe (dx<0), allow rightward (dx>0)
      let raw: number;
      if (!open && dx > 0) {
        raw = dx * 0.12; // rubber-band — can't swipe right on View
      } else if (open && dx < 0) {
        raw = -w + dx * 0.12; // rubber-band — can't swipe left on Query
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
        // View → swipe left → Query
        track.style.transform = `translateX(${-w}px)`;
        router.push(`/session/${id}/query`);
      } else if (open && dx > threshold) {
        // Query → swipe right → View
        track.style.transform = `translateX(0px)`;
        router.push(`/session/${id}/view`);
      } else {
        // Not far enough — snap back
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
  }, [id, router]);

  // Keep the swipe track aligned with the URL. Touch handlers write transform in px; React
  // previously mixed in translateX(-100vw), which can diverge from the wrapper width. Without
  // a layout sync, route/tab can say "view" while the track is still offset to the query panel
  // (e.g. after gesture + navigation edge cases or bf-cache restore).
  useLayoutEffect(() => {
    const track = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!track || !wrapper) return;

    const apply = () => {
      const w = wrapper.offsetWidth;
      if (!w) return;
      track.style.transition = "";
      track.style.transform = queryOpen ? `translateX(${-w}px)` : "translateX(0)";
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [queryOpen]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const track = trackRef.current;
      const wrapper = wrapperRef.current;
      if (!track || !wrapper) return;
      const w = wrapper.offsetWidth;
      if (!w) return;
      track.style.transition = "";
      track.style.transform = queryOpenRef.current ? `translateX(${-w}px)` : "translateX(0)";
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
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
              onClick={() => router.push(`/session/${id}/view`)}
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
              onClick={() => router.push(`/session/${id}/query`)}
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

      {/* Swipe viewport — both panels always in DOM */}
      <div ref={wrapperRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={trackRef}
          style={{
            display: "flex",
            height: "100%",
            willChange: "transform",
          }}
        >
          {/* Panel 0 – View (left) */}
          <div style={{ flex: "0 0 100vw", height: "100%", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
            <SessionView sessionId={id} />
          </div>
          {/* Panel 1 – Query (right) */}
          <div style={{ flex: "0 0 100vw", height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {mounted && <SessionQueryChat sessionId={id} queryPanelActive={queryOpen} />}
          </div>
        </div>
      </div>
    </div>
  );
}
