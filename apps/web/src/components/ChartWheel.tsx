"use client";

/**
 * Renders server-generated natal wheel SVG. SVG is trusted (produced by our API, not user input).
 */
export function ChartWheel({ svg }: { svg: string }) {
  return (
    <div
      className="chart-wheel mx-auto max-w-[min(100%,420px)] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 [&_svg]:h-auto [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
