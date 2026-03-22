import { Heart } from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import CreditModal from "./components/CreditModal";
import DrawingCanvas, {
  type BrushShape,
  type DrawingCanvasHandle,
  type LayerData,
} from "./components/DrawingCanvas";
import type { VectorShapeType } from "./components/DrawingCanvas";
import FloatingBrushPanel from "./components/FloatingBrushPanel";
import FloatingEraserPanel from "./components/FloatingEraserPanel";
import FloatingSettingsModal from "./components/FloatingSettingsModal";
import FloatingShapePanel from "./components/FloatingShapePanel";
import FloatingTextPanel from "./components/FloatingTextPanel";
import type { TextOptions } from "./components/FloatingTextPanel";
import type { LayerFilter } from "./components/LayersPanel";
import type { Layer } from "./components/LayersPanel";
import LeftToolbar, { type DrawingTool } from "./components/LeftToolbar";
import PageBar from "./components/PageBar";
import RightPanel from "./components/RightPanel";
import SelectionOverlay from "./components/SelectionOverlay";
import TopNavBar from "./components/TopNavBar";

export type CanvasTheme = "light" | "dark";
export type ColorTheme = "light" | "dark";
export type UITheme = "default" | "purple";
export type PageSizeKey = "A4" | "A5" | "Letter" | "Square" | "Custom";

export interface PageDimensions {
  width: number;
  height: number;
  label: string;
}

export const PAGE_SIZE_MAP: Record<PageSizeKey, PageDimensions> = {
  A4: { width: 794, height: 1123, label: "A4" },
  A5: { width: 559, height: 794, label: "A5" },
  Letter: { width: 816, height: 1056, label: "Letter" },
  Square: { width: 800, height: 800, label: "Square" },
  Custom: { width: 1200, height: 800, label: "Custom" },
};

export interface UIAccent {
  accent: string;
  accentBg: string;
  accentBorder: string;
  headerBg: string;
  headerBorder: string;
  hoverBg: string;
  logoBg: string;
  saveBg: string;
  saveHoverBg: string;
}

const UI_ACCENT_MAP: Record<UITheme, UIAccent> = {
  default: {
    accent: "oklch(0.72 0.15 200)",
    accentBg: "oklch(0.72 0.15 200 / 0.12)",
    accentBorder: "oklch(0.72 0.15 200 / 0.35)",
    headerBg: "oklch(0.12 0.006 240)",
    headerBorder: "oklch(0.2 0.005 240)",
    hoverBg: "oklch(0.18 0.005 240)",
    logoBg: "oklch(0.72 0.15 200)",
    saveBg: "oklch(0.72 0.15 200)",
    saveHoverBg: "oklch(0.78 0.15 200)",
  },
  purple: {
    accent: "oklch(0.72 0.22 290)",
    accentBg: "oklch(0.65 0.22 290 / 0.15)",
    accentBorder: "oklch(0.65 0.22 290 / 0.35)",
    headerBg: "#0e0a1a",
    headerBorder: "oklch(0.22 0.06 290)",
    hoverBg: "oklch(0.2 0.08 290)",
    logoBg: "oklch(0.65 0.22 290)",
    saveBg: "oklch(0.65 0.22 290)",
    saveHoverBg: "oklch(0.72 0.22 290)",
  },
};

const CANVAS_BG_MAP: Record<CanvasTheme, string> = {
  light: "#ffffff",
  dark: "#1a1a2e",
};

function createDefaultLayer(
  id: number,
): Layer & { strokes: LayerData["strokes"] } {
  return {
    id,
    name: `Layer ${id}`,
    visible: true,
    opacity: 100,
    locked: false,
    strokes: [],
  };
}

interface PageLayerState {
  layers: (Layer & { strokes: LayerData["strokes"] })[];
  activeLayerId: number;
}

interface Page {
  id: number;
  name: string;
  thumbnail?: string;
  layerState: PageLayerState;
}

