import {
  ChevronDown,
  Download,
  FileDown,
  FileImage,
  FilePlus,
  FolderOpen,
  Menu,
  Minus,
  Moon,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Share2,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { UIAccent, UITheme } from "../App";

const SKETCHORA_LOGO =
  "/assets/uploads/chatgpt_image_mar_27_2026_01_48_44_am-019d2c01-0e27-722f-ab9a-506ca29745d4-1.png";

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
  canRedo?: boolean;
  onExport: () => void;
  onClear?: () => void;
  uiTheme: UITheme;
  uiAccent: UIAccent;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  colorTheme: "light" | "dark" | "purple";
  onColorThemeChange: (t: "light" | "dark" | "purple") => void;
  profileImage: string | null;
  onProfileImageChange: (url: string) => void;
  onSettingsOpen: () => void;
  onImportImage?: (file: File) => void;
  onNewProject?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExportPNG?: () => void;
  onExportJPG?: () => void;
  onCanvasSettingsOpen?: () => void;
  onGoHome?: () => void;
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
  canRedo = false,
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
  onCanvasSettingsOpen,
  onGoHome,
}: TopNavBarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showOpenProjectModal, setShowOpenProjectModal] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [pfpLocked, setPfpLocked] = useState(
    () => localStorage.getItem("pfpLocked") === "true",
  );
  const [pfpDataUrl, setPfpDataUrl] = useState<string | null>(() =>
    localStorage.getItem("pfpDataUrl"),
  );
  const [showPfpConfirm, setShowPfpConfirm] = useState(false);
  const [pendingPfpFile, setPendingPfpFile] = useState<File | null>(null);
  const [pfpError, setPfpError] = useState<string | null>(null);
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
  const isLight = colorTheme === "light";
  const navBg = isLight ? "rgba(240,242,245,0.98)" : panelBg;
  const navBorder = isLight ? "#cdd0d8" : panelBorder;
  const navText = isLight ? "#1a1a2e" : "white";

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
    e.target.value = "";
    if (!file) return;
    if (pfpLocked) return;
    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setPfpError("Only JPG, PNG, or WebP images are accepted.");
      return;
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPfpError("Image must be under 5MB.");
      return;
    }
    setPfpError(null);
    setPendingPfpFile(file);
    setShowPfpConfirm(true);
  };

  const confirmPfpUpload = () => {
    if (!pendingPfpFile) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        localStorage.setItem("pfpDataUrl", url);
        localStorage.setItem("pfpLocked", "true");
        setPfpDataUrl(url);
        setPfpLocked(true);
        onProfileImageChange(url);
      }
    };
    reader.readAsDataURL(pendingPfpFile);
    setShowPfpConfirm(false);
    setPendingPfpFile(null);
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
          background: navBg,
          borderBottom: `1px solid ${navBorder}`,
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
          {/* Sketchora logo — click to go home */}
          {onGoHome && (
            <>
              {/* Home confirmation dialog */}
              {showHomeConfirm && (
                <div
                  data-ocid="home.dialog"
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={() => setShowHomeConfirm(false)}
                  onKeyDown={(e) =>
                    e.key === "Escape" && setShowHomeConfirm(false)
                  }
                  tabIndex={-1}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{
                      background: "rgba(15,12,28,0.95)",
                      border: "1px solid rgba(168,85,247,0.3)",
                      borderRadius: 18,
                      padding: "28px 32px",
                      maxWidth: 360,
                      width: "90vw",
                      boxShadow:
                        "0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "rgba(56,189,248,0.12)",
                          border: "1px solid rgba(56,189,248,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 16,
                            color: "#fff",
                            marginBottom: 4,
                          }}
                        >
                          Go to Home?
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.55)",
                            lineHeight: 1.5,
                          }}
                        >
                          Unsaved work may be lost.
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        data-ocid="home.dialog.cancel_button"
                        onClick={() => setShowHomeConfirm(false)}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.75)",
                          cursor: "pointer",
                          fontSize: 13,
                          transition: "all 0.15s",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        data-ocid="home.dialog.confirm_button"
                        onClick={() => {
                          setShowHomeConfirm(false);
                          onGoHome();
                        }}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 999,
                          border: "none",
                          background:
                            "linear-gradient(135deg, #38bdf8, #a855f7)",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                          transition: "all 0.15s",
                          boxShadow: "0 2px 12px rgba(56,189,248,0.3)",
                        }}
                      >
                        Go Home
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Clickable logo + name to trigger home dialog */}
              <button
                type="button"
                onClick={() => setShowHomeConfirm(true)}
                title="Go to Home"
                data-ocid="topnav.sketchora.button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginRight: 2,
                  flexShrink: 0,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 10,
                  transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(168,85,247,0.12)";
                  const span = e.currentTarget.querySelector("span");
                  if (span)
                    (span as HTMLElement).style.textShadow =
                      "0 0 18px rgba(168,85,247,0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  const span = e.currentTarget.querySelector("span");
                  if (span) (span as HTMLElement).style.textShadow = "none";
                }}
              >
                <img
                  src={SKETCHORA_LOGO}
                  alt="Sketchora"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: "-0.02em",
                    background:
                      "linear-gradient(135deg,#c4b5fd 0%,#6ee7b7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    transition: "text-shadow 0.18s",
                  }}
                >
                  Sketchora
                </span>
              </button>
            </>
          )}

          {/* Sketchora logo + name (standalone, no home) */}
          {!onGoHome && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 2,
                flexShrink: 0,
              }}
            >
              <img
                src={SKETCHORA_LOGO}
                alt="Sketchora"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(135deg,#c4b5fd 0%,#6ee7b7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Sketchora
              </span>
            </div>
          )}

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
              disabled={!canRedo}
              whileTap={{ scale: 0.92 }}
              data-ocid="topnav.redo.button"
              title="Redo (Ctrl+Y)"
              style={{
                ...btnBase,
                width: 30,
                height: 30,
                opacity: canRedo ? 1 : 0.3,
              }}
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

          {/* Theme toggle — 3-way: dark / light / purple */}
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
            <button
              type="button"
              onClick={() => onColorThemeChange("purple")}
              data-ocid="topnav.theme_purple.toggle"
              title="Purple mode"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background:
                  colorTheme === "purple"
                    ? "rgba(168,85,247,0.2)"
                    : "transparent",
                color: colorTheme === "purple" ? "#a855f7" : "#6b6b70",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.25s ease",
              }}
            >
              <Sparkles size={14} />
            </button>
          </div>

          {/* Canvas Settings button */}
          <button
            type="button"
            onClick={onCanvasSettingsOpen ?? (() => {})}
            data-ocid="topnav.canvas_settings.button"
            title="Canvas Settings"
            style={{
              ...btnBase,
              width: 30,
              height: 30,
              color: "oklch(0.6 0.005 240)",
            }}
            className="hover:bg-white/8 hover:text-white"
          >
            <Settings size={14} />
          </button>

          <div
            style={{
              width: 1,
              height: 20,
              background: "oklch(0.25 0.005 240)",
            }}
          />

          {/* Profile avatar - one-time PFP */}
          <div style={{ position: "relative" }}>
            {!pfpLocked && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileUpload}
                data-ocid="topnav.profile.upload_button"
                style={{ display: "none" }}
              />
            )}
            <div
              onClick={() => !pfpLocked && fileInputRef.current?.click()}
              onKeyDown={() => {}}
              title={
                pfpLocked
                  ? "Profile picture can only be set once"
                  : "Upload profile picture"
              }
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background:
                  pfpDataUrl || profileImage
                    ? "transparent"
                    : "linear-gradient(135deg,#7c3aed,#10b981)",
                border: pfpLocked
                  ? "2px solid rgba(124,58,237,0.5)"
                  : "2px solid rgba(255,255,255,0.1)",
                cursor: pfpLocked ? "default" : "pointer",
                overflow: "visible",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {pfpDataUrl || profileImage ? (
                  <img
                    src={pfpDataUrl || profileImage || ""}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 10 }}>You</span>
                )}
              </div>
              {pfpLocked && (
                <span
                  data-ocid="topnav.profile.locked_state"
                  style={{
                    position: "absolute",
                    bottom: -3,
                    right: -3,
                    fontSize: 10,
                    lineHeight: 1,
                    background: "#1a0f2e",
                    borderRadius: "50%",
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  🔒
                </span>
              )}
            </div>
            {/* PFP error message */}
            {pfpError && (
              <div
                data-ocid="topnav.profile.error_state"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#1a0f2e",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "#f87171",
                  whiteSpace: "nowrap",
                  zIndex: 300,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                {pfpError}
                <button
                  type="button"
                  onClick={() => setPfpError(null)}
                  style={{
                    marginLeft: 6,
                    background: "none",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            {/* PFP confirmation dialog */}
            {showPfpConfirm && (
              <div
                data-ocid="topnav.profile.dialog"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(6px)",
                  animation: "pfp-fade-in 0.2s ease",
                }}
                onClick={() => {
                  setShowPfpConfirm(false);
                  setPendingPfpFile(null);
                }}
                onKeyDown={(e) =>
                  e.key === "Escape" && setShowPfpConfirm(false)
                }
                role="presentation"
              >
                <div
                  style={{
                    background: "linear-gradient(135deg,#1a0f2e,#120e1e)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    borderRadius: 16,
                    padding: "28px 32px",
                    maxWidth: 360,
                    width: "90%",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                    animation:
                      "pfp-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      fontSize: 28,
                      textAlign: "center",
                      marginBottom: 12,
                    }}
                  >
                    📸
                  </div>
                  <h3
                    style={{
                      color: "#f0eaff",
                      fontWeight: 700,
                      fontSize: 16,
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    Set Profile Picture
                  </h3>
                  <p
                    style={{
                      color: "rgba(240,234,255,0.55)",
                      fontSize: 13,
                      textAlign: "center",
                      marginBottom: 24,
                      lineHeight: 1.6,
                    }}
                  >
                    Are you sure?{" "}
                    <strong style={{ color: "#c4b5fd" }}>
                      You can&apos;t change this later.
                    </strong>
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      data-ocid="topnav.profile.dialog.cancel_button"
                      onClick={() => {
                        setShowPfpConfirm(false);
                        setPendingPfpFile(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.75)",
                        cursor: "pointer",
                        fontSize: 13,
                        transition: "all 0.15s",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-ocid="topnav.profile.dialog.confirm_button"
                      onClick={confirmPfpUpload}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 999,
                        border: "none",
                        background: "linear-gradient(135deg,#7c3aed,#10b981)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        transition: "all 0.15s",
                        boxShadow: "0 2px 12px rgba(124,58,237,0.4)",
                      }}
                    >
                      Yes, Set It!
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            onClick={() => setShowOpenProjectModal(true)}
            whileTap={{ scale: 0.95 }}
            data-ocid="topnav.open_project.button"
            title="Open Project"
            style={{
              ...btnBase,
              padding: "0 10px",
              height: 30,
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: isLight ? "#555577" : "oklch(0.75 0.005 240)",
              border: isLight
                ? "1px solid #cdd0d8"
                : "1px solid oklch(0.25 0.005 240)",
            }}
            className="hover:bg-white/8 hover:text-white"
          >
            <FolderOpen size={13} />
            Open Project
          </motion.button>

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

      {/* Open Project Modal */}
      {showOpenProjectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowOpenProjectModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowOpenProjectModal(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isLight ? "#fff" : "#1a1a2e",
              border: `1px solid ${navBorder}`,
              borderRadius: 16,
              padding: "32px 40px",
              textAlign: "center",
              minWidth: 280,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            data-ocid="topnav.open_project.modal"
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
            <h3
              style={{
                color: navText,
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
                margin: "0 0 8px",
              }}
            >
              Coming Soon
            </h3>
            <p
              style={{
                color: isLight ? "#555577" : "oklch(0.55 0.005 240)",
                fontSize: 14,
                margin: "0 0 24px",
              }}
            >
              Open Project will be available in a future update.
            </p>
            <button
              type="button"
              onClick={() => setShowOpenProjectModal(false)}
              data-ocid="topnav.open_project.close_button"
              style={{
                marginTop: 4,
                padding: "8px 24px",
                borderRadius: 999,
                background: accentBg,
                color: accentColor,
                border: `1px solid ${accentBorder}`,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}

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
