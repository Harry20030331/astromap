"use client";

// Route: / — new client form; history opens from header control.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BirthPlacePicker,
  type BirthPlaceValue,
} from "@/components/BirthPlacePicker";
import { LogoStar } from "@/components/LogoStar";
import { LocaleToggle } from "@/components/LocaleToggle";
import { LandingPage } from "@/components/LandingPage";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/app/providers";

type SessionSummary = { id: string; label: string; created_at: string | null };

type SessionBirth = {
  label?: string | null;
  name?: string | null;
  birth_date?: string;
  birth_time?: string;
  tz_str?: string;
  lat?: number;
  lng?: number;
  city?: string | null;
  nation?: string | null;
};

function birthTimeForInput(raw: string | undefined): string {
  const m = (raw ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "12:00";
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const { session, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("2000-01-01");
  const [birthTime, setBirthTime] = useState("12:00");
  const [place, setPlace] = useState<BirthPlaceValue>({
    city: "London",
    nation: "GB",
    lat: 51.5074,
    lng: -0.1278,
    tzStr: "Europe/London",
  });
  const [placeCommitted, setPlaceCommitted] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [birthPlaceSyncSeq, setBirthPlaceSyncSeq] = useState(0);
  const birthFormRef = useRef<HTMLElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<SessionSummary | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [pendingSignOut, setPendingSignOut] = useState(false);

  const { data: listData, isLoading, isError: isSessionsError } = useQuery({
    queryKey: ["sessions", session?.user?.id],
    queryFn: () => apiGet<{ sessions: SessionSummary[] }>("/sessions"),
    enabled: !!session,
  });

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const createMut = useMutation({
    mutationFn: () =>
      apiPost<{
        session_id: string;
      }>("/sessions", {
        label: name || undefined,
        birth_date: birthDate,
        birth_time: birthTime,
        tz_str: place.tzStr,
        lat: place.lat,
        lng: place.lng,
        city: place.city === "Unknown" ? undefined : place.city,
        nation: place.nation ?? undefined,
      }),
    onSuccess: (d) => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      window.location.href = `/session/${d.session_id}/view`;
    },
    onError: (e: Error) => setErr(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (sessionId: string) => apiDelete(`/sessions/${sessionId}`),
    onSuccess: () => {
      setDeleteErr(null);
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => setDeleteErr(e.message || t("home.deleteFailed")),
  });

  const editMut = useMutation({
    mutationFn: async (sessionId: string) => {
      const rec = await apiGet<{ birth?: SessionBirth }>(`/sessions/${sessionId}`);
      const birth = rec.birth;
      if (!birth?.birth_date || birth.tz_str == null || birth.lat == null || birth.lng == null) {
        throw new Error(t("home.editFailed"));
      }
      await apiDelete(`/sessions/${sessionId}`);
      return birth;
    },
    onSuccess: (birth) => {
      setEditErr(null);
      setErr(null);
      setName((birth.label ?? birth.name ?? "").trim());
      setBirthDate(birth.birth_date!);
      setBirthTime(birthTimeForInput(birth.birth_time));
      const nat = birth.nation?.trim().toUpperCase();
      setPlace({
        city: birth.city?.trim() || "Unknown",
        nation: nat && nat !== "XX" ? nat : null,
        lat: birth.lat!,
        lng: birth.lng!,
        tzStr: birth.tz_str!,
      });
      setPlaceCommitted(true);
      setBirthPlaceSyncSeq((n) => n + 1);
      setDrawerOpen(false);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      requestAnimationFrame(() => {
        birthFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onError: (e: Error) => setEditErr(e.message || t("home.editFailed")),
  });

  const sessions = listData?.sessions ?? [];

  const sessionLabel = (s: SessionSummary) =>
    s.label?.trim() ? s.label : t("home.unnamedSession");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <LandingPage onSignIn={signInWithGoogle} />;
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-12 px-4 pb-10 pt-20">
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-session-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
            aria-label={t("home.cancel")}
            onClick={() => {
              setPendingDelete(null);
              setDeleteErr(null);
            }}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-stone-200/90 bg-[var(--surface)] p-4 shadow-xl shadow-stone-300/40">
            <h2
              id="delete-session-title"
              className="text-base font-semibold text-stone-900"
            >
              {t("home.deleteSessionTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {t("home.deleteSessionBody")}
            </p>
            <p className="mt-1 text-sm font-medium text-stone-800">
              {sessionLabel(pendingDelete)}
            </p>
            {deleteErr ? (
              <p className="mt-2 text-sm text-red-700">{deleteErr}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
                onClick={() => {
                  setPendingDelete(null);
                  setDeleteErr(null);
                }}
              >
                {t("home.cancel")}
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-800 disabled:opacity-50"
                onClick={() => deleteMut.mutate(pendingDelete.id)}
              >
                {deleteMut.isPending ? t("home.loading") : t("home.deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingSignOut ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px]"
            aria-label={t("home.cancel")}
            onClick={() => setPendingSignOut(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-stone-200/90 bg-[var(--surface)] p-4 shadow-xl shadow-stone-300/40">
            <h2
              id="signout-dialog-title"
              className="text-base font-semibold text-stone-900"
            >
              {t("home.signOutTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {t("home.signOutBody")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
                onClick={() => setPendingSignOut(false)}
              >
                {t("home.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-900"
                onClick={() => {
                  setPendingSignOut(false);
                  signOut();
                }}
              >
                {t("home.signOutConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <LogoStar size={36} className="shrink-0" />
            <h1
              className="min-w-0 text-3xl font-light italic leading-none tracking-[0.08em]"
              style={{
                fontFamily:
                  "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif",
                color: "#292524",
                textShadow:
                  "0 1px 0 rgba(255,255,255,0.85), 0 0 28px rgba(196,138,48,0.12)",
              }}
            >
              AstraMap
            </h1>
          </div>
          <p className="pl-[calc(36px+0.25rem)] text-sm leading-snug text-stone-500">
            {t("home.subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <LocaleToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-stone-200/90 bg-[var(--surface)] p-2 text-stone-500 shadow-sm shadow-stone-100/60 transition-colors hover:border-stone-300 hover:bg-stone-50/90 hover:text-stone-800"
            aria-label={t("home.pastSessions")}
            onClick={() => setDrawerOpen(true)}
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-stone-200/90 bg-[var(--surface)] p-2 text-stone-500 shadow-sm shadow-stone-100/60 transition-colors hover:border-stone-300 hover:bg-stone-50/90 hover:text-stone-800"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => setPendingSignOut(true)}
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── History drawer ── */}
      <div
        className={`fixed inset-0 z-[100] transition-colors duration-300 ${drawerOpen ? "pointer-events-auto bg-stone-900/30 backdrop-blur-[2px]" : "pointer-events-none bg-transparent"}`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className="absolute inset-0"
          tabIndex={-1}
          aria-label={t("home.cancel")}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col border-l border-stone-200/80 bg-[var(--surface)] shadow-2xl shadow-stone-400/20 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label={t("home.pastSessions")}
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-stone-900">
              {t("home.pastSessions")}
            </h2>
            <button
              type="button"
              className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label={t("home.cancel")}
              onClick={() => setDrawerOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">
                {t("home.loading")}
              </p>
            ) : isSessionsError ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">
                {t("home.loadSessionsFailed")}
              </p>
            ) : sessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">
                {t("home.noSessions")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center border-b border-stone-100/80 last:border-b-0"
                  >
                    <Link
                      href={`/session/${s.id}/view`}
                      className="min-w-0 flex-1 px-4 py-2.5 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-50"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <span className="block truncate">{sessionLabel(s)}</span>
                    </Link>
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center rounded-md p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40"
                      aria-label={t("home.editSessionAria")}
                      disabled={editMut.isPending || createMut.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditErr(null);
                        editMut.mutate(s.id);
                      }}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center rounded-md p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700"
                      aria-label={t("home.deleteSessionAria")}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteErr(null);
                        setPendingDelete(s);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* ── Tagline ── */}
      <section className="relative flex flex-col items-center overflow-hidden py-3">
        <style>{`
          @keyframes tagline-enter {
            from { opacity: 0; transform: translateY(10px) scale(0.97); filter: blur(4px); }
            to   { opacity: 1; transform: translateY(0) scale(1);    filter: blur(0); }
          }
          @keyframes tagline-shimmer {
            0%   { background-position: -150% center; }
            100% { background-position: 250% center; }
          }
          @keyframes tagline-glow {
            0%, 100% { text-shadow: 0 0 8px rgba(120,113,108,0); }
            50%      { text-shadow: 0 0 20px rgba(120,113,108,0.28); }
          }
          @keyframes tagline-rule {
            from { transform: scaleX(0); opacity: 0; }
            to   { transform: scaleX(1); opacity: 1; }
          }
          .tagline-text {
            background: linear-gradient(
              90deg,
              #78716c 0%, #78716c 38%,
              #c9a96e 47%, #f5deb3 50%, #c9a96e 53%,
              #78716c 62%, #78716c 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation:
              tagline-enter 0.9s cubic-bezier(.22,1,.36,1) both,
              tagline-shimmer 6s 2s ease-in-out infinite,
              tagline-glow 6s 2s ease-in-out infinite;
          }
          .tagline-rule {
            animation: tagline-rule 0.8s 0.5s cubic-bezier(.22,1,.36,1) both;
            transform-origin: center;
          }
        `}</style>
        <div className="flex w-full items-center gap-3">
          <span className="tagline-rule h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <p className="tagline-text whitespace-nowrap text-center text-2xl font-light italic tracking-[0.18em] text-stone-600 sm:text-3xl"
             style={{ fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif" }}>
            Your stars, decoded.
          </p>
          <span className="tagline-rule h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        </div>
      </section>

      <section
        ref={birthFormRef}
        className="rounded-xl border border-stone-200/90 bg-[var(--surface)] p-4 shadow-sm shadow-stone-200/40"
      >
        <h2 className="text-center text-base font-semibold text-stone-800">
          {t("home.birthData")}
        </h2>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!placeCommitted) {
              setErr(t("home.selectPlace"));
              return;
            }
            createMut.mutate();
          }}
        >
          <label className="block text-xs text-stone-500">
            {t("home.name")}
            <input
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-xs text-stone-500">
            {t("home.date")}
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label className="block text-xs text-stone-500">
            {t("home.timeLocal")}
            <input
              type="time"
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </label>
          <BirthPlacePicker
            key={birthPlaceSyncSeq}
            value={place}
            onChange={setPlace}
            onCommitmentChange={setPlaceCommitted}
            disabled={createMut.isPending || editMut.isPending}
            seedDisplayFromValue={birthPlaceSyncSeq > 0}
          />
          {editErr ? (
            <p className="text-sm text-red-700">{editErr}</p>
          ) : null}
          {err ? (
            <p className="text-sm text-red-700">{err}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMut.isPending || editMut.isPending}
            className="rounded-lg bg-[#8B5C3D] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#744a32] disabled:opacity-50"
          >
            {createMut.isPending ? t("home.calculating") : t("home.createChart")}
          </button>
        </form>
      </section>
    </main>
  );
}
