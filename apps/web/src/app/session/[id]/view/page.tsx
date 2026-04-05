"use client";

// Route: /session/[id]/view — client-facing chart wheel, facts, optional AI theme hints.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChartWheel } from "@/components/ChartWheel";
import { apiGet, apiPost } from "@/lib/api";

type Features = {
  elements: Record<string, number>;
  modalities: Record<string, number>;
  stelliums: string[];
  aspects: string[];
  house_emphasis: string[];
  dominant_planets: string[];
};

type BodyRow = {
  name: string;
  sign: string;
  house?: string | null;
  retrograde?: boolean | null;
};

type ThemeItem = {
  title: string;
  hints?: string[];
  reading_priority?: string;
};

type ThemesPayload = {
  themes?: ThemeItem[];
  suggested_reading_priorities?: string[];
  generated_at?: string;
};

type SessionRecord = {
  id: string;
  birth: { label?: string; name?: string };
  chart: { svg_wheel: string; bodies: BodyRow[]; houses: unknown[] };
  features: Features;
  themes: ThemesPayload | null;
};

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [themeErr, setThemeErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: () => apiGet<SessionRecord>(`/sessions/${id}`),
    enabled: Boolean(id),
  });

  const themesMut = useMutation({
    mutationFn: () => apiPost<ThemesPayload>(`/sessions/${id}/themes`),
    onSuccess: () => {
      setThemeErr(null);
      qc.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: (e: Error) => setThemeErr(e.message),
  });

  if (isLoading) {
    return (
      <main className="p-4">
        <p className="text-sm text-zinc-500">加载中…</p>
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="p-4">
        <p className="text-sm text-red-600">无法加载会话</p>
        <Link href="/" className="mt-2 inline-block text-sm text-blue-600 underline">
          返回首页
        </Link>
      </main>
    );
  }

  const f = data.features;
  const title = data.birth.label || data.birth.name || "星盘";

  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-24">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-xs text-zinc-500">View · 可与客户分享的结构信息</p>
        </div>
        <Link
          href={`/session/${id}/query`}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        >
          问询
        </Link>
      </header>

      <ChartWheel svg={data.chart.svg_wheel} />

      <details className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
        <summary className="cursor-pointer text-sm font-medium text-amber-950 dark:text-amber-100">
          主题提示（AI 辅助，非结论）
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            以下为建议性摘要，解读权始终在占星师与案主之间。
          </p>
          <button
            type="button"
            disabled={themesMut.isPending}
            onClick={() => themesMut.mutate()}
            className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-amber-50 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950"
          >
            {themesMut.isPending ? "生成中…" : data.themes ? "重新生成" : "生成主题"}
          </button>
          {themeErr ? (
            <p className="text-xs text-red-600 dark:text-red-400">{themeErr}</p>
          ) : null}
          {data.themes?.themes && data.themes.themes.length > 0 ? (
            <ul className="space-y-3">
              {data.themes.themes.map((t) => (
                <li
                  key={t.title}
                  className="rounded-lg border border-amber-200/60 bg-white/80 p-2 dark:border-amber-900/40 dark:bg-zinc-950/60"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {t.title}
                  </p>
                  {t.reading_priority ? (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      优先：{t.reading_priority}
                    </p>
                  ) : null}
                  {t.hints && t.hints.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-xs text-zinc-700 dark:text-zinc-300">
                      {t.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">
              点击「生成主题」获取 3–5 条简短主题提示。
            </p>
          )}
          {data.themes?.suggested_reading_priorities &&
          data.themes.suggested_reading_priorities.length > 0 ? (
            <div className="text-xs text-zinc-700 dark:text-zinc-300">
              <p className="font-medium">整体优先</p>
              <ul className="mt-1 list-inside list-disc">
                {data.themes.suggested_reading_priorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>

      <section className="mt-6 space-y-4">
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">元素</h2>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {Object.entries(f.elements).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">模式</h2>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {Object.entries(f.modalities).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
        {f.stelliums.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium">群聚 / Stellium</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
              {f.stelliums.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">宫位强调</h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {f.house_emphasis.join(" · ") || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">主导行星（按相位参与度）</h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {f.dominant_planets.join(", ")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">主要相位（筛选）</h2>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-zinc-700 dark:text-zinc-300">
            {f.aspects.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">落点（简要）</h2>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs text-zinc-700 dark:text-zinc-300">
            {data.chart.bodies.map((b) => (
              <li key={b.name}>
                {b.name} · {b.sign} · {b.house ?? "—"}
                {b.retrograde ? " · R" : ""}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-[var(--background)] px-4 py-3 dark:border-zinc-800">
        <Link href="/" className="text-sm text-blue-600 underline dark:text-blue-400">
          返回会话列表
        </Link>
      </nav>
    </main>
  );
}
