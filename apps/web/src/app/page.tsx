"use client";

// Route: / — list saved sessions and create a new natal session from birth form.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  BirthPlacePicker,
  type BirthPlaceValue,
} from "@/components/BirthPlacePicker";
import { apiGet, apiPost } from "@/lib/api";

type SessionSummary = { id: string; label: string; created_at: string | null };

export default function HomePage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("1990-05-15");
  const [birthTime, setBirthTime] = useState("14:30");
  const [place, setPlace] = useState<BirthPlaceValue>({
    city: "London",
    nation: "GB",
    lat: 51.5074,
    lng: -0.1278,
    tzStr: "Europe/London",
  });
  const [placeCommitted, setPlaceCommitted] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const { data: listData, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiGet<{ sessions: SessionSummary[] }>("/sessions"),
  });

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

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          AstraMap
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Astrologer workspace · New natal chart session
        </p>
      </header>

      <section className="rounded-xl border border-stone-200/90 bg-[var(--surface)] p-4 shadow-sm shadow-stone-200/40">
        <h2 className="text-sm font-medium text-stone-800">Birth data</h2>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!placeCommitted) {
              setErr("Please select a birth place from the search results.");
              return;
            }
            createMut.mutate();
          }}
        >
          <label className="block text-xs text-stone-500">
            Name
            <input
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80 placeholder:text-stone-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client or event name"
            />
          </label>
          <label className="block text-xs text-stone-500">
            Date
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label className="block text-xs text-stone-500">
            Time (local)
            <input
              type="time"
              className="mt-1 w-full rounded-md border border-stone-200 bg-[var(--surface)] px-3 py-2 text-sm text-stone-900 shadow-inner shadow-stone-100/80"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </label>
          <BirthPlacePicker
            value={place}
            onChange={setPlace}
            onCommitmentChange={setPlaceCommitted}
            disabled={createMut.isPending}
          />
          {err ? (
            <p className="text-sm text-red-700">{err}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-50 shadow-sm transition-colors hover:bg-stone-900 disabled:opacity-50"
          >
            {createMut.isPending ? "Calculating…" : "Create & View Chart"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium text-stone-800">Sessions</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-stone-500">Loading…</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(listData?.sessions ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-stone-200/90 bg-[var(--surface)] px-3 py-2 shadow-sm shadow-stone-100/60"
              >
                <span className="text-sm font-medium text-stone-900">
                  {s.label}
                </span>
                <span className="flex gap-2 text-sm">
                  <Link
                    className="text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-950"
                    href={`/session/${s.id}/view`}
                  >
                    View
                  </Link>
                  <Link
                    className="text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-950"
                    href={`/session/${s.id}/query`}
                  >
                    Query
                  </Link>
                </span>
              </li>
            ))}
            {(listData?.sessions ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">No sessions yet</p>
            ) : null}
          </ul>
        )}
      </section>
    </main>
  );
}
