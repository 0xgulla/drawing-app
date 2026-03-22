import {
  Brush,
  Eraser,
  Hand,
  MousePointer2,
  PaintBucket,
  Pipette,
  Shapes,
  Type,
} from "lucide-react";
import { motion } from "motion/react";
import type React from "react";
import type { UIAccent, UITheme } from "../App";

export type DrawingTool =
  | "brush"
  | "eraser"
  | "shape"
  | "fill"
  | "text"
  | "select"
  | "colorpicker"
  | "pan"
  | "layers";

interface ToolDef {
  id: DrawingTool;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  shortcut: string;
  ocid: string;
}

const GROUP_NAVIGATION: ToolDef[] = [
  {
    id: "select",
    label: "Select",
    icon: MousePointer2,
    shortcut: "V",
    ocid: "toolbar.select.toggle",
  },
  {
    id: "pan",
    label: "Pan",
    icon: Hand,
    shortcut: "H",
    ocid: "toolbar.pan.toggle",
  },
];

const GROUP_DRAWING: ToolDef[] = [
  {
    id: "brush",
    label: "Brush",
    icon: Brush,
    shortcut: "B",
    ocid: "toolbar.brush.toggle",
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: Eraser,
    shortcut: "E",
    ocid: "toolbar.eraser.toggle",
  },
  {
    id: "shape",
    label: "Shapes",
    icon: Shapes,
    shortcut: "S",
    ocid: "toolbar.shape.toggle",
  },
  {
    id: "fill",
    label: "Fill Bucket",
    icon: PaintBucket,
    shortcut: "F",
    ocid: "toolbar.fill.toggle",
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
    shortcut: "T",
    ocid: "toolbar.text.toggle",
  },
];

const GROUP_UTILITY: ToolDef[] = [
  {
    id: "colorpicker",
    label: "Eyedropper",
    icon: Pipette,
    shortcut: "I",
    ocid: "toolbar.colorpicker.toggle",
  },
];

const TOOL_GROUPS: { key: string; tools: ToolDef[] }[] = [
  { key: "navigation", tools: GROUP_NAVIGATION },
  { key: "drawing", tools: GROUP_DRAWING },
  { key: "utility", tools: GROUP_UTILITY },
];

interface LeftToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  brushColor: string;
  uiTheme: UITheme;
  uiAccent: UIAccent;
  colorHistory?: string[];
  onColorSelect?: (color: string) => void;
}

export default function LeftToolbar({
  activeTool,
  onToolChange,
  brushColor,
  uiTheme,
  colorHistory,
  onColorSelect,
}: LeftToolbarProps) {
  const accentColor =
    uiTheme === "purple" ? "oklch(0.72 0.22 290)" : "oklch(0.72 0.15 200)";
  const accentBg =
    uiTheme === "purple"
      ? "oklch(0.65 0.22 290 / 0.15)"
      : "oklch(0.72 0.15 200 / 0.15)";
  const accentBorder =
    uiTheme === "purple"
      ? "oklch(0.65 0.22 290 / 0.45)"
      : "oklch(0.72 0.15 200 / 0.45)";
  const accentGlow =
    uiTheme === "purple"
      ? "0 0 12px oklch(0.65 0.22 290 / 0.4)"
      : "0 0 12px oklch(0.72 0.15 200 / 0.4)";
  const panelBg = uiTheme === "purple" ? "#0e0a1a" : "oklch(0.11 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.22 0.06 290)" : "oklch(0.2 0.005 240)";

  const renderTool = (tool: ToolDef) => {
    const isActive = activeTool === tool.id;
    const Icon = tool.icon;
    return (
      <motion.button
        key={tool.id}
        type="button"
        onClick={() => onToolChange(tool.id)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        data-ocid={tool.ocid}
        title={`${tool.label} (${tool.shortcut})`}
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          border: isActive
            ? `1px solid ${accentBorder}`
            : "1px solid transparent",
          background: isActive ? accentBg : "transparent",
          color: isActive ? accentColor : "oklch(0.6 0.005 240)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          boxShadow: isActive ? accentGlow : "none",
          outline: "none",
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
      </motion.button>
    );
  };

  return (
    <aside
      style={{
        width: 52,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 10px",
        gap: 2,
        background: panelBg,
        borderRight: `1px solid ${panelBorder}`,
        flexShrink: 0,
        zIndex: 40,
        boxShadow: "2px 0 16px rgba(0,0,0,0.3)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* TOOLS label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "oklch(0.35 0.005 240)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          textAlign: "center",
          padding: "10px 0 6px",
          width: "100%",
          flexShrink: 0,
        }}
      >
        TOOLS
      </div>

      {TOOL_GROUPS.map((group, gi) => (
        <div key={group.key} style={{ display: "contents" }}>
          {gi > 0 && (
            <div
              style={{
                width: 28,
                height: 1,
                background: "oklch(0.22 0.005 240)",
                margin: "6px 0",
                flexShrink: 0,
              }}
            />
          )}
          {group.tools.map(renderTool)}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Color history — 4×4 grid */}
      {colorHistory && colorHistory.length > 0 && (
        <div style={{ width: "100%", paddingBottom: 4 }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "oklch(0.3 0.005 240)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            HISTORY
          </div>
          <div
            style={{
              maxHeight: 120,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "thin",
              scrollbarColor: "oklch(0.28 0.005 240) transparent",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
                width: 44,
                margin: "0 auto",
                paddingBottom: 2,
              }}
            >
              {colorHistory.slice(0, 30).map((c, i) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable index ok
                  key={i}
                  type="button"
                  title={c}
                  onClick={() => onColorSelect?.(c)}
                  data-ocid={`toolbar.history.${i + 1}.button`}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 3,
                    background: c,
                    border:
                      c === brushColor
                        ? "2px solid white"
                        : "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                    transition: "transform 0.12s, box-shadow 0.12s",
                    boxShadow: c === brushColor ? `0 0 6px ${c}88` : "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "scale(1.2)";
                    (e.currentTarget as HTMLButtonElement).style.zIndex = "2";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      `0 2px 6px ${c}99`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "scale(1)";
                    (e.currentTarget as HTMLButtonElement).style.zIndex =
                      "auto";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      c === brushColor ? `0 0 6px ${c}88` : "none";
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current color swatch */}
      <div
        title="Active brush color"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: brushColor,
          border: "2px solid oklch(0.3 0.005 240)",
          marginBottom: 8,
          cursor: "default",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          flexShrink: 0,
        }}
      />
    </aside>
  );
}
