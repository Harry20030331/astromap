"use client";

// Route: / — list saved sessions and create a new natal session from birth form.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type SessionSummary = { id: string; label: string; created_at: string | null };

export default function HomePage() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [birthDate, setBirthDate] = useState("1990-05-15");
  const [birthTime, setBirthTime] = useState("14:30");
  const [tzStr, setTzStr] = useState("Europe/London");
  const [lat, setLat] = useState("51.5074");
  const [lng, setLng] = useState("-0.1278");
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
        label: label || undefined,
        birth_date: birthDate,
        birth_time: birthTime,
        tz_str: tzStr,
        lat: Number(lat),
        lng: Number(lng),
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
        <h1 className="text-2xl font-semibold tracking-tight">AstraMap</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          占星师工作台 · 新建本命盘会话
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          出生数据
        </h2>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate();
          }}
        >
          <label className="block text-xs text-zinc-500">
            标签（可选）
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="客户或事件名"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            日期
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            时间（本地）
            <input
              type="time"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            />
          </label>
          <label className="block text-xs text-zinc-500">
            时区（IANA）
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={tzStr}
              onChange={(e) => setTzStr(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-zinc-500">
              纬度
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label className="block text-xs text-zinc-500">
              经度
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
          </div>
          {err ? (
            <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {createMut.isPending ? "计算中…" : "创建并查看星盘"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          会话列表
        </h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-zinc-500">加载中…</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(listData?.sessions ?? []).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="flex gap-2 text-sm">
                  <Link
                    className="text-blue-600 underline dark:text-blue-400"
                    href={`/session/${s.id}/view`}
                  >
                    查看
                  </Link>
                  <Link
                    className="text-blue-600 underline dark:text-blue-400"
                    href={`/session/${s.id}/query`}
                  >
                    问询
                  </Link>
                </span>
              </li>
            ))}
            {(listData?.sessions ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">暂无会话</p>
            ) : null}
          </ul>
        )}
      </section>
    </main>
  );
}
