"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

const MIN_LEN = 2;
const DEBOUNCE_MS = 350;

export type BirthPlaceValue = {
  city: string;
  nation: string | null;
  lat: number;
  lng: number;
  tzStr: string;
};

type CityHit = {
  name: string;
  admin_name: string | null;
  country_code: string | null;
  country_name: string | null;
  lat: number;
  lng: number;
};

type BirthPlacePickerProps = {
  value: BirthPlaceValue;
  onChange: (v: BirthPlaceValue) => void;
  /** false when user is typing a place query but has not picked a suggestion. */
  onCommitmentChange?: (committed: boolean) => void;
  disabled?: boolean;
};

function formatSuggestionLabel(hit: CityHit): string {
  const admin = hit.admin_name ? `, ${hit.admin_name}` : "";
  const cc = hit.country_name || hit.country_code || "";
  const tail = cc ? ` (${cc})` : "";
  return `${hit.name}${admin}${tail}`;
}

export function BirthPlacePicker({
  value,
  onChange,
  onCommitmentChange,
  disabled = false,
}: BirthPlacePickerProps) {
  const [input, setInput] = useState("");
  const [hits, setHits] = useState<CityHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const applyHit = useCallback(
    async (hit: CityHit) => {
      const label = formatSuggestionLabel(hit);
      setSelectedLabel(label);
      setInput(label);
      setHits([]);
      setSearchErr(null);
      onCommitmentChange?.(true);
      try {
        const tz = await apiGet<{ tz_str: string }>(
          `/geo/timezone?lat=${encodeURIComponent(String(hit.lat))}&lng=${encodeURIComponent(String(hit.lng))}`,
        );
        onChange({
          city: hit.name,
          nation: hit.country_code?.toUpperCase() ?? null,
          lat: hit.lat,
          lng: hit.lng,
          tzStr: tz.tz_str,
        });
      } catch (e) {
        onChange({
          city: hit.name,
          nation: hit.country_code?.toUpperCase() ?? null,
          lat: hit.lat,
          lng: hit.lng,
          tzStr: value.tzStr,
        });
        setSearchErr(e instanceof Error ? e.message : "Time zone lookup failed");
      }
    },
    [onChange, onCommitmentChange, value.tzStr],
  );

  const emitCommitment = useCallback(
    (term: string) => {
      if (disabled) {
        onCommitmentChange?.(true);
        return;
      }
      const t = term.trim();
      if (t.length < MIN_LEN) {
        onCommitmentChange?.(true);
        return;
      }
      const matchesSelection = Boolean(selectedLabel && t === selectedLabel.trim());
      onCommitmentChange?.(matchesSelection);
    },
    [disabled, onCommitmentChange, selectedLabel],
  );

  useEffect(() => {
    if (disabled) {
      setHits([]);
      setLoading(false);
      return;
    }

    const term = input.trim();
    const isSameAsSelection = selectedLabel && term === selectedLabel.trim();
    if (term.length < MIN_LEN || isSameAsSelection) {
      setHits([]);
      setSearchErr(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSearchErr(null);
    const t = window.setTimeout(() => {
      apiGet<{ cities: CityHit[] }>(
        `/geo/cities?q=${encodeURIComponent(term)}`,
      )
        .then((data) => {
          if (cancelled) return;
          setHits(data.cities ?? []);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setLoading(false);
          setHits([]);
          setSearchErr(e instanceof Error ? e.message : "Place search failed");
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [input, disabled, selectedLabel]);

  useEffect(() => {
    emitCommitment(input);
  }, [input, emitCommitment]);

  const showPanel = loading || searchErr !== null || hits.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col gap-1">
        <label className="text-xs text-stone-500">
          Birth Place
          <div className="relative mt-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              aria-hidden
            >
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
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              className="w-full rounded-md border border-stone-200 bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-stone-900 shadow-inner shadow-stone-100/80 placeholder:text-stone-400"
              value={input}
              disabled={disabled}
              placeholder="e.g. Beijing, Paris"
              autoComplete="off"
              onChange={(e) => {
                setSelectedLabel(null);
                setInput(e.target.value);
              }}
            />
          </div>
        </label>
        {showPanel ? (
          <div className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-stone-200/90 bg-[var(--surface)] text-sm shadow-lg shadow-stone-200/50">
            {loading ? (
              <div className="px-3 py-2 text-stone-500">Searching…</div>
            ) : null}
            {searchErr ? (
              <div className="px-3 py-2 text-red-700">{searchErr}</div>
            ) : null}
            {!loading &&
              hits.map((h) => (
                <button
                  key={`${h.name}-${h.lat}-${h.lng}-${h.country_code ?? ""}`}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 border-b border-stone-100 px-3 py-2 text-left last:border-0 hover:bg-stone-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void applyHit(h)}
                >
                  <span className="font-medium text-stone-900">
                    {formatSuggestionLabel(h)}
                  </span>
                  <span className="text-xs text-stone-500">
                    {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                  </span>
                </button>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
