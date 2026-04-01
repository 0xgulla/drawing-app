import { useEffect, useRef, useState } from "react";

interface LandingPageProps {
  onLaunchApp: () => void;
  onShowLogin: () => void;
  onShowGuide?: () => void;
}

/* ─── Scroll-reveal hook ─────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Fade-up wrapper ────────────────────────────────────────────── */
function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ${delay}ms ease, transform 0.7s ${delay}ms ease`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage({
  onLaunchApp,
  onShowLogin,
  onShowGuide = () => {},
}: LandingPageProps) {
  const [launched, setLaunched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  /* Allow page to scroll */
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

  /* Animated hero canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
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

    type Stroke = {
      points: { x: number; y: number }[];
      color: string;
      width: number;
      drawn: number;
      speed: number;
      opacity: number;
    };

    const curve = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ): { x: number; y: number }[] => {
      const pts: { x: number; y: number }[] = [];
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 0.25;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 0.25;
      for (let t = 0; t <= 1; t += 0.01)
        pts.push({
          x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2,
          y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * my + t ** 2 * y2,
        });
      return pts;
    };

    const strokes: Stroke[] = [
      {
        points: curve(0.05, 0.55, 0.45, 0.25),
        color: "168,85,247",
        width: 3,
        drawn: 0,
        speed: 1.2,
        opacity: 0,
      },
      {
        points: curve(0.55, 0.15, 0.95, 0.55),
        color: "96,165,250",
        width: 4,
        drawn: 0,
        speed: 0.9,
        opacity: 0,
      },
      {
        points: curve(0.1, 0.82, 0.75, 0.68),
        color: "251,191,36",
        width: 2.5,
        drawn: 0,
        speed: 1.5,
        opacity: 0,
      },
      {
        points: curve(0.0, 0.3, 0.5, 0.7),
        color: "52,211,153",
        width: 3.5,
        drawn: 0,
        speed: 1.0,
        opacity: 0,
      },
      {
        points: curve(0.5, 0.9, 1.0, 0.2),
        color: "251,113,133",
        width: 2,
        drawn: 0,
        speed: 1.3,
        opacity: 0,
      },
    ];

    let last = 0;
    let idx = 0;

    const tick = (now: number) => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      if (now - last > 700 && idx < strokes.length) {
        strokes[idx].opacity = 0.55;
        last = now;
        idx++;
      }
      for (const s of strokes) {
        if (!s.opacity) continue;
        if (s.drawn < s.points.length)
          s.drawn = Math.min(s.points.length, s.drawn + s.speed * 2);
        const pts = s.points.slice(0, Math.floor(s.drawn));
        if (pts.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * W, pts[0].y * H);
        for (let i = 1; i < pts.length; i++)
          ctx.lineTo(pts[i].x * W, pts[i].y * H);
        ctx.strokeStyle = `rgba(${s.color},${s.opacity})`;
        ctx.lineWidth = s.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleLaunch = () => {
    setLaunched(true);
    setTimeout(onLaunchApp, 550);
  };

  /* ── Shared style helpers ── */
  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  } as const;

  const purpleBtn = {
    background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.18s, box-shadow 0.18s",
    boxShadow: "0 4px 32px rgba(139,92,246,0.45)",
  } as const;

  const ghostBtn = {
    background: "transparent",
    color: "rgba(240,234,255,0.8)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    transition: "background 0.18s, border-color 0.18s",
  } as const;

  const hoverPurple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.transform = "scale(1.06) translateY(-2px)";
    el.style.boxShadow = "0 8px 48px rgba(139,92,246,0.65)";
  };
  const leavePurple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.transform = "";
    el.style.boxShadow = "0 4px 32px rgba(139,92,246,0.45)";
  };
  const hoverGhost = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
  };
  const leaveGhost = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
  };

  const features = [
    {
      icon: "🖌️",
      title: "Brush Engine",
      desc: "Pressure-sensitive strokes with size, opacity and hardness control",
    },
    {
      icon: "⌫",
      title: "True Eraser",
      desc: "Real transparency via destination-out compositing, not white paint",
    },
    {
      icon: "⬡",
      title: "12+ Shapes",
      desc: "Editable vector shapes: rect, ellipse, star, arrow, polygon and more",
    },
    {
      icon: "🎨",
      title: "Color Picker",
      desc: "Live HSB picker with 30-color history and instant swatch reuse",
    },
    {
      icon: "⚙️",
      title: "Canvas Resize",
      desc: "Square, Instagram, YouTube presets plus custom width/height",
    },
    {
      icon: "🌙",
      title: "3 Themes",
      desc: "Dark, Light, and Purple accent — all powered by CSS variables",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: "📂",
      title: "Open",
      desc: "Launch the app or open an existing .drw project",
    },
    {
      num: "02",
      icon: "✏️",
      title: "Draw",
      desc: "Use brushes, shapes, layers and the full toolkit to create",
    },
    {
      num: "03",
      icon: "📤",
      title: "Export",
      desc: "Download as PNG, JPG or save your project as .drw",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#040614",
        color: "#f0eaff",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        opacity: launched ? 0 : 1,
        transform: launched ? "scale(1.03)" : "scale(1)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        position: "relative",
      }}
    >
      {/* ambient glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(139,92,246,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(6,182,212,0.12) 0%, transparent 65%)",
        }}
      />

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          ...glass,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10 }}
          data-ocid="nav.section"
        >
          <img
            src="/assets/logo.png"
            alt="Sketchora"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "0 0 20px rgba(124,58,237,0.5)",
            }}
          />
          <span
            style={{
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: "-0.03em",
              background:
                "linear-gradient(135deg,#f0eaff 0%,#c4b5fd 50%,#6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Sketchora
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            data-ocid="nav.login_button"
            onClick={onShowLogin}
            style={{ ...ghostBtn, padding: "8px 20px", fontSize: 14 }}
            onMouseEnter={hoverGhost}
            onMouseLeave={leaveGhost}
          >
            Login
          </button>
          <button
            type="button"
            data-ocid="nav.primary_button"
            onClick={handleLaunch}
            style={{ ...purpleBtn, padding: "8px 22px", fontSize: 14 }}
            onMouseEnter={hoverPurple}
            onMouseLeave={leavePurple}
          >
            Start Drawing
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px 60px",
          zIndex: 1,
        }}
      >
        {/* Floating particles */}
        {[
          {
            size: 8,
            top: "18%",
            left: "8%",
            color: "rgba(168,85,247,0.25)",
            delay: "0s",
            dur: "7s",
          },
          {
            size: 5,
            top: "30%",
            left: "15%",
            color: "rgba(20,184,166,0.2)",
            delay: "1.2s",
            dur: "9s",
          },
          {
            size: 12,
            top: "60%",
            left: "6%",
            color: "rgba(139,92,246,0.18)",
            delay: "0.5s",
            dur: "8s",
          },
          {
            size: 6,
            top: "75%",
            left: "20%",
            color: "rgba(20,184,166,0.22)",
            delay: "2s",
            dur: "10s",
          },
          {
            size: 10,
            top: "20%",
            right: "10%",
            color: "rgba(168,85,247,0.2)",
            delay: "0.8s",
            dur: "8.5s",
          },
          {
            size: 7,
            top: "50%",
            right: "8%",
            color: "rgba(20,184,166,0.18)",
            delay: "1.5s",
            dur: "7.5s",
          },
          {
            size: 4,
            top: "80%",
            right: "18%",
            color: "rgba(139,92,246,0.25)",
            delay: "0.3s",
            dur: "9.5s",
          },
          {
            size: 9,
            top: "40%",
            right: "25%",
            color: "rgba(168,85,247,0.15)",
            delay: "2.5s",
            dur: "11s",
          },
        ].map((p) => (
          <div
            key={`particle-${p.top}-${p.dur}`}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              top: p.top,
              left: "left" in p ? (p as any).left : undefined,
              right: "right" in p ? (p as any).right : undefined,
              pointerEvents: "none",
              animation: `heroFloat ${p.dur} ${p.delay} ease-in-out infinite`,
              zIndex: 0,
              filter: "blur(1px)",
            }}
          />
        ))}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.55,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 760 }}>
          {/* badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.4)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "#c4b5fd",
              marginBottom: 32,
              letterSpacing: "0.04em",
              animation: "fadeSlideUp 0.7s ease-out both",
            }}
          >
            ✦ Sketchora — Professional Drawing App
          </div>

          <h1
            style={{
              fontSize: "clamp(40px,8vw,82px)",
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.045em",
              marginBottom: 24,
              background:
                "linear-gradient(140deg,#f0eaff 0%,#c4b5fd 40%,#67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "fadeSlideUp 0.75s 0.1s ease-out both",
            }}
          >
            Create, draw, and design —<br />
            all in one powerful canvas
          </h1>

          <p
            style={{
              fontSize: "clamp(15px,2.2vw,19px)",
              lineHeight: 1.7,
              color: "rgba(240,234,255,0.6)",
              marginBottom: 44,
              maxWidth: 540,
              marginLeft: "auto",
              marginRight: "auto",
              animation: "fadeSlideUp 0.75s 0.2s ease-out both",
            }}
          >
            A professional multi-layer drawing app for the browser. Brushes,
            shapes, layers, themes — everything you need to create freely.
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
              animation: "fadeSlideUp 0.75s 0.3s ease-out both",
            }}
          >
            <button
              type="button"
              data-ocid="hero.primary_button"
              onClick={handleLaunch}
              style={{
                ...purpleBtn,
                padding: "15px 40px",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseEnter={hoverPurple}
              onMouseLeave={leavePurple}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
              Start Drawing
            </button>
            <button
              type="button"
              data-ocid="hero.secondary_button"
              style={{ ...ghostBtn, padding: "15px 36px", fontSize: 16 }}
              onMouseEnter={hoverGhost}
              onMouseLeave={leaveGhost}
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Open Project
            </button>
          </div>
        </div>

        {/* App window mockup */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: 72,
            maxWidth: 900,
            width: "100%",
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "0 40px 120px rgba(139,92,246,0.25), 0 0 0 1px rgba(139,92,246,0.1)",
            animation: "fadeSlideUp 0.85s 0.4s ease-out both",
          }}
        >
          {/* title bar */}
          <div
            style={{
              background: "#0d0d1a",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              padding: "11px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {["#ff5f56", "#febc2e", "#28c840"].map((c) => (
              <div
                key={c}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: c,
                }}
              />
            ))}
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                color: "rgba(240,234,255,0.35)",
                fontWeight: 500,
              }}
            >
              DrawStudio — Untitled Project
            </span>
          </div>
          {/* app body */}
          <div
            style={{
              background: "#0a0a18",
              height: 320,
              display: "flex",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* left toolbar */}
            <div
              style={{
                width: 52,
                background: "#111128",
                borderRight: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 14,
                gap: 8,
              }}
            >
              {["✏️", "⌫", "⬡", "🪣", "🔤", "👆"].map((icon, i) => (
                <div
                  key={icon}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? "rgba(139,92,246,0.3)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      i === 0
                        ? "1px solid rgba(139,92,246,0.6)"
                        : "1px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {icon}
                </div>
              ))}
            </div>
            {/* canvas area */}
            <div
              style={{
                flex: 1,
                position: "relative",
                background: "#0d0d1e",
                overflow: "hidden",
              }}
            >
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0.75,
                }}
                viewBox="0 0 600 320"
                aria-hidden="true"
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M 40 180 Q 120 60 220 140 Q 310 210 420 80"
                  stroke="#a78bfa"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
                <path
                  d="M 60 260 Q 160 200 260 230 Q 370 255 500 180"
                  stroke="#67e8f9"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="260"
                  cy="155"
                  rx="55"
                  ry="35"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="rgba(251,191,36,0.08)"
                />
                <rect
                  x="160"
                  y="210"
                  width="80"
                  height="50"
                  rx="6"
                  stroke="#34d399"
                  strokeWidth="2"
                  fill="rgba(52,211,153,0.07)"
                />
                <path
                  d="M 380 200 L 420 160 L 460 200 Z"
                  stroke="#f472b6"
                  strokeWidth="2"
                  fill="rgba(244,114,182,0.07)"
                />
              </svg>
            </div>
            {/* right panel */}
            <div
              style={{
                width: 160,
                background: "#0f0f20",
                borderLeft: "1px solid rgba(255,255,255,0.07)",
                padding: "12px 10px",
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(139,92,246,0.7)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                LAYERS
              </p>
              {["Layer 3", "Layer 2", "Layer 1"].map((name, i) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 8px",
                    borderRadius: 8,
                    marginBottom: 4,
                    background:
                      i === 0 ? "rgba(139,92,246,0.15)" : "transparent",
                    border:
                      i === 0
                        ? "1px solid rgba(139,92,246,0.3)"
                        : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 18,
                      borderRadius: 4,
                      background: [
                        "rgba(139,92,246,0.4)",
                        "rgba(96,165,250,0.3)",
                        "rgba(52,211,153,0.3)",
                      ][i],
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: i === 0 ? "#c4b5fd" : "rgba(240,234,255,0.4)",
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: "100px 24px",
          maxWidth: 1080,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp style={{ textAlign: "center", marginBottom: 60 }}>
          <h2
            style={{
              fontSize: "clamp(26px,5vw,48px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: 14,
              background: "linear-gradient(135deg,#f0eaff,#c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Everything you need to create
          </h2>
          <p
            style={{
              color: "rgba(240,234,255,0.5)",
              fontSize: 17,
              maxWidth: 460,
              margin: "0 auto",
            }}
          >
            A full drawing toolkit that runs entirely in your browser. No
            installs.
          </p>
        </FadeUp>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 20,
          }}
        >
          {features.map((f, i) => (
            <FadeUp key={f.title} delay={i * 60}>
              <div
                data-ocid={`features.card.${i + 1}`}
                style={{
                  ...glass,
                  borderRadius: 20,
                  padding: "28px 24px",
                  height: "100%",
                  transition:
                    "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(139,92,246,0.45)";
                  el.style.transform = "translateY(-5px)";
                  el.style.boxShadow = "0 16px 48px rgba(139,92,246,0.18)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(255,255,255,0.08)";
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 8,
                    color: "#f0eaff",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "rgba(240,234,255,0.5)",
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── APP PREVIEW ──────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 100px",
          maxWidth: 1080,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: "clamp(26px,5vw,48px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: 14,
              background: "linear-gradient(135deg,#f0eaff,#67e8f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            See it in action
          </h2>
          <p style={{ color: "rgba(240,234,255,0.5)", fontSize: 17 }}>
            A glimpse of the full drawing workspace.
          </p>
        </FadeUp>
        <FadeUp>
          <div style={{ position: "relative" }}>
            {/* glow orbs */}
            <div
              style={{
                position: "absolute",
                top: -60,
                left: "10%",
                width: 300,
                height: 300,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 70%)",
                pointerEvents: "none",
                filter: "blur(40px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -60,
                right: "10%",
                width: 260,
                height: 260,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle,rgba(6,182,212,0.2) 0%,transparent 70%)",
                pointerEvents: "none",
                filter: "blur(40px)",
              }}
            />
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 48px 140px rgba(139,92,246,0.3)",
                position: "relative",
              }}
            >
              {/* title bar */}
              <div
                style={{
                  background: "#0b0b1c",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  padding: "11px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {["#ff5f56", "#febc2e", "#28c840"].map((c) => (
                  <div
                    key={c}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: c,
                    }}
                  />
                ))}
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: "rgba(240,234,255,0.35)",
                  }}
                >
                  DrawStudio — My Artwork.drw
                </span>
              </div>
              {/* app body */}
              <div
                style={{ display: "flex", background: "#080818", height: 420 }}
              >
                {/* toolbar */}
                <div
                  style={{
                    width: 56,
                    background: "#0e0e22",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 16,
                    gap: 10,
                  }}
                >
                  <p
                    style={{
                      fontSize: 8,
                      color: "rgba(139,92,246,0.6)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    TOOLS
                  </p>
                  {["✏️", "⌫", "⬡", "🪣", "✂️", "🔤", "👆", "🤚"].map(
                    (icon, i) => (
                      <div
                        key={icon}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background:
                            i === 0
                              ? "rgba(139,92,246,0.35)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            i === 0
                              ? "1px solid rgba(139,92,246,0.65)"
                              : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                        }}
                      >
                        {icon}
                      </div>
                    ),
                  )}
                </div>
                {/* canvas */}
                <div
                  style={{
                    flex: 1,
                    background: "#0a0a1a",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <svg
                    style={{ width: "100%", height: "100%" }}
                    viewBox="0 0 700 420"
                    aria-hidden="true"
                  >
                    <defs>
                      <filter id="g2">
                        <feGaussianBlur stdDeviation="4" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M 50 260 Q 150 100 280 200 Q 380 290 520 120"
                      stroke="#a78bfa"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                      filter="url(#g2)"
                    />
                    <path
                      d="M 80 350 Q 200 280 330 310 Q 460 340 600 260"
                      stroke="#67e8f9"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <ellipse
                      cx="340"
                      cy="210"
                      rx="70"
                      ry="45"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      fill="rgba(251,191,36,0.1)"
                    />
                    <rect
                      x="200"
                      y="280"
                      width="100"
                      height="65"
                      rx="8"
                      stroke="#34d399"
                      strokeWidth="2"
                      fill="rgba(52,211,153,0.08)"
                    />
                    <path
                      d="M 480 260 L 530 200 L 580 260 Z"
                      stroke="#f472b6"
                      strokeWidth="2"
                      fill="rgba(244,114,182,0.08)"
                    />
                    <circle
                      cx="150"
                      cy="150"
                      r="30"
                      stroke="#c084fc"
                      strokeWidth="2"
                      fill="rgba(192,132,252,0.1)"
                    />
                  </svg>
                </div>
                {/* layers panel */}
                <div
                  style={{
                    width: 180,
                    background: "#0d0d20",
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    padding: "14px 12px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "rgba(139,92,246,0.7)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    LAYERS
                  </p>
                  {["Sky", "Shapes", "Strokes", "Background"].map((name, i) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 8px",
                        borderRadius: 8,
                        marginBottom: 5,
                        background:
                          i === 0 ? "rgba(139,92,246,0.18)" : "transparent",
                        border:
                          i === 0
                            ? "1px solid rgba(139,92,246,0.35)"
                            : "1px solid transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 20,
                          borderRadius: 4,
                          flexShrink: 0,
                          background: [
                            "rgba(139,92,246,0.5)",
                            "rgba(96,165,250,0.4)",
                            "rgba(52,211,153,0.4)",
                            "rgba(251,191,36,0.4)",
                          ][i],
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: i === 0 ? "#c4b5fd" : "rgba(240,234,255,0.4)",
                        }}
                      >
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 100px",
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp style={{ textAlign: "center", marginBottom: 64 }}>
          <h2
            style={{
              fontSize: "clamp(26px,5vw,48px)",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              marginBottom: 14,
              background: "linear-gradient(135deg,#f0eaff,#c4b5fd)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Simple as 1, 2, 3
          </h2>
          <p style={{ color: "rgba(240,234,255,0.5)", fontSize: 17 }}>
            No learning curve. Just open and create.
          </p>
        </FadeUp>
        <div
          style={{
            display: "flex",
            gap: 0,
            alignItems: "stretch",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.num}
              style={{
                display: "flex",
                alignItems: "stretch",
                flex: "1 1 220px",
                minWidth: 200,
              }}
            >
              <FadeUp delay={i * 120} style={{ flex: 1 }}>
                <div
                  style={{
                    ...glass,
                    borderRadius: 20,
                    padding: "36px 28px",
                    textAlign: "center",
                    height: "100%",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "translateY(-4px)";
                    el.style.boxShadow = "0 16px 48px rgba(139,92,246,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "";
                    el.style.boxShadow = "";
                  }}
                >
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      color: "rgba(139,92,246,0.25)",
                      lineHeight: 1,
                      marginBottom: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {s.num}
                  </div>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{s.icon}</div>
                  <h3
                    style={{
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: 10,
                      color: "#f0eaff",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "rgba(240,234,255,0.5)",
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </FadeUp>
              {i < steps.length - 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    flexShrink: 0,
                    color: "rgba(139,92,246,0.4)",
                    fontSize: 22,
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 100px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp>
          <div
            style={{
              maxWidth: 620,
              margin: "0 auto",
              ...glass,
              borderRadius: 28,
              padding: "64px 48px",
              boxShadow:
                "0 0 80px rgba(139,92,246,0.15), 0 32px 80px rgba(0,0,0,0.4)",
              position: "relative",
              overflow: "visible",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -80,
                left: "50%",
                transform: "translateX(-50%)",
                width: 400,
                height: 300,
                background:
                  "radial-gradient(ellipse,rgba(139,92,246,0.18) 0%,transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                fontSize: "clamp(24px,4vw,40px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 14,
                color: "#f0eaff",
              }}
            >
              Start creating now
            </h2>
            <p
              style={{
                color: "rgba(240,234,255,0.55)",
                fontSize: 16,
                marginBottom: 36,
              }}
            >
              No sign-up, no downloads. Your creative workspace is one click
              away.
            </p>
            <button
              type="button"
              data-ocid="cta.primary_button"
              onClick={handleLaunch}
              style={{
                ...purpleBtn,
                padding: "17px 52px",
                fontSize: 18,
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                position: "relative",
                zIndex: 2,
                touchAction: "manipulation",
              }}
              onMouseEnter={hoverPurple}
              onMouseLeave={leavePurple}
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Launch App
            </button>
            <button
              type="button"
              data-ocid="cta.user_guide.button"
              onClick={onShowGuide}
              style={{
                padding: "17px 36px",
                fontSize: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 999,
                border: "1px solid rgba(124,58,237,0.45)",
                background: "rgba(124,58,237,0.1)",
                color: "#c4b5fd",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontWeight: 600,
                position: "relative",
                zIndex: 2,
                touchAction: "manipulation",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(124,58,237,0.2)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(124,58,237,0.7)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 8px 24px rgba(124,58,237,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(124,58,237,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "rgba(124,58,237,0.45)";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              User Guide
            </button>
          </div>
        </FadeUp>
      </section>

      {/* ── CONTACT ──────────────────────────────────────── */}
      <section
        style={{
          padding: "0 24px 100px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <FadeUp>
          <h2
            style={{
              fontSize: "clamp(24px,4vw,40px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 10,
              color: "#f0eaff",
            }}
          >
            Connect with me
          </h2>
          <p
            style={{
              color: "rgba(240,234,255,0.5)",
              fontSize: 16,
              marginBottom: 44,
            }}
          >
            Find me on social media
          </p>
        </FadeUp>
        <FadeUp delay={100}>
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {/* X (Twitter) */}
            <a
              href="https://x.com/0xGulla"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="contact.link.1"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 32px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f0eaff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
                transition:
                  "transform 0.2s, box-shadow 0.2s, background 0.2s, border-color 0.2s",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "scale(1.06) translateY(-2px)";
                el.style.boxShadow = "0 8px 36px rgba(255,255,255,0.15)";
                el.style.background = "rgba(255,255,255,0.1)";
                el.style.borderColor = "rgba(255,255,255,0.3)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "";
                el.style.boxShadow = "";
                el.style.background = "rgba(255,255,255,0.05)";
                el.style.borderColor = "rgba(255,255,255,0.12)";
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @0xGulla
            </a>

            {/* Discord */}
            <a
              href="https://discord.com/users/gulla_23"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="contact.link.2"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 32px",
                borderRadius: 999,
                background: "rgba(88,101,242,0.12)",
                border: "1px solid rgba(88,101,242,0.3)",
                color: "#c4b5fd",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
                transition:
                  "transform 0.2s, box-shadow 0.2s, background 0.2s, border-color 0.2s",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "scale(1.06) translateY(-2px)";
                el.style.boxShadow = "0 8px 36px rgba(88,101,242,0.4)";
                el.style.background = "rgba(88,101,242,0.22)";
                el.style.borderColor = "rgba(88,101,242,0.6)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = "";
                el.style.boxShadow = "";
                el.style.background = "rgba(88,101,242,0.12)";
                el.style.borderColor = "rgba(88,101,242,0.3)";
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.133 18.113a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              gulla_23
            </a>
          </div>
        </FadeUp>
        <FadeUp delay={200}>
          <button
            type="button"
            data-ocid="contact.user_guide.button"
            onClick={onShowGuide}
            style={{
              marginTop: 32,
              padding: "14px 32px",
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 999,
              border: "1px solid rgba(124,58,237,0.4)",
              background: "rgba(124,58,237,0.08)",
              color: "#c4b5fd",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontWeight: 600,
              touchAction: "manipulation",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(124,58,237,0.18)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(124,58,237,0.65)";
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 24px rgba(124,58,237,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(124,58,237,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(124,58,237,0.4)";
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            User Guide
          </button>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "22px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 13,
          color: "rgba(240,234,255,0.3)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span>Made by Gulla</span>
        <span>·</span>
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(240,234,255,0.3)", textDecoration: "none" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(240,234,255,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(240,234,255,0.3)";
          }}
        >
          Built with ♥ using caffeine.ai
        </a>
        <span>·</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 1; }
          33% { transform: translateY(-14px) scale(1.08); opacity: 0.7; }
          66% { transform: translateY(8px) scale(0.94); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
