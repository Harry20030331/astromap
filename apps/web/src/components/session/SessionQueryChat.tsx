"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPostFormData, authHeaders } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { LogoStar } from "@/components/LogoStar";
import { useI18n } from "@/lib/i18n";

const SUGGESTION_CHIPS = [
  { labelKey: "chat.chipChartOverview" },
  { labelKey: "chat.chipLifeDirection" },
  { labelKey: "chat.chipLoveRelationships" },
  { labelKey: "chat.chipCareerAmbition" },
  { labelKey: "chat.chipFamilyHome" },
  { labelKey: "chat.chipStrengthsChallenges" },
];

type QueryResponse = {
  relevant_structures?: string[];
  interpretation_hints?: string[];
  suggested_questions?: string[];
  /** Per-structure prose interpretations keyed by structure name */
  structure_details?: Record<string, string>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  response?: QueryResponse;
  /** Set while SSE tokens are arriving; omitted once the response is finalized */
  streamBuffer?: string;
};

type SseEvent =
  | { type: "delta"; content: string }
  | {
      type: "complete";
      response: QueryResponse;
      model?: string;
      system_prompt?: string;
      user_prompt?: string;
      raw_output?: string;
    }
  | { type: "error"; message: string };

function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx === -1) break;
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let payload = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) {
        payload += line.slice(5).trimStart();
      }
    }
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload) as SseEvent);
    } catch {
      // ignore malformed SSE payloads
    }
  }
  return { events, rest };
}

function parseSseTrailing(rest: string): SseEvent | null {
  const t = rest.trim();
  if (!t.startsWith("data:")) return null;
  try {
    return JSON.parse(t.slice(5).trim()) as SseEvent;
  } catch {
    return null;
  }
}

type StreamSection = {
  key: "relevant_structures" | "interpretation_hints" | "suggested_questions";
  label: string;
  bullets: string[];
  /** true once we've seen the next section header (this section is fully received) */
  done: boolean;
};

/**
 * Parse an in-progress markdown string into a list of sections.
 * The last section (if the stream is ongoing) will have `done: false` and its
 * last bullet may be incomplete (no trailing newline yet).
 */
function parseStreamingMarkdown(md: string): StreamSection[] {
  const sections: StreamSection[] = [];
  let current: StreamSection | null = null;

  const sectionFor = (title: string): StreamSection["key"] | null => {
    const t = title.toLowerCase();
    if (t.includes("structure") && !t.includes("detail")) return "relevant_structures";
    if (t.includes("interpretation")) return "interpretation_hints";
    if (t.includes("follow")) return "suggested_questions";
    return null;
  };

  const LABELS: Record<StreamSection["key"], string> = {
    relevant_structures: "Chart Structures",
    interpretation_hints: "Interpretation",
    suggested_questions: "Suggested Follow-ups",
  };

  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const h3 = trimmed.match(/^###\s+(.+)$/i);
    if (h3) {
      if (current) {
        current.done = true;
      }
      const key = sectionFor(h3[1]);
      if (key) {
        current = { key, label: LABELS[key], bullets: [], done: false };
        sections.push(current);
      } else {
        current = null;
      }
      continue;
    }
    if ((trimmed.startsWith("- ") || trimmed.startsWith("* ")) && current) {
      const text = trimmed.slice(2).trim();
      if (text) current.bullets.push(text);
      continue;
    }
    // Partial bullet line (no "- " prefix yet but we're in a section context)
    // — ignore; wait for the next newline to complete it
  }
  return sections;
}

function persistableMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.streamBuffer === undefined);
}

function storageKey(sessionId: string) {
  return `aiastro-chat-${sessionId}`;
}

function loadHistory(sessionId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveHistory(sessionId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(messages));
  } catch {
    // ignore storage quota errors
  }
}

function pickRecorderMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function SessionQueryChat({
  sessionId,
  queryPanelActive = true,
}: {
  sessionId: string;
  /** false when the swipe panel is off-screen (user on /view). Prevents scrollIntoView from scrolling ancestors and revealing the chat column. */
  queryPanelActive?: boolean;
}) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(sessionId));
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: sessionData } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () =>
      apiGet<{
        birth: { label?: string; name?: string };
        structure_interpretations?: Record<string, string>;
      }>(`/sessions/${sessionId}`),
    enabled: Boolean(sessionId),
  });

  const personName = sessionData?.birth?.label ?? sessionData?.birth?.name ?? "this chart";
  const structureInterpretations = sessionData?.structure_interpretations ?? {};

  useEffect(() => {
    saveHistory(sessionId, persistableMessages(messages));
  }, [messages, sessionId]);

  useEffect(() => {
    if (!queryPanelActive) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, queryPanelActive]);

  const [queryPending, setQueryPending] = useState(false);
  const queryPendingRef = useRef(false);

  const sendQuery = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || queryPendingRef.current) return;

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: trimmed, timestamp: Date.now() },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          streamBuffer: "",
        },
      ]);
      setText("");
      setErr(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      queryPendingRef.current = true;
      setQueryPending(true);
      void (async () => {
        const applyStreamEvents = (events: SseEvent[]) => {
          for (const ev of events) {
            if (ev.type === "delta" && ev.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, streamBuffer: (m.streamBuffer ?? "") + ev.content }
                    : m,
                ),
              );
            } else if (ev.type === "complete") {
              console.groupCollapsed(
                "[aiastrology] /query/stream — model, prompts, raw output",
              );
              console.info("model:", ev.model ?? "(not reported; redeploy API)");
              console.info("system_prompt:\n", ev.system_prompt ?? "(missing)");
              console.info("user_prompt:\n", ev.user_prompt ?? "(missing)");
              console.info("raw_output (model text):\n", ev.raw_output ?? "(missing)");
              console.groupEnd();
              setErr(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        response: ev.response,
                        streamBuffer: undefined,
                      }
                    : m,
                ),
              );
            } else if (ev.type === "error") {
              throw new Error(ev.message);
            }
          }
        };

        try {
          const auth = await authHeaders();
          const res = await fetch(
            `${API_URL}/sessions/${sessionId}/query/stream`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...auth },
              body: JSON.stringify({ text: trimmed, locale }),
            },
          );
          if (!res.ok) {
            const t = await res.text();
            throw new Error(t || `${res.status}`);
          }
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let raw = "";
          while (true) {
            const { done, value } = await reader.read();
            if (value) {
              raw += decoder.decode(value, { stream: true });
            }
            const { events, rest } = parseSseBuffer(raw);
            raw = rest;
            applyStreamEvents(events);
            if (done) break;
          }
          const flushed = parseSseBuffer(raw);
          applyStreamEvents(flushed.events);
          const trailing = parseSseTrailing(flushed.rest);
          if (trailing) applyStreamEvents([trailing]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Request failed";
          setErr(msg);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        } finally {
          queryPendingRef.current = false;
          setQueryPending(false);
        }
      })();
    },
    [sessionId, locale],
  );

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = async () => {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr(t("chat.noMic"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        setErr(t("chat.recordingError"));
        setRecording(false);
        stopTracks();
      };
      mr.start(200);
      setRecording(true);
    } catch {
      setErr(t("chat.micPermission"));
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
      setErr(t("chat.tooShort"));
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
      setErr(e instanceof Error ? e.message : t("chat.sttFailed"));
    } finally {
      setTranscribing(false);
    }
  };

  const voiceBusy = recording || transcribing;
  const canSend = text.trim().length > 0 && !queryPending && !voiceBusy;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end px-3 py-1.5">
          <div className="group relative">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                saveHistory(sessionId, []);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label={t("chat.clearConversation")}
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
            <span className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-md bg-stone-800 px-2 py-1 text-[11px] text-stone-100 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              {t("chat.clearConversation")}
            </span>
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState personName={personName} />
        ) : (
          <ul className="space-y-5 pb-2">
            {messages.map((msg) => (
              <li key={msg.id}>
                <MessageBubble
                  message={msg}
                  fallbackInterpretations={structureInterpretations}
                />
              </li>
            ))}
          </ul>
        )}

        {err && <p className="mt-3 text-center text-sm text-red-600">{err}</p>}

        <div ref={bottomRef} />
      </div>

      {/* Input area: mobile = 3 chips (no Chart overview, no scroll); sm+ = 4 chips */}
      <div className="shrink-0 border-t border-stone-200/70 bg-[var(--background)] pb-4 pt-2">
        <div
          className="mb-2 flex flex-nowrap items-center justify-center gap-1.5 py-1 pl-2 pr-2 sm:justify-start sm:gap-2 sm:pl-3 sm:pr-3"
          role="group"
          aria-label={t("chat.suggestionChips")}
        >
          {SUGGESTION_CHIPS.slice(0, 4).map((chip, idx) => (
            <button
              key={chip.labelKey}
              type="button"
              disabled={queryPending}
              onClick={() => sendQuery(t(chip.labelKey))}
              className={`shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] leading-tight text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100 disabled:opacity-50 sm:px-3 sm:text-xs${idx === 0 ? " hidden sm:inline-flex" : ""}`}
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2 pl-4 pr-8">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuery(text);
              }
            }}
            placeholder={t("chat.placeholder")}
            className="min-h-[40px] flex-1 resize-none rounded-2xl border border-stone-200 bg-[var(--surface)] px-4 py-2.5 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-stone-300 focus:outline-none"
            style={{ maxHeight: 120 }}
          />

          {/* Voice button */}
          <button
            type="button"
            onClick={() =>
              recording ? void stopRecordingAndTranscribe() : void startRecording()
            }
            disabled={queryPending || transcribing}
            aria-label={recording ? t("chat.stopRecording") : t("chat.voiceInput")}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              recording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-stone-200 bg-[var(--surface)] text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            } disabled:opacity-50`}
          >
            {transcribing ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
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
                aria-hidden
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={() => sendQuery(text)}
            disabled={!canSend}
            aria-label={t("chat.send")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800 text-white transition-colors hover:bg-stone-900 disabled:opacity-40"
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
              aria-hidden
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ personName }: { personName: string }) {
  const { t } = useI18n();
  const possessive =
    personName === "this chart" ? t("chat.thisChart") : `${personName}`;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-stone-100 shadow-sm ring-1 ring-amber-200/40">
        <LogoStar size={34} className="shrink-0" />
      </div>
      <p className="max-w-[min(100%,340px)] font-serif text-2xl font-medium leading-snug tracking-tight text-stone-800 sm:text-3xl">
        {t("chat.startExploring", { name: possessive })}
      </p>
    </div>
  );
}

/** Render inline **bold** markdown as React nodes. */
function renderInlineMd(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-stone-800">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function StructureCard({
  structure,
  interpretationText,
}: {
  structure: string;
  interpretationText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasText = Boolean(interpretationText);

  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-100/70 shadow-sm">
      <button
        type="button"
        onClick={() => hasText && setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left ${!hasText ? "cursor-default" : ""}`}
        aria-expanded={hasText ? expanded : undefined}
      >
        <span className="flex items-center gap-2 text-sm text-stone-700">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
          {structure}
        </span>
        {hasText && (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
              expanded ? "bg-stone-100 text-stone-700" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        )}
      </button>

      {expanded && interpretationText && (
        <div className="border-t border-stone-200/60 px-3 pb-3 pt-2.5">
          <p className="text-sm leading-relaxed text-stone-600">
            {renderInlineMd(interpretationText)}
          </p>
        </div>
      )}
    </div>
  );
}

