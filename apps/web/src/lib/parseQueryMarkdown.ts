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
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/i);
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
      if (inDetails && currentDetailKey && currentDetailLines.length > 0) {
        currentDetailLines.push("");
      }
      continue;
    }

    if ((line.startsWith("- ") || line.startsWith("* ")) && currentList) {
      out[currentList].push(line.slice(2).trim());
      continue;
    }

    if (inDetails && currentDetailKey !== null) {
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