export default function App() {
  const [brushColor, setBrushColor] = useState("#38bdf8");
  const [brushSize, setBrushSize] = useState(4);
  const [brushShape, setBrushShape] = useState<BrushShape>("circle");
  const [activeTool, setActiveTool] = useState<DrawingTool>("brush");
  const [opacity, setOpacity] = useState(100);
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>("dark");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("dark");
  const [pageColor, setPageColor] = useState("#ffffff");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [layerFilters, setLayerFilters] = useState<Record<number, LayerFilter>>(
    {},
  );
  const [layerThumbnails, setLayerThumbnails] = useState<
    Record<number, string>
  >({});
  const [brushSmoothing, setBrushSmoothing] = useState(50);
  const [brushHardness, setBrushHardness] = useState(100);
  const [pressureSim, setPressureSim] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [uiTheme, setUiTheme] = useState<UITheme>("default");
  const [pageSizeKey, setPageSizeKey] = useState<PageSizeKey>("A4");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [zoom, setZoom] = useState(100);
  const [pages, setPages] = useState<Page[]>([
    {
      id: 1,
      name: "Page 1",
      layerState: { layers: [createDefaultLayer(1)], activeLayerId: 1 },
    },
  ]);
  const [activePageId, setActivePageId] = useState(1);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [shapeToolType, setShapeToolType] = useState<VectorShapeType>("rect");
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [eyedropperColor, setEyedropperColor] = useState<string | null>(null);
  const [eyedropperPos, setEyedropperPos] = useState({ x: 0, y: 0 });
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const prevBrushColorRef = useRef(brushColor);
  const [startedPageIds, setStartedPageIds] = useState<Set<number>>(new Set());
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  // Eraser state
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserSoftness, setEraserSoftness] = useState<"hard" | "soft">("hard");
  const [showEraserPanel, setShowEraserPanel] = useState(false);
  // eraserCursorPos removed - cursor handled in DrawingCanvas overlay
  const [textPanel, setTextPanel] = useState<{
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [fillTolerance, setFillTolerance] = useState(32);
  const [activeSelectionRect, setActiveSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Pan state
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [panDragging, setPanDragging] = useState(false);
  const panStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    scrollX: number;
    scrollY: number;
  } | null>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const canvasBg = pageColor;
  const uiAccent = UI_ACCENT_MAP[uiTheme];
  const pageSize = PAGE_SIZE_MAP[pageSizeKey];

  const activePage = pages.find((p) => p.id === activePageId)!;
  const { layers: activeLayers, activeLayerId } = activePage.layerState;

  const canvasLayers: LayerData[] = activeLayers.map((l) => ({
    id: l.id,
    strokes: l.strokes,
    visible: l.visible,
    opacity: l.opacity,
  }));

  const layerPanelLayers: Layer[] = activeLayers.map((l) => ({
    id: l.id,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity,
    locked: l.locked ?? false,
  }));

  const activeLayerStrokeCount =
    activeLayers.find((l) => l.id === activeLayerId)?.strokes.length ?? 0;
  const activeLayerLocked =
    activeLayers.find((l) => l.id === activeLayerId)?.locked ?? false;
  const totalStrokeCount = activeLayers.reduce(
    (sum, l) => sum + l.strokes.length,
    0,
  );

  const setActiveLayerId = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, layerState: { ...p.layerState, activeLayerId: id } }
            : p,
        ),
      );
    },
    [activePageId],
  );

  const handleLayersChange = useCallback(
    (newLayers: LayerData[]) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const mergedLayers = p.layerState.layers.map((l) => {
            const updated = newLayers.find((nl) => nl.id === l.id);
            if (updated) {
              return {
                ...l,
                strokes: updated.strokes,
                visible: updated.visible,
                opacity: updated.opacity,
              };
            }
            return l;
          });
          return {
            ...p,
            layerState: { ...p.layerState, layers: mergedLayers },
          };
        }),
      );
    },
    [activePageId],
  );

  const handleUiThemeToggle = useCallback(() => {
    setUiTheme((prev) => (prev === "default" ? "purple" : "default"));
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: CanvasTheme) => {
      setCanvasTheme(newTheme);
      const newBg = CANVAS_BG_MAP[newTheme];
      const isColorDark = (hex: string) => {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.25;
      };
      if (
        newBg.startsWith("#") &&
        isColorDark(newBg) &&
        brushColor.startsWith("#") &&
        isColorDark(brushColor)
      ) {
        setBrushColor("#ffffff");
      } else if (
        !isColorDark(newBg.startsWith("#") ? newBg : "#ffffff") &&
        brushColor === "#ffffff"
      ) {
        setBrushColor("#1a1a1a");
      }
    },
    [brushColor],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      canvasRef.current?.undo?.();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "z"))
    ) {
      e.preventDefault();
      canvasRef.current?.redo?.();
    }
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const toolKeys: Record<string, DrawingTool> = {
      b: "brush",
      B: "brush",
      e: "eraser",
      E: "eraser",
      s: "select",
      S: "select",
      f: "fill",
      F: "fill",
      t: "text",
      T: "text",
      v: "select",
      V: "select",
      i: "colorpicker",
      I: "colorpicker",
      h: "pan",
      H: "pan",
    };
    if (toolKeys[e.key]) {
      const tool = toolKeys[e.key];
      setActiveTool(tool);
      if (tool === "eraser") setShowEraserPanel(true);
      if (tool === "brush") setShowBrushPanel(true);
    }
    if (e.key === "]") setBrushSize((s) => Math.min(80, s + 2));
    if (e.key === "[") setBrushSize((s) => Math.max(1, s - 2));
  }, []);

  // Init theme from localStorage before paint
  useLayoutEffect(() => {
    const saved = localStorage.getItem("drawingAppTheme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    // Sync colorTheme state
    if (saved === "light" || saved === "dark")
      setColorTheme(saved as ColorTheme);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleClear = useCallback(() => {
    // Clear all layers on the active page
    canvasRef.current?.clearCanvas();
    // Also wipe strokes from all layers so they don't re-render on top
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePageId) return p;
        return {
          ...p,
          layerState: {
            ...p.layerState,
            layers: p.layerState.layers.map((l) => ({ ...l, strokes: [] })),
          },
        };
      }),
    );
  }, [activePageId]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo?.();
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;
    exportCtx.fillStyle = canvasBg;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `drawing-page${activePageId}-${timestamp}.png`;
    const dataUrl = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activePageId, canvasBg]);

  const handleNewProject = useCallback(() => {
    setPages((prev) => {
      const newId =
        prev.length > 0 ? Math.max(...prev.map((p) => p.id)) + 1 : 2;
      setActivePageId(newId);
      setOverlayDismissed(false);
      return [
        ...prev,
        {
          id: newId,
          name: `Page ${newId}`,
          layerState: { layers: [createDefaultLayer(1)], activeLayerId: 1 },
        },
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDrw = useCallback(
    (customName?: string) => {
      const data = {
        version: 1,
        projectName,
        pageSizeKey,
        settings: { canvasTheme, pageColor },
        pages: pages.map((p) => ({
          id: p.id,
          name: p.name,
          layerState: {
            activeLayerId: p.layerState.activeLayerId,
            layers: p.layerState.layers.map((l) => ({
              id: l.id,
              name: l.name,
              visible: l.visible,
              opacity: l.opacity,
              locked: l.locked,
              strokes: l.strokes,
            })),
          },
        })),
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${customName || projectName || "drawing"}.drw`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [pages, projectName, pageSizeKey, canvasTheme, pageColor],
  );

  const handleSaveAs = useCallback(() => {
    const name = window.prompt("Save project as:", projectName || "drawing");
    if (name !== null) handleSaveDrw(name);
  }, [handleSaveDrw, projectName]);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    // Transparent background: do NOT fillRect
    ctx.drawImage(canvas, 0, 0);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/png");
    link.download = `${projectName || "drawing"}-${ts}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [projectName]);

  const handleExportJPG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    // White background for JPG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const link = document.createElement("a");
    link.href = exportCanvas.toDataURL("image/jpeg", 0.92);
    link.download = `${projectName || "drawing"}-${ts}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [projectName]);

  const handleImportImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const canvasW = canvas.width / dpr;
        const canvasH = canvas.height / dpr;
        let drawW = img.width;
        let drawH = img.height;
        if (drawW > canvasW || drawH > canvasH) {
          const scale = Math.min(canvasW / drawW, canvasH / drawH);
          drawW = drawW * scale;
          drawH = drawH * scale;
        }
        const x = (canvasW - drawW) / 2;
        const y = (canvasH - drawH) / 2;
        canvasRef.current?.saveHistory?.();
        ctx.drawImage(img, x, y, drawW, drawH);
        canvasRef.current?.bakeToFlatLayer?.();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleStartDrawingClick = useCallback(() => {
    setOverlayDismissed(false);
    setShowCreditModal(true);
  }, []);

  const handleModalStartDrawing = useCallback(() => {
    setShowCreditModal(false);
    setOverlayDismissed(true);
    setStartedPageIds((prev) => {
      const next = new Set(prev);
      next.add(activePageId);
      return next;
    });
  }, [activePageId]);

  const handleModalClose = useCallback(() => {
    setShowCreditModal(false);
    setOverlayDismissed(true);
    setStartedPageIds((prev) => {
      const next = new Set(prev);
      next.add(activePageId);
      return next;
    });
  }, [activePageId]);

  const handleRenamePage = useCallback((id: number, newName: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, name: newName.trim() || p.name } : p,
      ),
    );
  }, []);

  const handleAddPage = useCallback(() => {
    setPages((prev) => {
      const newId =
        prev.length > 0 ? Math.max(...prev.map((p) => p.id)) + 1 : 1;
      setActivePageId(newId);
      setOverlayDismissed(false);
      return [
        ...prev,
        {
          id: newId,
          name: `Page ${newId}`,
          layerState: { layers: [createDefaultLayer(1)], activeLayerId: 1 },
        },
      ];
    });
  }, []);

  const handleDeletePage = useCallback(
    (id: number) => {
      setPages((prev) => {
        if (prev.length <= 1) return prev;
        const filtered = prev.filter((p) => p.id !== id);
        if (id === activePageId) {
          const deletedIndex = prev.findIndex((p) => p.id === id);
          const nextPage =
            filtered[Math.min(deletedIndex, filtered.length - 1)];
          setActivePageId(nextPage.id);
        }
        return filtered;
      });
      setStartedPageIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [activePageId],
  );

  const handleDuplicatePage = useCallback((id: number) => {
    setPages((prev) => {
      const src = prev.find((p) => p.id === id);
      if (!src) return prev;
      const newId = Math.max(...prev.map((p) => p.id)) + 1;
      const copy: Page = {
        ...src,
        id: newId,
        name: `${src.name} copy`,
        thumbnail: src.thumbnail,
        layerState: {
          ...src.layerState,
          layers: src.layerState.layers.map((l) => ({
            ...l,
            strokes: [...l.strokes],
          })),
        },
      };
      const idx = prev.findIndex((p) => p.id === id);
      const newPages = [...prev];
      newPages.splice(idx + 1, 0, copy);
      setActivePageId(newId);
      return newPages;
    });
  }, []);

  const handleLayerFilterChange = useCallback(
    (id: number, filter: Partial<LayerFilter>) => {
      setLayerFilters((prev) => {
        const existing = prev[id] ?? {
          blur: 0,
          brightness: 100,
          contrast: 100,
          opacity: 100,
        };
        return { ...prev, [id]: { ...existing, ...filter } };
      });
    },
    [],
  );

  const handleAddLayer = useCallback(() => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePageId) return p;
        const maxId = Math.max(...p.layerState.layers.map((l) => l.id));
        const newLayer = createDefaultLayer(maxId + 1);
        return {
          ...p,
          layerState: {
            layers: [...p.layerState.layers, newLayer],
            activeLayerId: newLayer.id,
          },
        };
      }),
    );
  }, [activePageId]);

  const handleDeleteLayer = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          if (p.layerState.layers.length <= 1) return p;
          const filtered = p.layerState.layers.filter((l) => l.id !== id);
          const newActiveId =
            p.layerState.activeLayerId === id
              ? filtered[filtered.length - 1].id
              : p.layerState.activeLayerId;
          return {
            ...p,
            layerState: { layers: filtered, activeLayerId: newActiveId },
          };
        }),
      );
    },
    [activePageId],
  );

  const handleToggleLayerVisible = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, visible: !l.visible } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleLockLayer = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, locked: !l.locked } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleRenameLayer = useCallback(
    (id: number, name: string) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleLayerOpacity = useCallback(
    (id: number, opacityVal: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const newLayers = p.layerState.layers.map((l) =>
            l.id === id ? { ...l, opacity: opacityVal } : l,
          );
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleMoveLayer = useCallback(
    (id: number, direction: "up" | "down") => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const idx = p.layerState.layers.findIndex((l) => l.id === id);
          if (idx < 0) return p;
          const newLayers = [...p.layerState.layers];
          if (direction === "up" && idx < newLayers.length - 1) {
            [newLayers[idx], newLayers[idx + 1]] = [
              newLayers[idx + 1],
              newLayers[idx],
            ];
          } else if (direction === "down" && idx > 0) {
            [newLayers[idx], newLayers[idx - 1]] = [
              newLayers[idx - 1],
              newLayers[idx],
            ];
          }
          return { ...p, layerState: { ...p.layerState, layers: newLayers } };
        }),
      );
    },
    [activePageId],
  );

  const handleDuplicateLayer = useCallback(
    (id: number) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const idx = p.layerState.layers.findIndex((l) => l.id === id);
          if (idx < 0) return p;
          const src = p.layerState.layers[idx];
          const maxId = Math.max(...p.layerState.layers.map((l) => l.id));
          const copy = {
            ...src,
            id: maxId + 1,
            name: `${src.name} copy`,
            strokes: [...src.strokes],
          };
          const newLayers = [...p.layerState.layers];
          newLayers.splice(idx + 1, 0, copy);
          return {
            ...p,
            layerState: { layers: newLayers, activeLayerId: copy.id },
          };
        }),
      );
    },
    [activePageId],
  );

  const handleReorderLayers = useCallback(
    (newOrder: number[]) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const layerMap = new Map(p.layerState.layers.map((l) => [l.id, l]));
          const reordered = newOrder
            .map((id) => layerMap.get(id))
            .filter((l): l is (typeof p.layerState.layers)[number] => !!l);
          return { ...p, layerState: { ...p.layerState, layers: reordered } };
        }),
      );
    },
    [activePageId],
  );

  const addToColorHistory = useCallback((color: string) => {
    setColorHistory((prev) => {
      const filtered = prev.filter((c) => c !== color);
      return [color, ...filtered].slice(0, 30);
    });
  }, []);

  // Load colorHistory from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("drawingAppColorHistory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setColorHistory(parsed.slice(0, 30));
      } catch {}
    }
  }, []);

  // Persist colorHistory to localStorage
  useEffect(() => {
    localStorage.setItem(
      "drawingAppColorHistory",
      JSON.stringify(colorHistory),
    );
  }, [colorHistory]);

  // Track brushColor changes for history
  useEffect(() => {
    if (brushColor !== prevBrushColorRef.current) {
      prevBrushColorRef.current = brushColor;
      addToColorHistory(brushColor);
    }
  }, [brushColor, addToColorHistory]);

  const handleTextConfirm = useCallback(
    (opts: TextOptions) => {
      if (!textPanel) return;
      canvasRef.current?.drawText?.(
        textPanel.canvasX,
        textPanel.canvasY,
        opts.text,
        opts.fontFamily,
        opts.fontSize,
        opts.bold ? "700" : "400",
        opts.italic ? "italic" : "normal",
        opts.color,
        opts.textAlign,
        opts.underline,
      );
      setTextPanel(null);
    },
    [textPanel],
  );

  const handleEyedropperMove = useCallback(
    (color: string | null, x: number, y: number) => {
      setEyedropperColor(color);
      if (color) setEyedropperPos({ x, y });
    },
    [],
  );

  const handleColorPick = useCallback(
    (color: string) => {
      setBrushColor(color);
      setEyedropperColor(null);
      addToColorHistory(color);
      setActiveTool("brush");
    },
    [addToColorHistory],
  );

  // Pan handlers
  const handleWorkspaceMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "pan") return;
      e.preventDefault();
      const workspace = workspaceRef.current;
      if (!workspace) return;
      setPanDragging(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        scrollX: workspace.scrollLeft,
        scrollY: workspace.scrollTop,
      };
    },
    [activeTool],
  );

  const handleWorkspaceMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!panDragging || !panStartRef.current) return;
      const workspace = workspaceRef.current;
      if (!workspace) return;
      workspace.scrollLeft =
        panStartRef.current.scrollX - (e.clientX - panStartRef.current.mouseX);
      workspace.scrollTop =
        panStartRef.current.scrollY - (e.clientY - panStartRef.current.mouseY);
    },
    [panDragging],
  );

  const handleWorkspaceMouseUp = useCallback(() => {
    if (activeTool === "pan") {
      setPanDragging(false);
      panStartRef.current = null;
    }
  }, [activeTool]);

  const handleWorkspaceMouseLeave = useCallback(() => {
    if (activeTool === "pan") {
      setPanDragging(false);
      panStartRef.current = null;
    }
  }, [activeTool]);

  const handleWorkspaceWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const workspace = workspaceRef.current;
        if (!workspace) return;
        const rect = workspace.getBoundingClientRect();
        const mouseInWorkspaceX = e.clientX - rect.left + workspace.scrollLeft;
        const mouseInWorkspaceY = e.clientY - rect.top + workspace.scrollTop;
        const delta = e.deltaY > 0 ? -10 : 10;
        const currentZoom = zoomRef.current;
        const newZoom = Math.min(500, Math.max(10, currentZoom + delta));
        const scale = newZoom / currentZoom;
        setZoom(newZoom);
        requestAnimationFrame(() => {
          if (workspace) {
            workspace.scrollLeft =
              mouseInWorkspaceX * scale - (e.clientX - rect.left);
            workspace.scrollTop =
              mouseInWorkspaceY * scale - (e.clientY - rect.top);
          }
        });
      }
    },
    [],
  );

  const appId = encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "drawing-app",
  );

  const showEmptyHint =
    !overlayDismissed &&
    !startedPageIds.has(activePageId) &&
    totalStrokeCount === 0;

  // Effective brush size passed to canvas (eraser uses eraserSize)
  const effectiveBrushSize = activeTool === "eraser" ? eraserSize : brushSize;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: colorTheme === "light" ? "#e8e8ec" : "#0d0d0f",
        transition: "background 0.4s ease",
      }}
    >
      {showCreditModal && (
        <CreditModal
          onClose={handleModalClose}
          onStartDrawing={handleModalStartDrawing}
        />
      )}

      <TopNavBar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        zoom={zoom}
        onZoomChange={setZoom}
        onUndo={handleUndo}
        onRedo={() => canvasRef.current?.redo?.()}
        canUndo={activeLayerStrokeCount > 0 || totalStrokeCount > 0}
        onExport={handleSave}
        onClear={handleClear}
        uiTheme={uiTheme}
        uiAccent={uiAccent}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        colorTheme={colorTheme}
        onColorThemeChange={(t) => {
          setColorTheme(t);
          document.documentElement.setAttribute("data-theme", t);
          localStorage.setItem("drawingAppTheme", t);
        }}
        profileImage={profileImage}
        onProfileImageChange={setProfileImage}
        onSettingsOpen={() => setShowSettingsModal((v) => !v)}
        onNewProject={handleNewProject}
        onSave={handleSaveDrw}
        onSaveAs={handleSaveAs}
        onExportPNG={handleExportPNG}
        onExportJPG={handleExportJPG}
        onImportImage={handleImportImage}
      />

      {showBrushPanel && (
        <FloatingBrushPanel
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          opacity={opacity}
          onOpacityChange={setOpacity}
          hardness={brushHardness}
          onHardnessChange={setBrushHardness}
          brushColor={brushColor}
          onBrushColorChange={setBrushColor}
          brushShape={brushShape}
          onBrushShapeChange={setBrushShape}
          brushSmoothing={brushSmoothing}
          onBrushSmoothingChange={setBrushSmoothing}
          pressureSim={pressureSim}
          onPressureSimChange={setPressureSim}
          accentColor={uiAccent.accent}
          onClose={() => setShowBrushPanel(false)}
        />
      )}
      {showEraserPanel && activeTool === "eraser" && (
        <FloatingEraserPanel
          eraserSize={eraserSize}
          onEraserSizeChange={setEraserSize}
          eraserSoftness={eraserSoftness}
          onEraserSoftnessChange={setEraserSoftness}
          accentColor={uiAccent.accent}
          onClose={() => setShowEraserPanel(false)}
        />
      )}
      {showShapePanel && activeTool === "shape" && (
        <FloatingShapePanel
          selectedShape={shapeToolType}
          onShapeSelect={(s) => setShapeToolType(s)}
          accentColor={uiAccent.accent}
          onClose={() => setShowShapePanel(false)}
        />
      )}
      {textPanel && activeTool === "text" && (
        <FloatingTextPanel
          initialX={textPanel.screenX}
          initialY={textPanel.screenY}
          canvasX={textPanel.canvasX}
          canvasY={textPanel.canvasY}
          color={brushColor}
          accentColor={uiAccent.accent}
          onConfirm={handleTextConfirm}
          onCancel={() => setTextPanel(null)}
        />
      )}
      {showSettingsModal && (
        <FloatingSettingsModal
          pageColor={pageColor}
          onPageColorChange={setPageColor}
          canvasTheme={canvasTheme}
          onCanvasThemeChange={handleThemeChange}
          pageSizeKey={pageSizeKey}
          onPageSizeChange={setPageSizeKey}
          onClose={() => setShowSettingsModal(false)}
          accentColor={uiAccent.accent}
          accentBg={uiAccent.accentBg}
          accentBorder={uiAccent.accentBorder}
          onExport={handleSave}
        />
      )}
      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
      >
        <LeftToolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            if (tool === "brush") setShowBrushPanel(true);
            if (tool === "eraser") setShowEraserPanel(true);
            if (tool === "shape") setShowShapePanel(true);
          }}
          brushColor={brushColor}
          uiTheme={uiTheme}
          uiAccent={uiAccent}
          colorHistory={colorHistory}
          onColorSelect={(c) => {
            setBrushColor(c);
            addToColorHistory(c);
          }}
        />

        {/* Canvas workspace */}
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{ position: "relative", minWidth: 0 }}
        >
          {/* Dot-grid canvas area */}
          <div
            ref={workspaceRef}
            className="flex-1 canvas-workspace overflow-auto"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 40,
              cursor:
                activeTool === "pan"
                  ? panDragging
                    ? "grabbing"
                    : "grab"
                  : "default",
            }}
            onMouseDown={handleWorkspaceMouseDown}
            onMouseMove={handleWorkspaceMouseMove}
            onMouseUp={handleWorkspaceMouseUp}
            onMouseLeave={handleWorkspaceMouseLeave}
            onWheel={handleWorkspaceWheel}
          >
            <div
              style={{
                position: "relative",
                width: pageSize.width * (zoom / 100),
                height: pageSize.height * (zoom / 100),
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: pageSize.width,
                  height: pageSize.height,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                }}
              >
                <DrawingCanvas
                  ref={canvasRef}
                  brushColor={brushColor}
                  brushSize={effectiveBrushSize}
                  brushShape={brushShape}
                  activeTool={activeTool}
                  brushOpacity={opacity}
                  layers={canvasLayers}
                  activeLayerId={activeLayerId}
                  onLayersChange={handleLayersChange}
                  canvasBg={canvasBg}
                  pageSize={pageSize}
                  layerFilters={layerFilters}
                  onLayerThumbnailUpdate={setLayerThumbnails}
                  onColorPick={handleColorPick}
                  onEyedropperMove={handleEyedropperMove}
                  fillTolerance={fillTolerance}
                  selectionRect={
                    activeTool === "select" ? activeSelectionRect : null
                  }
                  eraserSoftness={eraserSoftness}
                  brushHardness={brushHardness}
                  onTextClick={(cx, cy, sx, sy) =>
                    setTextPanel({
                      canvasX: cx,
                      canvasY: cy,
                      screenX: sx,
                      screenY: sy,
                    })
                  }
                  zoom={zoom}
                  activeLayerLocked={activeLayerLocked}
                  shapeToolType={activeTool === "shape" ? shapeToolType : null}
                />
                <SelectionOverlay
                  active={activeTool === "select"}
                  canvasRef={canvasRef}
                  pageWidth={pageSize.width}
                  pageHeight={pageSize.height}
                  onSelectionChange={setActiveSelectionRect}
                  zoom={zoom}
                />
                {showEmptyHint && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ animation: "fade-in 0.6s ease-out" }}
                  >
                    <button
                      type="button"
                      className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl cursor-pointer"
                      style={{
                        background: "oklch(0.15 0.006 240 / 0.92)",
                        border: "1px solid oklch(0.25 0.005 240)",
                        backdropFilter: "blur(16px)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      }}
                      onClick={handleStartDrawingClick}
                      data-ocid="drawing.start_drawing.button"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: uiAccent.accentBg,
                          border: `1px solid ${uiAccent.accentBorder}`,
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={uiAccent.accent}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          role="img"
                          aria-label="Drawing pencil icon"
                        >
                          <title>Drawing pencil icon</title>
                          <path d="M12 19l7-7 3 3-7 7-3-3z" />
                          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                          <path d="M2 2l7.586 7.586" />
                          <circle cx="11" cy="11" r="2" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "oklch(0.92 0.005 240)" }}
                        >
                          Start Drawing
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "oklch(0.5 0.005 240)" }}
                        >
                          Click and drag to draw &middot;{" "}
                          <kbd
                            className="px-1 py-0.5 rounded text-xs"
                            style={{
                              background: "oklch(0.2 0.005 240)",
                              color: "oklch(0.7 0.005 240)",
                            }}
                          >
                            B
                          </kbd>{" "}
                          brush &middot;{" "}
                          <kbd
                            className="px-1 py-0.5 rounded text-xs"
                            style={{
                              background: "oklch(0.2 0.005 240)",
                              color: "oklch(0.7 0.005 240)",
                            }}
                          >
                            E
                          </kbd>{" "}
                          eraser
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page bar at bottom */}
          <PageBar
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => {
              // Save thumbnail of current page before switching
              const thumb = canvasRef.current?.getCompositeThumbnail?.();
              if (thumb) {
                setPages((prev) =>
                  prev.map((p) =>
                    p.id === activePageId ? { ...p, thumbnail: thumb } : p,
                  ),
                );
              }
              setActivePageId(id);
              if (!startedPageIds.has(id)) setOverlayDismissed(false);
            }}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onRenamePage={handleRenamePage}
            onDuplicatePage={handleDuplicatePage}
            uiAccent={uiAccent}
          />
        </main>

        <RightPanel
          layers={layerPanelLayers}
          activeLayerId={activeLayerId}
          onSetActive={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onToggleVisible={handleToggleLayerVisible}
          onRenameLayer={handleRenameLayer}
          onOpacityChange={handleLayerOpacity}
          onMoveLayer={handleMoveLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onReorderLayers={handleReorderLayers}
          onLockLayer={handleLockLayer}
          brushColor={brushColor}
          onBrushColorChange={setBrushColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          brushShape={brushShape}
          onBrushShapeChange={setBrushShape}
          opacity={opacity}
          onOpacityPropChange={setOpacity}
          canvasTheme={canvasTheme}
          onThemeChange={handleThemeChange}
          uiTheme={uiTheme}
          onUiThemeToggle={handleUiThemeToggle}
          pageSizeKey={pageSizeKey}
          onPageSizeChange={setPageSizeKey}
          onClear={handleClear}
          uiAccent={uiAccent}
          layerFilters={layerFilters}
          onLayerFilterChange={handleLayerFilterChange}
          layerThumbnails={layerThumbnails}
        />
      </div>

      {/* Fill tool tolerance panel */}
      {activeTool === "fill" && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(18,18,28,0.97)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: 12,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 9000,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            pointerEvents: "all",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(160,160,180,0.8)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Fill Tolerance
          </span>
          <input
            type="range"
            min={0}
            max={128}
            value={fillTolerance}
            onChange={(e) => setFillTolerance(Number(e.target.value))}
            data-ocid="fill.tolerance.slider"
            style={{
              width: 120,
              accentColor: uiAccent.accent,
              cursor: "pointer",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "rgba(200,200,220,0.9)",
              minWidth: 24,
              textAlign: "center",
            }}
          >
            {fillTolerance}
          </span>
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <div
            title="Fill color"
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: brushColor,
              border: "2px solid rgba(255,255,255,0.25)",
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* Eyedropper color preview overlay */}
      {eyedropperColor && activeTool === "colorpicker" && (
        <div
          style={{
            position: "fixed",
            left: eyedropperPos.x + 16,
            top: eyedropperPos.y - 50,
            pointerEvents: "none",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: eyedropperColor,
              border: "3px solid white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
            }}
          />
          <div
            style={{
              background: "rgba(10,10,20,0.92)",
              color: "white",
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 4,
              fontFamily: "monospace",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              letterSpacing: "0.05em",
            }}
          >
            {eyedropperColor.toUpperCase()}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="flex items-center justify-center gap-1.5 py-1.5 text-xs"
        style={{
          background: uiAccent.headerBg,
          borderTop: `1px solid ${uiAccent.headerBorder}`,
          color: "oklch(0.4 0.005 240)",
          flexShrink: 0,
        }}
      >
        <span>Built with</span>
        <Heart size={10} fill={uiAccent.accent} stroke={uiAccent.accent} />
        <span>using</span>
        <a
          href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{ color: uiAccent.accent }}
        >
          caffeine.ai
        </a>
        <span>&middot; &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