const SECTION_LABEL_KEYS: Record<string, string> = {
  relevant_structures: "chat.chartStructures",
  interpretation_hints: "chat.interpretation",
  suggested_questions: "chat.suggestedFollowups",
};

function MessageBubble({
  message,
  fallbackInterpretations,
}: {
  message: ChatMessage;
  fallbackInterpretations: Record<string, string>;
}) {
  const { t } = useI18n();
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-amber-900/80 px-4 py-2.5">
          <p className="text-sm leading-relaxed text-amber-50">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.streamBuffer !== undefined) {
    const buf = message.streamBuffer;
    const sections = buf.length > 0 ? parseStreamingMarkdown(buf) : [];
    const hasSections = sections.length > 0;

    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] space-y-2">
          {!hasSections ? (
            /* Initial dots while waiting for the first section header */
            <div className="rounded-2xl rounded-tl-sm border border-stone-200/80 bg-[var(--surface)] px-4 py-3 shadow-sm">
              <span className="flex gap-1 py-1" aria-hidden>
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          ) : (
            sections.map((sec, si) => {
              const isActive = !sec.done && si === sections.length - 1;
              const cardStyle =
                sec.key === "interpretation_hints"
                  ? "rounded-2xl rounded-tl-sm border border-amber-200/70 bg-amber-50/50 px-4 py-3"
                  : sec.key === "suggested_questions"
                    ? "rounded-2xl rounded-tl-sm border border-stone-300/50 bg-stone-200/60 px-4 py-3 shadow-sm"
                    : "rounded-2xl rounded-tl-sm border border-stone-200/80 bg-[var(--surface)] px-4 py-3 shadow-sm";
              const labelStyle =
                sec.key === "interpretation_hints"
                  ? "mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600"
                  : sec.key === "suggested_questions"
                    ? "mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500"
                    : "mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400";

              if (sec.key === "suggested_questions") {
                return (
                  <div key={si} className={cardStyle}>
                    <p className={labelStyle}>{SECTION_LABEL_KEYS[sec.key] ? t(SECTION_LABEL_KEYS[sec.key]) : sec.label}</p>
                    <ul className="space-y-1.5">
                      {sec.bullets.map((b, bi) => {
                        const isLast = bi === sec.bullets.length - 1;
                        return (
                          <li key={bi} className="flex items-start gap-2 text-sm text-stone-700">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                            <span>
                              {renderInlineMd(b)}
                              {isActive && isLast && (
                                <span
                                  className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 animate-pulse bg-stone-500/60 align-baseline"
                                  aria-hidden
                                />
                              )}
                            </span>
                          </li>
                        );
                      })}
                      {isActive && sec.bullets.length === 0 && (
                        <li className="flex items-center gap-2">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                          <span
                            className="inline-block h-3 w-0.5 animate-pulse bg-stone-500/60"
                            aria-hidden
                          />
                        </li>
                      )}
                    </ul>
                  </div>
                );
              }

              return (
                <div key={si} className={cardStyle}>
                  <p className={labelStyle}>{SECTION_LABEL_KEYS[sec.key] ? t(SECTION_LABEL_KEYS[sec.key]) : sec.label}</p>
                  <ul className="space-y-1.5">
                    {sec.bullets.map((b, bi) => {
                      const isLast = bi === sec.bullets.length - 1;
                      return (
                        <li
                          key={bi}
                          className="flex items-start gap-2 text-sm text-stone-700"
                        >
                          <span
                            className={`mt-2 h-1 w-1 shrink-0 rounded-full ${sec.key === "interpretation_hints" ? "bg-amber-400" : "bg-stone-400"}`}
                          />
                          <span>
                            {renderInlineMd(b)}
                            {isActive && isLast && (
                              <span
                                className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 animate-pulse bg-amber-600/60 align-baseline"
                                aria-hidden
                              />
                            )}
                          </span>
                        </li>
                      );
                    })}
                    {isActive && sec.bullets.length === 0 && (
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                        <span
                          className="inline-block h-3 w-0.5 animate-pulse bg-amber-600/60"
                          aria-hidden
                        />
                      </li>
                    )}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const { response } = message;
  if (!response) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-2">
        {(response.relevant_structures ?? []).length > 0 && (
          <div className="rounded-2xl rounded-tl-sm border border-stone-200/80 bg-[var(--surface)] px-1 py-3 shadow-sm">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {t("chat.chartStructures")}
            </p>
            <div className="space-y-1 px-2">
              {response.relevant_structures!.map((s) => (
                <StructureCard
                  key={s}
                  structure={s}
                  interpretationText={
                    response.structure_details?.[s] ??
                    fallbackInterpretations[s]
                  }
                />
              ))}
            </div>
          </div>
        )}

        {(response.interpretation_hints ?? []).length > 0 && (
          <div className="rounded-2xl rounded-tl-sm border border-amber-200/70 bg-amber-50/50 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              {t("chat.interpretation")}
            </p>
            <ul className="space-y-1.5">
              {response.interpretation_hints!.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  {renderInlineMd(s)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(response.suggested_questions ?? []).length > 0 && (
          <div className="rounded-2xl rounded-tl-sm border border-stone-300/50 bg-stone-200/60 px-4 py-3 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">{t("chat.suggestedFollowups")}</p>
            <ul className="space-y-1.5">
              {response.suggested_questions!.map((q) => (
                <li key={q} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                  {renderInlineMd(q)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
