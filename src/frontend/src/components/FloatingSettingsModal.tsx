import { Lock, Unlock, X } from "lucide-react";
import { useState } from "react";
import type { CanvasTheme, PageSizeKey } from "../App";

interface FloatingSettingsModalProps {
  pageColor: string;
  onPageColorChange: (c: string) => void;
  canvasTheme: CanvasTheme;
  onCanvasThemeChange: (t: CanvasTheme) => void;
  pageSizeKey: PageSizeKey;
  onPageSizeChange: (k: PageSizeKey) => void;
  onClose: () => void;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  onExport: () => void;
}

const PAGE_SIZES: PageSizeKey[] = ["A4", "A5", "Letter", "Square", "Custom"];

const CANVAS_PRESETS: {
  label: string;
  w: number;
  h: number;
  key: PageSizeKey;
}[] = [
  { label: "Square 1024", w: 1024, h: 1024, key: "Square" },
  { label: "Instagram", w: 1080, h: 1080, key: "Custom" },
  { label: "YouTube", w: 1280, h: 720, key: "Custom" },
  { label: "A4", w: 794, h: 1123, key: "A4" },
  { label: "Letter", w: 816, h: 1056, key: "Letter" },
];

export default function FloatingSettingsModal({
  pageColor,
  onPageColorChange,
  canvasTheme,
  onCanvasThemeChange,
  pageSizeKey,
  onPageSizeChange,
  onClose,
  accentColor,
  accentBg,
  accentBorder,
  onExport,
}: FloatingSettingsModalProps) {
  const bg = "rgba(16,16,20,0.98)";
  const border = "rgba(255,255,255,0.09)";
  const labelStyle = {
    fontSize: 10,
    fontWeight: 600 as const,
    color: "#6b6b70",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 6,
    display: "block",
  };

  const [bgType, setBgType] = useState<"transparent" | "white" | "custom">(
    pageColor === "transparent" || pageColor === "rgba(0,0,0,0)"
      ? "transparent"
      : pageColor === "#ffffff" || pageColor === "#fff"
        ? "white"
        : "custom",
  );

  const [lockAspect, setLockAspect] = useState(true);

  const handleBgType = (type: "transparent" | "white" | "custom") => {
    setBgType(type);
    if (type === "transparent") onPageColorChange("rgba(0,0,0,0)");
    else if (type === "white") onPageColorChange("#ffffff");
  };

  const handlePresetClick = (preset: (typeof CANVAS_PRESETS)[0]) => {
    onPageSizeChange(preset.key);
    // For non-standard presets, we would also need to pass dimensions
    // but since we use pageSizeKey, the key is what matters
  };

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 149,
          background: "transparent",
          border: "none",
          cursor: "default",
        }}
      />
      <div
        data-ocid="settings_modal.modal"
        style={{
          position: "fixed",
          right: 16,
          top: 58,
          width: 310,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 14,
          boxShadow: "0 16px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 150,
          overflow: "hidden",
          animation: "float-in 0.22s ease-out",
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: `1px solid ${border}`,
            position: "sticky",
            top: 0,
            background: bg,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e8ec" }}>
            Canvas Settings
          </span>
          <button
            type="button"
            onClick={onClose}
            data-ocid="settings_modal.close_button"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "none",
              background: "rgba(255,255,255,0.06)",
              color: "#6b6b70",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Canvas Size Presets */}
          <div>
            <span style={labelStyle}>Size Presets</span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 5,
              }}
            >
              {CANVAS_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  data-ocid="settings_modal.canvas_preset.button"
                  style={{
                    padding: "6px 4px",
                    borderRadius: 8,
                    border: `1px solid ${
                      pageSizeKey === preset.key
                        ? accentBorder
                        : "rgba(255,255,255,0.08)"
                    }`,
                    background:
                      pageSizeKey === preset.key
                        ? accentBg
                        : "rgba(255,255,255,0.03)",
                    color: pageSizeKey === preset.key ? accentColor : "#a1a1aa",
                    fontSize: 10,
                    fontWeight: pageSizeKey === preset.key ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                    textAlign: "center" as const,
                    lineHeight: 1.3,
                  }}
                >
                  <div>{preset.label}</div>
                  <div
                    style={{
                      fontSize: 9,
                      opacity: 0.6,
                      marginTop: 2,
                    }}
                  >
                    {preset.w}×{preset.h}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Page Size dropdown */}
          <div>
            <span style={labelStyle}>Page Format</span>
            <select
              value={pageSizeKey}
              onChange={(e) => onPageSizeChange(e.target.value as PageSizeKey)}
              data-ocid="settings_modal.page_size.select"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e8e8ec",
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
                fontFamily: "inherit",
                appearance: "none",
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s} style={{ background: "#1a1a1e" }}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect ratio lock */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setLockAspect((v) => !v)}
              data-ocid="settings_modal.lock_aspect.toggle"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: lockAspect ? accentBg : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  lockAspect ? accentBorder : "rgba(255,255,255,0.1)"
                }`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                color: lockAspect ? accentColor : "#a1a1aa",
                fontSize: 11,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {lockAspect ? <Lock size={12} /> : <Unlock size={12} />}
              <span>Lock aspect ratio</span>
            </button>
          </div>

          {/* Canvas Theme */}
          <div>
            <span style={labelStyle}>Canvas Theme</span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["light", "dark"] as CanvasTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onCanvasThemeChange(t)}
                  data-ocid={"settings_modal.canvas_theme.button"}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    border: `1.5px solid ${
                      canvasTheme === t
                        ? accentBorder
                        : "rgba(255,255,255,0.08)"
                    }`,
                    background:
                      canvasTheme === t ? accentBg : "rgba(255,255,255,0.03)",
                    color: canvasTheme === t ? accentColor : "#a1a1aa",
                    fontSize: 12,
                    fontWeight: canvasTheme === t ? 700 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize" as const,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <span style={labelStyle}>Background</span>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {(["transparent", "white", "custom"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleBgType(type)}
                  data-ocid={`settings_modal.bg_${type}.button`}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    borderRadius: 8,
                    border: `1.5px solid ${
                      bgType === type ? accentBorder : "rgba(255,255,255,0.08)"
                    }`,
                    background:
                      bgType === type ? accentBg : "rgba(255,255,255,0.03)",
                    color: bgType === type ? accentColor : "#a1a1aa",
                    fontSize: 10,
                    fontWeight: bgType === type ? 700 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize" as const,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            {bgType !== "transparent" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="color"
                  value={
                    bgType === "white"
                      ? "#ffffff"
                      : pageColor.startsWith("rgba")
                        ? "#ffffff"
                        : pageColor
                  }
                  onChange={(e) => {
                    setBgType("custom");
                    onPageColorChange(e.target.value);
                  }}
                  data-ocid="settings_modal.page_color.input"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    padding: 2,
                    background: "transparent",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    fontFamily: "monospace",
                  }}
                >
                  {bgType === "white" ? "#ffffff" : pageColor}
                </span>
              </div>
            )}
          </div>

          {/* Export Buttons */}
          <div>
            <span style={labelStyle}>Export</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  onExport();
                  onClose();
                }}
                data-ocid="settings_modal.export.button"
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 8,
                  border: `1.5px solid ${accentBorder}`,
                  background: accentBg,
                  color: accentColor,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                Export PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
