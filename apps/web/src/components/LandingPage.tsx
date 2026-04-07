"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoStar } from "@/components/LogoStar";

interface LandingPageProps {
  onSignIn: () => Promise<void>;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  const [phase, setPhase] = useState<"hero" | "signin">("hero");
  const [heroLeaving, setHeroLeaving] = useState(false);
  const [signinVisible, setSigninVisible] = useState(false);

  function handleGetStarted() {
    setHeroLeaving(true);
    setTimeout(() => {
      setPhase("signin");
      setTimeout(() => setSigninVisible(true), 30);
    }, 450);
  }

  function handleBack() {
    setSigninVisible(false);
    setTimeout(() => {
      setPhase("hero");
      setHeroLeaving(false);
    }, 400);
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #fdf8f0 0%, #f5f0e8 40%, #ece4d6 100%)",
      }}
    >
      {/* Ambient glow orbs — soft gold wash on light canvas */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div style={{
          position: "absolute", top: "15%", left: "10%", width: 420, height: 420,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(196,138,48,0.14) 0%, transparent 70%)",
          filter: "blur(48px)", animation: "orb-drift-1 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "20%", right: "8%", width: 320, height: 320,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(232,185,74,0.12) 0%, transparent 70%)",
          filter: "blur(56px)", animation: "orb-drift-2 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "55%", left: "55%", width: 240, height: 240,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(180,140,70,0.1) 0%, transparent 70%)",
          filter: "blur(64px)", animation: "orb-drift-3 12s ease-in-out infinite",
        }} />
      </div>

      {/* Star field */}
      <StarField />

      <style>{`
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 25px); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -15px); }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-fade-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-20px) scale(0.97); }
        }
        @keyframes signin-fade-in {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer-gold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes logo-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(196,138,48,0.22)); }
          50% { filter: drop-shadow(0 0 18px rgba(232,185,74,0.38)); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.42; }
        }
        .hero-tagline {
          background: linear-gradient(
            90deg,
            #6b4f2e 0%, #6b4f2e 28%,
            #a87028 40%, #c9a227 50%, #a87028 60%,
            #6b4f2e 72%, #6b4f2e 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-gold 5s 1s ease-in-out infinite;
        }
        .logo-glow {
          animation: logo-pulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Phase */}
      {phase === "hero" && (
        <div
          className="relative z-10 flex min-h-screen flex-col items-center justify-start pt-[17vh] px-5 text-center sm:px-8"
          style={{
            animation: heroLeaving
              ? "hero-fade-out 0.45s cubic-bezier(.4,0,.2,1) forwards"
              : "hero-fade-in 0.7s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          {/* Brand lockup: icon + wordmark (app-like, readable on mobile) */}
          <div
            className="mb-8 flex w-full max-w-xs items-center justify-center gap-3 sm:mb-10 sm:max-w-sm sm:gap-4"
            style={{
              animation: "hero-fade-in 0.7s 0.1s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            <div className="logo-glow shrink-0 origin-center scale-105 sm:scale-110">
              <LogoStar size={64} />
            </div>
            <span
              className="min-w-0 text-2xl font-light italic leading-none tracking-[0.08em] sm:text-3xl"
              style={{
                fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif",
                color: "#292524",
                textShadow: "0 1px 0 rgba(255,255,255,0.85), 0 0 28px rgba(196,138,48,0.12)",
              }}
            >
              AstraMap
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="hero-tagline mb-6 max-w-2xl text-[2.4rem] font-light italic tracking-tight sm:text-6xl lg:text-7xl"
            style={{
              fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif",
              animation: "hero-fade-in 0.9s 0.25s cubic-bezier(.22,1,.36,1) both",
              lineHeight: 1.15,
            }}
          >
            Your stars,&nbsp;decoded.
          </h1>

          {/* Divider line */}
          <div
            className="mb-8 h-px w-24"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(168,112,40,0.35), transparent)",
              animation: "hero-fade-in 0.7s 0.4s cubic-bezier(.22,1,.36,1) both",
            }}
          />

          {/* Subcopy — two lines: birth / sky, then invitation */}
          <div
            className="mb-12 flex w-full max-w-[22rem] flex-col items-center gap-3 sm:max-w-md"
            style={{
              animation: "hero-fade-in 0.7s 0.5s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            <p
              className="w-full text-center text-[0.8125rem] leading-[1.65] tracking-[0.05em] sm:text-sm"
              style={{ color: "#57534e" }}
            >
              The sky drew your circle the night you arrived.
            </p>
            <span
              className="block h-px w-10 shrink-0 opacity-50"
              style={{ background: "linear-gradient(90deg, transparent, rgba(168,112,40,0.4), transparent)" }}
              aria-hidden
            />
            <p
              className="w-full text-center text-[0.8125rem] leading-[1.65] tracking-[0.05em] sm:text-sm"
              style={{ color: "#78716c" }}
            >
              Cross the threshold—your chart is waiting.
            </p>
          </div>

          {/* CTA — intimate invite, not “free trial” */}
          <div
            className="w-full max-w-[22rem] sm:w-auto"
            style={{ animation: "hero-fade-in 0.7s 0.65s cubic-bezier(.22,1,.36,1) both" }}
          >
            <button
              type="button"
              onClick={handleGetStarted}
              className="group relative w-full overflow-hidden rounded-full px-8 py-3.5 text-[0.8125rem] font-semibold tracking-[0.18em] uppercase transition-all duration-300 sm:w-auto sm:px-10 sm:py-4 sm:text-sm sm:tracking-[0.2em]"
              style={{
                background: "linear-gradient(135deg, #c48a30 0%, #a87028 100%)",
                color: "#fffefb",
                boxShadow: "0 4px 20px rgba(168,112,40,0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 8px 28px rgba(168,112,40,0.32), inset 0 1px 0 rgba(255,255,255,0.4)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 20px rgba(168,112,40,0.28), inset 0 1px 0 rgba(255,255,255,0.35)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              Reveal your map
              <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed bottom privacy notice */}
      <p className="pointer-events-none fixed bottom-4 left-0 right-0 z-50 text-center text-[0.65rem] tracking-wide" style={{ color: "#a8967a" }}>
        By continuing, you agree to our{" "}
        <Link
          href="/privacy"
          className="pointer-events-auto underline underline-offset-2 transition-colors hover:text-stone-700"
        >
          Privacy Policy
        </Link>
      </p>

      {/* Sign-in Phase */}
      {phase === "signin" && (
        <div
          className="relative z-10 flex min-h-screen flex-col items-center justify-start pt-[15vh] px-6"
          style={{
            animation: signinVisible
              ? "signin-fade-in 0.45s cubic-bezier(.22,1,.36,1) both"
              : "none",
            opacity: signinVisible ? undefined : 0,
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-8 text-center"
            style={{
              background: "rgba(255, 255, 255, 0.88)",
              border: "1px solid rgba(168, 112, 40, 0.18)",
              boxShadow: "0 20px 50px rgba(28, 25, 23, 0.08), 0 0 0 1px rgba(255,255,255,0.6) inset",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Logo */}
            <div className="logo-glow mb-5 flex justify-center">
              <LogoStar size={52} />
            </div>

            <h1
              className="mb-1 text-xl font-semibold tracking-tight"
              style={{ color: "#1c1917" }}
            >
              AstraMap
            </h1>
            <p className="mb-8 text-sm" style={{ color: "#78716c" }}>
              Sign in to access your sessions
            </p>

            <button
              type="button"
              onClick={onSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{
                background: "#ffffff",
                borderColor: "rgba(196,138,48,0.3)",
              }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="mt-5 text-xs transition-colors"
              style={{ color: "#78716c" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#44403c"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#78716c"; }}
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StarField() {
  const stars = [
    { top: "8%",  left: "15%", size: 1.5, delay: "0s",    dur: "3.2s" },
    { top: "12%", left: "72%", size: 1,   delay: "0.8s",  dur: "4.1s" },
    { top: "22%", left: "88%", size: 2,   delay: "1.5s",  dur: "3.8s" },
    { top: "35%", left: "5%",  size: 1,   delay: "0.3s",  dur: "5.0s" },
    { top: "42%", left: "93%", size: 1.5, delay: "2.1s",  dur: "3.5s" },
    { top: "55%", left: "20%", size: 1,   delay: "1.1s",  dur: "4.5s" },
    { top: "60%", left: "60%", size: 2,   delay: "0.6s",  dur: "3.0s" },
    { top: "70%", left: "38%", size: 1,   delay: "1.8s",  dur: "4.8s" },
    { top: "78%", left: "80%", size: 1.5, delay: "0.4s",  dur: "3.6s" },
    { top: "88%", left: "12%", size: 1,   delay: "2.4s",  dur: "5.2s" },
    { top: "5%",  left: "45%", size: 1,   delay: "1.3s",  dur: "4.0s" },
    { top: "18%", left: "33%", size: 2,   delay: "0.9s",  dur: "3.3s" },
    { top: "48%", left: "50%", size: 1,   delay: "1.7s",  dur: "4.6s" },
    { top: "65%", left: "7%",  size: 1.5, delay: "0.2s",  dur: "5.5s" },
    { top: "82%", left: "55%", size: 1,   delay: "2.0s",  dur: "3.9s" },
    { top: "92%", left: "78%", size: 2,   delay: "0.7s",  dur: "4.2s" },
    { top: "28%", left: "60%", size: 1,   delay: "1.4s",  dur: "3.7s" },
    { top: "72%", left: "25%", size: 1.5, delay: "0.5s",  dur: "4.9s" },
    { top: "15%", left: "52%", size: 1,   delay: "2.2s",  dur: "3.4s" },
    { top: "50%", left: "76%", size: 2,   delay: "1.0s",  dur: "4.3s" },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#a87028",
            animation: `star-twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
