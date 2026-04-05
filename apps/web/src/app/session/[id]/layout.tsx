import { Suspense } from "react";
import SessionWorkspace from "./SessionWorkspace";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-col">
          <div className="border-b border-stone-200/90 px-4 py-2">
            <div className="h-11 w-full animate-pulse rounded-xl bg-stone-200/60" />
          </div>
          <div className="flex-1 p-4">
            <p className="text-sm text-stone-500">Loading…</p>
          </div>
        </div>
      }
    >
      <SessionWorkspace>{children}</SessionWorkspace>
    </Suspense>
  );
}
