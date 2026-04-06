"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * OAuth callback page — Supabase PKCE flow redirects here after Google auth.
 * The SDK automatically exchanges the code for a session, then we redirect home.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) {
      router.replace("/");
      return;
    }
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        router.replace("/");
      });
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-slate-400 text-sm">Signing in…</p>
    </div>
  );
}
