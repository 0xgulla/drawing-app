import {
  BookOpen,
  Brush,
  ChevronRight,
  Download,
  Eraser,
  Hand,
  Layers,
  Lightbulb,
  Menu,
  MousePointer,
  PaintBucket,
  Palette,
  Shapes,
  Square,
  Star,
  Type,
  X,
  ZoomIn,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface UserGuidePageProps {
  onGoHome: () => void;
}

const LOGO_SRC = "/assets/logo.png";

const sidebarSections = [
  { id: "welcome", label: "Welcome", icon: "👋" },
  { id: "how-to-use", label: "How to Use", icon: "📖" },
  { id: "features", label: "Features", icon: "✨" },
  { id: "tools-guide", label: "Tools Guide", icon: "🛠️" },
  { id: "tips", label: "Tips & Tricks", icon: "💡" },
  { id: "documentation", label: "Documentation", icon: "📚" },
  { id: "credits", label: "Credits", icon: "❤️" },
];

const steps = [
  {
    num: 1,
    icon: <Square size={22} />,
    title: "Open App",
    desc: 'Click "Launch App" on the landing page to open the Sketchora canvas in your browser.',
  },
  {
    num: 2,
    icon: <Brush size={22} />,
    title: "Select Tool",
    desc: "Pick a tool from the left toolbar — brush, eraser, shapes, fill bucket, text, or selection.",
  },
  {
    num: 3,
    icon: <Palette size={22} />,
    title: "Start Drawing",
    desc: "Click and drag on the canvas to draw. Use layers to organize your artwork.",
  },
  {
    num: 4,
    icon: <Download size={22} />,
    title: "Save / Export",
    desc: "Save your project as a .drw file, or export as PNG (transparent) or JPG (white background).",
  },
];

const features = [
  {
    icon: <Brush size={20} />,
    title: "Brush Tool",
    desc: "Smooth strokes with size, opacity & shape controls",
  },
  {
    icon: <Eraser size={20} />,
    title: "Eraser",
    desc: "True transparency erasing with destination-out",
  },
  {
    icon: <Shapes size={20} />,
    title: "Shapes",
    desc: "12+ shapes: rect, circle, line, star, arrow & more",
  },
  {
    icon: <Layers size={20} />,
    title: "Layers",
    desc: "Multi-layer support with opacity, visibility & reorder",
  },
  {
    icon: <Palette size={20} />,
    title: "Color Picker",
    desc: "Full color wheel + 30-color history panel",
  },
  {
    icon: <Download size={20} />,
    title: "Export Options",
    desc: "Export PNG (transparent) or JPG with one click",
  },
  {
    icon: <ZoomIn size={20} />,
    title: "Zoom",
    desc: "10%–500% transform-based zoom with Ctrl+Scroll",
  },
  {
    icon: <Star size={20} />,
    title: "Themes",
    desc: "Dark, Light & Purple themes with smooth transitions",
  },
];

const tools = [
  {
    icon: <Brush size={18} />,
    name: "Brush",
    desc: "Draw smooth strokes with adjustable size, opacity, and brush shape (circle, square, triangle, star, diamond).",
  },
  {
    icon: <Eraser size={18} />,
    name: "Eraser",
    desc: "Erase with true transparency using destination-out compositing. Supports soft/hard mode and size control.",
  },
  {
    icon: <PaintBucket size={18} />,
    name: "Fill Bucket",
    desc: "Flood fill areas with adjustable tolerance. Respects selection boundaries and shows ripple feedback on click.",
  },
  {
    icon: <MousePointer size={18} />,
    name: "Selection",
    desc: "Select, move, copy, cut, and paste regions. Supports 8 resize handles, rotation, and keyboard shortcuts.",
  },
  {
    icon: <Shapes size={18} />,
    name: "Shapes",
    desc: "Draw rectangles, circles, lines, triangles, arrows, stars, and more with live preview and transform support.",
  },
  {
    icon: <Type size={18} />,
    name: "Text",
    desc: "Add text with full font controls — family, size, bold, italic, underline, and alignment.",
  },
  {
    icon: <Hand size={18} />,
    name: "Hand Tool",
    desc: "Pan the canvas freely. Press H to activate, then drag to scroll in any direction.",
  },
  {
    icon: <ZoomIn size={18} />,
    name: "Zoom",
    desc: "10%–500% zoom range. Use Ctrl+Scroll to zoom centered on your cursor position.",
  },
];

const tips = [
  "Use layers for better control — keep your sketch on one layer and colors on another.",
  "Adjust brush size for detail work — use small sizes for fine lines and large for broad strokes.",
  "Use Ctrl+Z to undo any mistake instantly, and Ctrl+Y to redo.",
  "Export as PNG for transparent backgrounds, JPG for white backgrounds.",
  "Try the Purple theme for a focused, immersive drawing experience.",
  "Hold H to quickly switch to the Hand tool for panning, then release to return to your last tool.",
];

export default function UserGuidePage({ onGoHome }: UserGuidePageProps) {
  const [activeSection, setActiveSection] = useState("welcome");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const { id } of sidebarSections) {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3, rootMargin: "-80px 0px -40% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => {
      for (const o of observers) o.disconnect();
    };
  }, []);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setSidebarOpen(false);
  };

  const setRef = (id: string) => {
    return (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    };
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "#0d0d0f",
        color: "#f0f0f5",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(13,13,15,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(168,85,247,0.2)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={onGoHome}
          data-ocid="guide.home.link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 10,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(168,85,247,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          <img
            src={LOGO_SRC}
            alt="Sketchora"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              objectFit: "cover",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f0f0f5",
              letterSpacing: "-0.3px",
            }}
          >
            Sketchora
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            User Guide
          </span>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            data-ocid="guide.sidebar_toggle.button"
            style={{
              display: "none",
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: 8,
              padding: "6px 8px",
              color: "#a855f7",
              cursor: "pointer",
            }}
            className="guide-hamburger"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter")
                setSidebarOpen(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 49,
            }}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className="guide-sidebar"
          style={{
            width: 220,
            flexShrink: 0,
            position: "sticky",
            top: 57,
            height: "calc(100vh - 57px)",
            overflowY: "auto",
            background: "rgba(255,255,255,0.025)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            padding: "20px 12px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              paddingLeft: 8,
            }}
          >
            Sections
          </p>
          {sidebarSections.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => scrollTo(s.id)}
              data-ocid={`guide.${s.id}.tab`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "none",
                background:
                  activeSection === s.id
                    ? "rgba(168,85,247,0.15)"
                    : "transparent",
                color:
                  activeSection === s.id ? "#a855f7" : "rgba(255,255,255,0.6)",
                fontWeight: activeSection === s.id ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                borderLeft:
                  activeSection === s.id
                    ? "2px solid #a855f7"
                    : "2px solid transparent",
                marginBottom: 2,
              }}
              onMouseEnter={(e) => {
                if (activeSection !== s.id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                if (activeSection !== s.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 15 }}>{s.icon}</span>
              {s.label}
              {activeSection === s.id && (
                <ChevronRight
                  size={13}
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                />
              )}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "40px 48px 80px",
            maxWidth: 860,
          }}
          className="guide-main"
        >
          {/* Section 1: Welcome */}
          <section
            ref={setRef("welcome")}
            id="welcome"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading icon="👋" title="Welcome to Sketchora" />
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.75,
                fontSize: 16,
                maxWidth: 640,
              }}
            >
              Sketchora is a powerful, browser-based drawing app designed for
              artists, designers, and creators. Draw, design, and create with
              professional tools — right in your browser. No installation, no
              plugins, just pure creativity.
            </p>
            <div
              style={{
                marginTop: 24,
                padding: "16px 20px",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>🎨</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Built for everyone — from quick sketches to detailed
                illustrations. Sketchora brings pro-level drawing tools to the
                browser with zero friction.
              </span>
            </div>
          </section>

          {/* Section 2: How to Use */}
          <section
            ref={setRef("how-to-use")}
            id="how-to-use"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading icon="📖" title="How to Use" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {steps.map((step) => (
                <motion.div
                  key={step.num}
                  whileHover={{ y: -2 }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    padding: "20px 18px",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(34,197,94,0.2))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a855f7",
                      marginBottom: 12,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#a855f7",
                        background: "rgba(168,85,247,0.15)",
                        borderRadius: 20,
                        padding: "2px 7px",
                      }}
                    >
                      Step {step.num}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#f0f0f5",
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.55)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Section 3: Features */}
          <section
            ref={setRef("features")}
            id="features"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading icon="✨" title="Features" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  whileHover={{
                    scale: 1.02,
                    borderColor: "rgba(168,85,247,0.4)",
                  }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "16px",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "rgba(34,197,94,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#22c55e",
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#f0f0f5",
                        marginBottom: 3,
                      }}
                    >
                      {f.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      {f.desc}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Section 4: Tools Guide */}
          <section
            ref={setRef("tools-guide")}
            id="tools-guide"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading icon="🛠️" title="Tools Guide" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tools.map((t) => (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "rgba(168,85,247,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a855f7",
                    }}
                  >
                    {t.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#f0f0f5",
                        marginBottom: 3,
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.55)",
                        lineHeight: 1.6,
                      }}
                    >
                      {t.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Tips */}
          <section ref={setRef("tips")} id="tips" style={{ marginBottom: 72 }}>
            <SectionHeading icon="💡" title="Tips &amp; Tricks" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tips.map((tip, i) => (
                <motion.div
                  key={tip.slice(0, 20)}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "14px 16px",
                    background: "rgba(255,193,7,0.04)",
                    border: "1px solid rgba(255,193,7,0.15)",
                    borderRadius: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <Lightbulb
                    size={16}
                    style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.6,
                    }}
                  >
                    {tip}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Section 6: Documentation */}
          <section
            ref={setRef("documentation")}
            id="documentation"
            style={{ marginBottom: 72 }}
          >
            <SectionHeading icon="📚" title="Documentation" />
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 15,
                lineHeight: 1.75,
                marginBottom: 24,
              }}
            >
              Understanding how Sketchora works under the hood helps you get the
              most out of it.
            </p>
            {[
              {
                title: "Object-Based Rendering",
                icon: <BookOpen size={16} />,
                body: "All drawings — brush strokes, shapes, text, and eraser paths — are stored as structured objects. The canvas always reconstructs from these objects using redraw(), so nothing is ever permanently lost and every action is undoable.",
              },
              {
                title: "Layer System",
                icon: <Layers size={16} />,
                body: "Each layer contains its own stack of objects. Layers can be reordered, hidden, locked, or given individual opacity. Drawing only affects the active layer, keeping your artwork organized.",
              },
              {
                title: "Page System",
                icon: <Square size={16} />,
                body: "Projects support multiple pages. Each page has its own independent set of layers and canvas state. Pages can be added, renamed, duplicated, or deleted without affecting other pages.",
              },
              {
                title: "Theme System",
                icon: <Star size={16} />,
                body: "Sketchora supports Dark, Light, and Purple themes using CSS variables. Themes apply instantly to all UI elements and are persisted in localStorage so your preference is remembered across sessions.",
              },
              {
                title: "Export System",
                icon: <Download size={16} />,
                body: "Export PNG uses a temporary canvas to render all layers without any background, producing a fully transparent output. Export JPG fills the background white first. Save/Save As serializes the entire project structure (pages, layers, objects, settings) into a .drw JSON file.",
              },
            ].map((doc) => (
              <div
                key={doc.title}
                style={{
                  marginBottom: 14,
                  padding: "16px 18px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                    color: "#a855f7",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {doc.icon}
                  {doc.title}
                </div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {doc.body}
                </p>
              </div>
            ))}
          </section>

          {/* Section 7: Credits */}
          <section
            ref={setRef("credits")}
            id="credits"
            style={{ marginBottom: 40 }}
          >
            <SectionHeading icon="❤️" title="Credits" />
            <motion.div
              whileHover={{ scale: 1.01 }}
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,197,94,0.08))",
                border: "1px solid rgba(168,85,247,0.35)",
                borderRadius: 18,
                padding: "36px 32px",
                textAlign: "center",
                boxShadow: "0 0 40px rgba(168,85,247,0.1)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#f0f0f5",
                  marginBottom: 8,
                }}
              >
                Made with ❤️ using Caffeine
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 20,
                  lineHeight: 1.7,
                }}
              >
                Big shoutout to Caffeine 🚀<br />
                Created by{" "}
                <span style={{ color: "#22c55e", fontWeight: 600 }}>Gulla</span>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: 50,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <span style={{ color: "#a855f7" }}>©</span>
                {new Date().getFullYear()} Sketchora · All rights reserved
              </div>
            </motion.div>

            <div style={{ textAlign: "center", marginTop: 40 }}>
              <button
                type="button"
                onClick={onGoHome}
                data-ocid="guide.back_home.button"
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  border: "none",
                  borderRadius: 50,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 28px rgba(168,85,247,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(168,85,247,0.4)";
                }}
              >
                ← Back to Home
              </button>
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .guide-sidebar {
            display: none !important;
          }
          .guide-hamburger {
            display: flex !important;
          }
          .guide-main {
            padding: 24px 20px 60px !important;
          }
        }
      `}</style>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#f0f0f5",
          margin: 0,
          background: "linear-gradient(90deg, #f0f0f5, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "rgba(255,255,255,0.07)",
          marginLeft: 8,
        }}
      />
    </div>
  );
}
