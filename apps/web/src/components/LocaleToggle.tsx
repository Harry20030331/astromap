"use client";

import { useI18n } from "@/lib/i18n";

export function LocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-[var(--surface)] px-2 py-1 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-100 hover:text-stone-900"
      aria-label={t("lang.switchAria")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      {t("lang.toggle")}
    </button>
  );
}
