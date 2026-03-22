import {
  ChevronDown,
  Download,
  FileDown,
  FileImage,
  FilePlus,
  Menu,
  Minus,
  Moon,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  Sun,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { UIAccent, UITheme } from "../App";

const ZOOM_LEVELS = [10, 25, 50, 75, 100, 125, 150, 200, 300, 500];

const ACCENT_COLOR = "oklch(0.72 0.15 200)";
const ACCENT_BG = "oklch(0.72 0.15 200 / 0.12)";
const ACCENT_BORDER = "oklch(0.72 0.15 200 / 0.35)";

interface TopNavBarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo?: () => void;
  canUndo: boolean;
  onExport: () => void;
  onClear?: () => void;
  uiTheme: UITheme;
  uiAccent: UIAccent;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  colorTheme: "light" | "dark";
  onColorThemeChange: (t: "light" | "dark") => void;
  profileImage: string | null;
  onProfileImageChange: (url: string) => void;
  onSettingsOpen: () => void;
  onImportImage?: (file: File) => void;
  onNewProject?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExportPNG?: () => void;
  onExportJPG?: () => void;
}

function AutoFocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return <input ref={ref} {...props} />;
}

export default function TopNavBar({
  projectName,
  onProjectNameChange,
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  canUndo,
  onExport,
  onClear,
  uiTheme,
  brushColor,
  onBrushColorChange,
  colorTheme,
  onColorThemeChange,
  profileImage,
  onProfileImageChange,
  onImportImage,
  onNewProject,
  onSave,
  onSaveAs,
  onExportPNG,
  onExportJPG,
}: TopNavBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentColor =
    uiTheme === "purple" ? "oklch(0.65 0.22 290)" : ACCENT_COLOR;
  const accentBg =
    uiTheme === "purple" ? "oklch(0.65 0.22 290 / 0.12)" : ACCENT_BG;
  const accentBorder =
    uiTheme === "purple" ? "oklch(0.65 0.22 290 / 0.35)" : ACCENT_BORDER;
  const panelBg = uiTheme === "purple" ? "#120e1e" : "oklch(0.12 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.25 0.06 290)" : "oklch(0.22 0.005 240)";

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Reset confirm state on timeout
  useEffect(() => {
    if (confirmClear) {
      clearTimerRef.current = setTimeout(() => setConfirmClear(false), 3000);
    }
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [confirmClear]);

  const commitName = () => {
    setEditingName(false);
    if (nameValue.trim()) onProjectNameChange(nameValue.trim());
    else setNameValue(projectName);
  };

  const btnBase = {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer" as const,
    transition: "all 0.15s",
    color: "oklch(0.7 0.005 240)",
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) onProfileImageChange(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onImportImage) {
      onImportImage(file);
    }
    e.target.value = "";
  };

  const handleClearClick = () => {
    if (!confirmClear) {
      setConfirmClear(true);
    } else {
      setConfirmClear(false);
      onClear?.();
    }
  };

  const menuItems: {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    action: () => void;
    dividerAfter?: boolean;
  }[] = [
    {
      label: "New Project",
      icon: FilePlus,
      action: () => {
        setMenuOpen(false);
        onNewProject?.();
      },
      dividerAfter: true,
    },
    {
      label: "Import Image",
      icon: FileImage,
      action: () => {
        setMenuOpen(false);
        importInputRef.current?.click();
      },
      dividerAfter: true,
    },
    {
      label: "Save (.drw)",
      icon: Save,
      action: () => {
        setMenuOpen(false);
        onSave?.();
      },
    },
    {
      label: "Save As…",
      icon: Save,
      action: () => {
        setMenuOpen(false);
        onSaveAs?.();
      },
      dividerAfter: true,
    },
    {
      label: "Export PNG",
      icon: FileDown,
      action: () => {
        setMenuOpen(false);
        onExportPNG?.();
      },
    },
    {
      label: "Export JPG",
      icon: FileDown,
      action: () => {
        setMenuOpen(false);
        onExportJPG?.();
      },
      dividerAfter: true,
    },
    {
      label: "Share",
      icon: Share2,
      action: () => {
        setMenuOpen(false);
        setShowComingSoon(true);
      },
    },
  ];

  return (
    <>
      <header
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          flexShrink: 0,
          zIndex: 50,
          background: panelBg,
          borderBottom: `1px solid ${panelBorder}`,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.5)",
          transition: "background 0.3s ease",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Menu button */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              data-ocid="topnav.menu.button"
              style={{
                ...btnBase,
                width: 32,
                height: 32,
                background: menuOpen ? accentBg : "transparent",
                border: `1px solid ${menuOpen ? accentBorder : "transparent"}`,
                color: menuOpen ? accentColor : "oklch(0.7 0.005 240)",
              }}
              aria-label="Menu"
            >
              <Menu size={16} />
            </button>

            {menuOpen && (
              <div
                data-ocid="topnav.menu.dropdown_menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  background: "oklch(0.14 0.006 240)",
                  border: "1px solid oklch(0.24 0.005 240)",
                  borderRadius: 12,
                  padding: "6px",
                  zIndex: 200,
                  minWidth: 190,
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
                  animation: "float-in 0.15s ease-out",
                }}
              >
                {menuItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={item.action}
                        data-ocid={`topnav.menu.item.${idx + 1}`}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "none",
                          background: "transparent",
                          color: "oklch(0.78 0.005 240)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "oklch(0.2 0.005 240)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "oklch(0.95 0.005 240)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "transparent";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "oklch(0.78 0.005 240)";
                        }}
                      >
                        <Icon size={13} />
                        {item.label}
                      </button>
                      {item.dividerAfter && (
                        <div
                          style={{
                            height: 1,
                            background: "oklch(0.22 0.005 240)",
                            margin: "4px 0",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden import file input */}
          <input
            ref={importInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleImportChange}
            style={{ display: "none" }}
            data-ocid="topnav.import.upload_button"
          />

          {editingName ? (
            <AutoFocusInput
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setNameValue(projectName);
                }
                e.stopPropagation();
              }}
              data-ocid="topnav.project_name.input"
              style={{
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: 6,
                color: "oklch(0.95 0.005 240)",
                fontSize: 13,
                fontWeight: 600,
                padding: "3px 8px",
                outline: "none",
                width: 160,
                fontFamily: "inherit",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingName(true);
                setNameValue(projectName);
              }}
              data-ocid="topnav.project_name.input"
              style={{
                ...btnBase,
                padding: "4px 8px",
                fontSize: 13,
                fontWeight: 600,
                color: "oklch(0.9 0.005 240)",
                letterSpacing: "-0.01em",
                height: 28,
              }}
              className="hover:bg-white/8 hover:text-white"
              title="Click to rename"
            >
              {projectName}
            </button>
          )}

          {/* Undo / Redo / Clear Canvas */}
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
            <motion.button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              whileTap={{ scale: 0.92 }}
              data-ocid="topnav.undo.button"
              title="Undo (Ctrl+Z)"
              style={{
                ...btnBase,
                width: 30,
                height: 30,
                opacity: canUndo ? 1 : 0.3,
              }}
              className="hover:bg-white/8 hover:text-white disabled:cursor-not-allowed"
            >
              <Undo2 size={14} />
            </motion.button>

            <motion.button
              type="button"
              onClick={onRedo}
              whileTap={{ scale: 0.92 }}
              data-ocid="topnav.redo.button"
              title="Redo (Ctrl+Y)"
              style={{ ...btnBase, width: 30, height: 30, opacity: 0.5 }}
              className="hover:bg-white/8 hover:text-white"
            >
              <Redo2 size={14} />
            </motion.button>

            {/* Clear Canvas — two-tap confirmation */}
            <motion.button
              type="button"
              onClick={handleClearClick}
              whileTap={{ scale: 0.92 }}
              data-ocid="topnav.clear.button"
              title={
                confirmClear ? "Click again to confirm clear" : "Clear canvas"
              }
              style={{
                ...btnBase,
                width: confirmClear ? 80 : 30,
                height: 30,
                gap: 4,
                fontSize: confirmClear ? 10 : undefined,
                fontWeight: 600,
                overflow: "hidden",
                whiteSpace: "nowrap" as const,
                transition: "all 0.2s ease",
                background: confirmClear
                  ? "oklch(0.577 0.245 27.325 / 0.18)"
                  : "transparent",
                border: confirmClear
                  ? "1px solid oklch(0.577 0.245 27.325 / 0.5)"
                  : "1px solid transparent",
                color: confirmClear
                  ? "oklch(0.75 0.2 27)"
                  : "oklch(0.55 0.005 240)",
              }}
              className={
                confirmClear ? "" : "hover:bg-white/8 hover:text-white"
              }
            >
              <Trash2 size={13} />
              {confirmClear && "Confirm?"}
            </motion.button>
          </div>
        </div>

        {/* CENTER: Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(10, zoom - 10))}
            style={{ ...btnBase, width: 24, height: 24 }}
            className="hover:bg-white/8 hover:text-white"
            title="Zoom out (-10%)"
            data-ocid="topnav.zoom_out.button"
          >
            <Minus size={11} />
          </button>

          <input
            type="range"
            min={10}
            max={500}
            step={5}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            data-ocid="topnav.zoom.slider"
            style={{
              width: 80,
              height: 4,
              accentColor: accentColor,
              cursor: "pointer",
            }}
            title={`Zoom: ${zoom}%`}
          />

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowZoomMenu((v) => !v)}
              data-ocid="topnav.zoom.select"
              style={{
                ...btnBase,
                padding: "4px 6px",
                gap: 3,
                fontSize: 11,
                fontWeight: 600,
                color: "oklch(0.85 0.005 240)",
                border: `1px solid ${showZoomMenu ? accentBorder : "transparent"}`,
                background: showZoomMenu ? accentBg : "transparent",
                minWidth: 52,
                height: 26,
              }}
              className="hover:bg-white/8"
            >
              {zoom}%
              <ChevronDown size={9} style={{ opacity: 0.6 }} />
            </button>
            {showZoomMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "oklch(0.15 0.006 240)",
                  border: "1px solid oklch(0.25 0.005 240)",
                  borderRadius: 10,
                  padding: "4px",
                  zIndex: 100,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  minWidth: 80,
                  animation: "float-in 0.15s ease-out",
                }}
              >
                {ZOOM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      onZoomChange(level);
                      setShowZoomMenu(false);
                    }}
                    style={{
                      width: "100%",
                      height: 28,
                      borderRadius: 7,
                      border: "none",
                      background: zoom === level ? accentBg : "transparent",
                      color:
                        zoom === level ? accentColor : "oklch(0.7 0.005 240)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: zoom === level ? 700 : 400,
                      fontFamily: "inherit",
                    }}
                  >
                    {level}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onZoomChange(Math.min(500, zoom + 10))}
            style={{ ...btnBase, width: 24, height: 24 }}
            className="hover:bg-white/8 hover:text-white"
            title="Zoom in (+10%)"
            data-ocid="topnav.zoom_in.button"
          >
            <Plus size={11} />
          </button>

          <button
            type="button"
            onClick={() => onZoomChange(100)}
            data-ocid="topnav.zoom_reset.button"
            title="Reset zoom (100%)"
            style={{
              ...btnBase,
              width: 24,
              height: 24,
              opacity: zoom === 100 ? 0.3 : 0.8,
            }}
            className="hover:bg-white/8 hover:text-white"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          {/* Color picker swatch */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: brushColor,
              border: "2px solid rgba(255,255,255,0.12)",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              flexShrink: 0,
            }}
            title="Active brush color"
          >
            <input
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              data-ocid="topnav.color.input"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                cursor: "pointer",
                width: "100%",
                height: "100%",
              }}
              title="Pick color"
            />
          </div>

          <div
            style={{
              width: 1,
              height: 20,
              background: "oklch(0.25 0.005 240)",
            }}
          />

          {/* Theme toggle */}
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: "2px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              type="button"
              onClick={() => onColorThemeChange("light")}
              data-ocid="topnav.theme_light.toggle"
              title="Light mode"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  colorTheme === "light"
                    ? "rgba(255,255,255,0.12)"
                    : "transparent",
                color: colorTheme === "light" ? "#fbbf24" : "#6b6b70",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s ease",
              }}
            >
              <Sun size={14} />
            </button>
            <button
              type="button"
              onClick={() => onColorThemeChange("dark")}
              data-ocid="topnav.theme_dark.toggle"
              title="Dark mode"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  colorTheme === "dark"
                    ? "rgba(255,255,255,0.12)"
                    : "transparent",
                color: colorTheme === "dark" ? accentColor : "#6b6b70",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s ease",
              }}
            >
              <Moon size={14} />
            </button>
          </div>

          <div
            style={{
              width: 1,
              height: 20,
              background: "oklch(0.25 0.005 240)",
            }}
          />

          {/* Profile avatar */}
          <div style={{ position: "relative" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileUpload}
              data-ocid="topnav.profile.upload_button"
              style={{ display: "none" }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={() => {}}
              title="Upload profile picture"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: profileImage
                  ? "transparent"
                  : "oklch(0.65 0.18 160)",
                border: "2px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                "You"
              )}
            </div>
          </div>

          <div
            style={{
              width: 1,
              height: 20,
              background: "oklch(0.25 0.005 240)",
            }}
          />

          <motion.button
            type="button"
            onClick={() => onExportPNG?.() ?? onExport()}
            whileTap={{ scale: 0.95 }}
            data-ocid="topnav.export.button"
            title="Export as PNG"
            style={{
              ...btnBase,
              padding: "0 10px",
              height: 30,
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: "oklch(0.75 0.005 240)",
              border: "1px solid oklch(0.25 0.005 240)",
            }}
            className="hover:bg-white/8 hover:text-white hover:border-white/20"
          >
            <Download size={13} />
            Export
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            data-ocid="topnav.share.button"
            title="Share"
            onClick={() => setShowComingSoon(true)}
            style={{
              ...btnBase,
              padding: "0 10px",
              height: 30,
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              background: accentBg,
              color: accentColor,
              border: `1px solid ${accentBorder}`,
            }}
            className="hover:opacity-90"
          >
            <Share2 size={13} />
            Share
          </motion.button>
        </div>
      </header>

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowComingSoon(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowComingSoon(false);
          }}
          data-ocid="topnav.coming_soon.modal"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(14,14,24,0.98)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 20,
              padding: "40px 48px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
              minWidth: 280,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <h2
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: 700,
                margin: "0 0 8px",
              }}
            >
              Coming Soon
            </h2>
            <p
              style={{
                color: "rgba(180,180,210,0.75)",
                fontSize: 14,
                margin: "0 0 24px",
              }}
            >
              Share functionality is on its way!
            </p>
            <button
              type="button"
              onClick={() => setShowComingSoon(false)}
              data-ocid="topnav.coming_soon.close_button"
              style={{
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                borderRadius: 10,
                color: accentColor,
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 24px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <X
                size={12}
                style={{
                  display: "inline",
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              Close
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
