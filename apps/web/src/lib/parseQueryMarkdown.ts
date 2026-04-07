/**
 * Mirrors services/api/app/llm/query.py parse_query_markdown.
 * Used as a client fallback when the SSE stream ends without a `complete` event.
 */
export type ParsedQueryResponse = {
  relevant_structures: string[];
  interpretation_hints: string[];
  suggested_questions: string[];
  structure_details: Record<string, string>;
};

export function parseQueryMarkdown(md: string): ParsedQueryResponse {
  const out: ParsedQueryResponse = {
    relevant_structures: [],
    interpretation_hints: [],
    suggested_questions: [],
    structure_details: {},
  };

  type ListKey = keyof Pick<
    ParsedQueryResponse,
    "relevant_structures" | "interpretation_hints" | "suggested_questions"
  >;

  let currentList: ListKey | null = null;
  let inDetails = false;
  let currentDetailKey: string | null = null;
  let currentDetailLines: string[] = [];

  const flushDetail = () => {
    if (currentDetailKey && currentDetailLines.length > 0) {
      out.structure_details[currentDetailKey] = currentDetailLines.join(" ").trim();
    }
  };

  for (const raw of md.split("\n")) {
    const line = raw.trim();

    const h4 = line.match(/^####\s+(.+)$/i);
    if (h4) {
      flushDetail();
      currentDetailKey = h4[1]!.trim();
      currentDetailLines = [];
      // Models often skip "### Structure details"; without this, prose under #### is never collected.
      inDetails = true;
      currentList = null;
      continue;
    }

    // Models sometimes use ## instead of ### for section titles; #### must stay four hashes.
    const h3 = line.match(/^###\s+(.+)$/i) || line.match(/^##\s+(.+)$/i);
    if (h3) {
      flushDetail();
      currentDetailKey = null;
      currentDetailLines = [];
      const rawTitle = h3[1]!.trim();
      const title = rawTitle.toLowerCase().replace(/:+$/, "");

      const zhStructureDetails = rawTitle.includes("结构细节");
      const enStructureDetails = title.includes("detail") && title.includes("structure");
      if (zhStructureDetails || enStructureDetails) {
        currentList = null;
        inDetails = true;
      } else if (
        (title.includes("structure") && !title.includes("detail")) ||
        rawTitle.includes("星盘结构") ||
        rawTitle.includes("图表结构")
      ) {
        currentList = "relevant_structures";
        inDetails = false;
      } else if (title.includes("interpretation") || rawTitle.includes("解读")) {
        currentList = "interpretation_hints";
        inDetails = false;
      } else if (title.includes("follow") || rawTitle.includes("推荐追问")) {
        currentList = "suggested_questions";
        inDetails = false;
      } else if (title.includes("detail")) {
        currentList = null;
        inDetails = true;
      } else {
        currentList = null;
        inDetails = false;
      }
      continue;
    }

    if (!line) {
      if (currentDetailKey && currentDetailLines.length > 0) {
        currentDetailLines.push("");
      }
      continue;
    }

    if ((line.startsWith("- ") || line.startsWith("* ")) && currentList) {
      out[currentList].push(line.slice(2).trim());
      continue;
    }

    if (currentDetailKey !== null) {
      currentDetailLines.push(line);
    }
  }

  flushDetail();
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(out.structure_details)) {
    const t = v.trim();
    if (t) cleaned[k] = t;
  }
  out.structure_details = cleaned;
  return out;
}

/** Loose API / message shape */
export type LooseQueryResponse = {
  relevant_structures?: string[];
  interpretation_hints?: string[];
  suggested_questions?: string[];
  structure_details?: Record<string, string>;
};

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Map a bullet from "Chart structures" to its #### paragraph; tolerates minor key drift.
 */
export function interpretationForStructure(
  structure: string,
  details: Record<string, string> | undefined,
): string | undefined {
  if (!details || Object.keys(details).length === 0) return undefined;
  if (details[structure]) return details[structure];
  const sn = normalizeWs(structure);
  for (const [k, v] of Object.entries(details)) {
    if (normalizeWs(k) === sn) return v;
  }
  let best: string | undefined;
  let bestLen = 0;
  for (const [k, v] of Object.entries(details)) {
    const kn = normalizeWs(k);
    if (sn.includes(kn) || kn.includes(sn)) {
      const len = Math.min(sn.length, kn.length);
      if (len > bestLen) {
        bestLen = len;
        best = v;
      }
    }
  }
  return bestLen >= 6 ? best : undefined;
}

/** Re-parse streamed markdown and fill empty / missing structure_details (same rules as server). */
export function enrichQueryResponseFromMarkdown(
  response: LooseQueryResponse,
  fullMd: string,
): LooseQueryResponse {
  if (!fullMd.trim()) return response;
  const parsed = parseQueryMarkdown(fullMd);
  const merged: Record<string, string> = { ...(response.structure_details ?? {}) };

  if (Object.keys(merged).length === 0 && Object.keys(parsed.structure_details).length > 0) {
    Object.assign(merged, parsed.structure_details);
  }

  for (const s of response.relevant_structures ?? []) {
    if (!merged[s]) {
      const v = interpretationForStructure(s, parsed.structure_details);
      if (v) merged[s] = v;
    }
  }

  return { ...response, structure_details: merged };
}

/** Console diagnostics: whether raw markdown looks like it contains a structure-details section. */
export function queryMarkdownDiagnostics(md: string): {
  len: number;
  hasStructureDetailsEn: boolean;
  hasStructureDetailsZh: boolean;
  h4Headings: number;
  sampleTail: string;
} {
  return {
    len: md.length,
    hasStructureDetailsEn: /#{2,3}\s*Structure details/i.test(md),
    hasStructureDetailsZh: md.includes("结构细节"),
    h4Headings: (md.match(/^####\s/gm) ?? []).length,
    sampleTail: md.slice(Math.max(0, md.length - 1200)),
  };
}
