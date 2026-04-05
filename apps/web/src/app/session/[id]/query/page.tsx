"use client";

// Route: /session/[id]/query — practitioner workspace; dictation via OpenAI Whisper (upload from MediaRecorder).
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiPost, apiPostFormData } from "@/lib/api";

// Quick-insert labels for the query field (Chinese UI copy).
const SUGGESTED_TOPICS = [
  "感情与关系",
  "事业与公众形象",
  "家庭与内在安全",
  "沟通与学习",
];

type QueryResponse = {
  relevant_structures?: string[];
  interpretation_hints?: string[];
  suggested_questions?: string[];
};

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

export default function QueryPage() {
  const params = useParams();
  const id = params.id as string;
  const [text, setText] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const queryMut = useMutation({
    mutationFn: (q: string) =>
      apiPost<QueryResponse>(`/sessions/${id}/query`, { text: q }),
    onSuccess: (data) => {
      setErr(null);
      setResult(data);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = async () => {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("当前浏览器不支持麦克风录音。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        setErr("录音出错，请重试。");
        setRecording(false);
        stopTracks();
      };
      mr.start(200);
      setRecording(true);
    } catch {
      setErr("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") {
      setRecording(false);
      stopTracks();
      return;
    }

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    setRecording(false);
    stopTracks();
    mediaRecorderRef.current = null;

    const mime = mr.mimeType || "audio/webm";
    const ext = mime.includes("mp4") ? "m4a" : "webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    if (blob.size < 256) {
      setErr("录音太短，请长按多说几句。");
      return;
    }

    setTranscribing(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, `recording.${ext}`);
      const { text: t } = await apiPostFormData<{ text: string }>(
        `/sessions/${id}/transcribe`,
        fd,
      );
      if (t) setText((prev) => (prev ? `${prev} ${t}` : t));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "语音识别失败。");
    } finally {
      setTranscribing(false);
    }
  };

  const voiceBusy = recording || transcribing;

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-4 px-4 py-6 pb-28">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">问询</h1>
          <p className="text-xs text-zinc-500">
            私密工作区 · 语音经 OpenAI Whisper 转写后进入同一问询流程
          </p>
        </div>
        <Link
          href={`/session/${id}/view`}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        >
          查看星盘
        </Link>
      </header>

      <section className="flex flex-wrap gap-2">
        <span className="w-full text-xs text-zinc-500">快速主题</span>
        {SUGGESTED_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setText(t)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
          >
            {t}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs text-zinc-500">
          问询内容
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：案主在感情里犹豫、拖延…"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              disabled={voiceBusy}
              onClick={() => void startRecording()}
              className="rounded-lg border border-zinc-400 px-3 py-2 text-sm dark:border-zinc-500"
            >
              {transcribing ? "识别中…" : "开始录音"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopRecordingAndTranscribe()}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
            >
              停止并识别
            </button>
          )}
          <button
            type="button"
            disabled={queryMut.isPending || !text.trim()}
            onClick={() => queryMut.mutate(text.trim())}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {queryMut.isPending ? "分析中…" : "发送问询"}
          </button>
        </div>
        {err ? (
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}
      </section>

      {result ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium">相关结构</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
              {(result.relevant_structures ?? []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium">解读提示</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
              {(result.interpretation_hints ?? []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <h2 className="text-sm font-medium">建议追问</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
              {(result.suggested_questions ?? []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-[var(--background)] px-4 py-3 dark:border-zinc-800">
        <Link href="/" className="text-sm text-blue-600 underline dark:text-blue-400">
          返回会话列表
        </Link>
      </nav>
    </main>
  );
}
