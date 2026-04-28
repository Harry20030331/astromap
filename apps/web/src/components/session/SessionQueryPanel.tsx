"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { apiPost, apiPostFormData } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const SUGGESTED_TOPICS = [
  "Love & relationships",
  "Career & public image",
  "Home & emotional security",
  "Communication & learning",
];

type QueryResponse = {
  response_mode?: "structured" | "direct";
  direct_answer?: string;
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

const resultCardClass =
  "rounded-xl border border-stone-200/90 bg-[var(--surface)] p-3 shadow-sm shadow-stone-100/50";

export function SessionQueryPanel({ sessionId }: { sessionId: string }) {
  const { locale } = useI18n();
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
      apiPost<QueryResponse>(`/sessions/${sessionId}/query`, { text: q, locale }),
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
      setErr("This browser does not support microphone recording.");
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
        setErr("Recording error. Please try again.");
        setRecording(false);
        stopTracks();
      };
      mr.start(200);
      setRecording(true);
    } catch {
      setErr("Could not access the microphone. Check your permissions.");
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
      setErr("Recording too short. Hold the button and speak a bit longer.");
      return;
    }

    setTranscribing(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, `recording.${ext}`);
      const { text: t } = await apiPostFormData<{ text: string }>(
        `/sessions/${sessionId}/transcribe`,
        fd,
      );
      if (t) setText((prev) => (prev ? `${prev} ${t}` : t));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Speech recognition failed.");
    } finally {
      setTranscribing(false);
    }
  };

  const voiceBusy = recording || transcribing;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap gap-2">
        <span className="w-full text-xs text-stone-500">Quick topics</span>
        {SUGGESTED_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setText(t)}
            className="rounded-full border border-stone-200 bg-stone-50/80 px-3 py-1 text-xs text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100"
          >
            {t}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-xs text-stone-500">
          Your question
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-xl border border-stone-200 bg-[var(--surface)] p-3 text-sm text-stone-900 shadow-inner shadow-stone-100/80 placeholder:text-stone-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. The client feels stuck or hesitant in relationships…"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <button
              type="button"
              disabled={voiceBusy}
              onClick={() => void startRecording()}
              className="rounded-lg border border-stone-300 bg-[var(--surface)] px-3 py-2 text-sm text-stone-800 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-50"
            >
              {transcribing ? "Transcribing…" : "Start recording"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopRecordingAndTranscribe()}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 shadow-sm transition-colors hover:bg-red-100/80"
            >
              Stop & transcribe
            </button>
          )}
          <button
            type="button"
            disabled={queryMut.isPending || !text.trim()}
            onClick={() => queryMut.mutate(text.trim())}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-stone-50 shadow-sm transition-colors hover:bg-stone-900 disabled:opacity-50"
          >
            {queryMut.isPending ? "Analyzing…" : "Send query"}
          </button>
        </div>
        {err ? (
          <p className="text-sm text-red-700">{err}</p>
        ) : null}
      </section>

      {result ? (
        <section className="space-y-4 pb-2">
          {(result.response_mode === "direct" || result.direct_answer) && (
            <div className={resultCardClass}>
              <h3 className="text-sm font-medium text-stone-900">Direct answer</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {result.direct_answer}
              </p>
            </div>
          )}
          {result.response_mode !== "direct" && (
            <>
              <div className={resultCardClass}>
                <h3 className="text-sm font-medium text-stone-900">Relevant structures</h3>
                <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
                  {(result.relevant_structures ?? []).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className={resultCardClass}>
                <h3 className="text-sm font-medium text-stone-900">Interpretation hints</h3>
                <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
                  {(result.interpretation_hints ?? []).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className={resultCardClass}>
                <h3 className="text-sm font-medium text-stone-900">Suggested follow-ups</h3>
                <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
                  {(result.suggested_questions ?? []).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
