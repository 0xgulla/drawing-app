import { Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CreditModal from "./components/CreditModal";
import DrawingCanvas, {
  type BrushShape,
  type DrawingCanvasHandle,
  type LayerData,
  type LayerFilterData,
} from "./components/DrawingCanvas";
import type { VectorShapeType } from "./components/DrawingCanvas";
import FloatingBrushPanel from "./components/FloatingBrushPanel";
import FloatingEraserPanel from "./components/FloatingEraserPanel";
import FloatingSettingsModal from "./components/FloatingSettingsModal";
import FloatingShapePanel from "./components/FloatingShapePanel";
import FloatingTextPanel from "./components/FloatingTextPanel";
import type { TextOptions } from "./components/FloatingTextPanel";
import LandingPage from "./components/LandingPage";
import type { Layer, LayerFilter } from "./components/LayersPanel";
import LeftToolbar, { type DrawingTool } from "./components/LeftToolbar";
import PageBar from "./components/PageBar";
import PageTransitionLoader from "./components/PageTransitionLoader";
import RightPanel from "./components/RightPanel";
import SelectionOverlay from "./components/SelectionOverlay";
import TopNavBar from "./components/TopNavBar";
import UserGuidePage from "./components/UserGuidePage";

export type CanvasTheme = "light" | "dark";
export type ColorTheme = "light" | "dark" | "purple";
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
  Square: { width: 1024, height: 1024, label: "Square" },
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

const _CANVAS_BG_MAP: Record<CanvasTheme, string> = {
  light: "#ffffff",
  dark: "#1a1a2e",
};

type FullLayer = Layer & { strokes: LayerData["strokes"] };

function createDefaultLayer(id: number): FullLayer {
  return {
    id,
    name: `Layer ${id}`,
    visible: true,
    opacity: 100,
    locked: false,
    strokes: [],
  };
}

function createDefaultPage(pageId: number) {
  return {
    id: pageId,
    name: `Page ${pageId}`,
    layers: [createDefaultLayer(1)],
    activeLayerId: 1,
    canvasSize: PAGE_SIZE_MAP.Square,
    pageColor: "transparent",
    thumbnail: undefined as string | undefined,
  };
}

/** Merge DrawingCanvas LayerData updates back into our FullLayer array */
function mergeLayerData(
  current: FullLayer[],
  updated: LayerData[],
): FullLayer[] {
  return current.map((l) => {
    const u = updated.find((ul) => ul.id === l.id);
    if (!u) return l;
    return { ...l, strokes: u.strokes, visible: u.visible, opacity: u.opacity };
  });
}

export default function App({ onGoHome }: { onGoHome?: () => void } = {}) {
  // ─── Navigation ───────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<"landing" | "app" | "guide">(
    "landing",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateWithLoader = useCallback(
    (view: "landing" | "app" | "guide") => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentView(view);
        setIsTransitioning(false);
      }, 2300);
    },
    [],
  );

  // ─── Page / Layer state ───────────────────────────────────────────────
  const [pages, setPages] = useState(() => [createDefaultPage(1)]);
  const [activePageId, setActivePageId] = useState(1);
  const [layers, setLayers] = useState<FullLayer[]>(() => [
    createDefaultLayer(1),
  ]);
  const [activeLayerId, setActiveLayerId] = useState<number>(1);
  const [pageSizeKey, setPageSizeKey] = useState<PageSizeKey>("Square");
  const [pageColor, setPageColor] = useState("#ffffff");
  const [layerThumbnails, setLayerThumbnails] = useState<
    Record<number, string>
  >({});

  const saveLayersToPage = useCallback(
    (newLayers: FullLayer[]) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, layers: newLayers, activeLayerId }
            : p,
        ),
      );
    },
    [activePageId, activeLayerId],
  );

  useEffect(() => {
    const page = pages.find((p) => p.id === activePageId);
    if (page) {
      setLayers(page.layers);
      setActiveLayerId(page.activeLayerId);
    }
    // Clear undo/redo history when page changes
    setUndoStack([]);
    setRedoStack([]);
  }, [activePageId, pages]); // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only run on page change

  // ─── Tool state ────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawingTool>("brush");
  const [brushColor, setBrushColor] = useState("#a855f7");
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushHardness, setBrushHardness] = useState(100);
  const [brushShape, setBrushShape] = useState<BrushShape>("circle");
  const [brushSmoothing, setBrushSmoothing] = useState(50);
  const [pressureSim, setPressureSim] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [eraserSoftness, setEraserSoftness] = useState<"hard" | "soft">("hard");
  const fillTolerance = 32;
  const [zoom, setZoom] = useState(100);
  const [shapeType, setShapeType] = useState<VectorShapeType>("rect");
  const [colorHistory, setColorHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("colorHistory") ?? "[]");
    } catch {
      return [];
    }
  });

  // ─── Text tool ─────────────────────────────────────────────────────────
  const [textClickPos, setTextClickPos] = useState<{
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // ─── Selection rect (shared between canvas and overlay) ────────────────
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // ─── Theme ─────────────────────────────────────────────────────────────
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem("colorTheme") as ColorTheme) ?? "dark",
  );
  const [canvasTheme, setCanvasTheme] = useState<CanvasTheme>(
    () => (localStorage.getItem("canvasTheme") as CanvasTheme) ?? "dark",
  );
  const uiTheme: UITheme = colorTheme === "purple" ? "purple" : "default";
  const uiAccent = UI_ACCENT_MAP[uiTheme];

  useEffect(() => {
    localStorage.setItem("colorTheme", colorTheme);
    localStorage.setItem("canvasTheme", canvasTheme);
  }, [colorTheme, canvasTheme]);

  const handleColorThemeChange = useCallback((theme: ColorTheme) => {
    setColorTheme(theme);
  }, []);

  const handleUiThemeToggle = useCallback(() => {
    setColorTheme((prev) => (prev === "purple" ? "dark" : "purple"));
  }, []);

  // ─── Profile ───────────────────────────────────────────────────────────
  const [profileImage, setProfileImage] = useState<string | null>(() =>
    localStorage.getItem("profileImage"),
  );

  // ─── Panel visibility ──────────────────────────────────────────────────
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showEraserPanel, setShowEraserPanel] = useState(false);
  const [showShapePanel, setShowShapePanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // ─── Canvas ref ────────────────────────────────────────────────────────
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  // ─── Pan (hand tool) ──────────────────────────────────────────────────
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // ─── Eyedropper hover preview ─────────────────────────────────────────
  const [eyedropperPreview, setEyedropperPreview] = useState<{
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // ─── Undo / Redo ───────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<FullLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<FullLayer[][]>([]);

  const pushUndo = useCallback((snapshot: FullLayer[]) => {
    setUndoStack((prev) => [...prev.slice(-30), snapshot]);
    setRedoStack([]);
  }, []);

  // Called by DrawingCanvas just BEFORE committing a stroke — saves pre-stroke state
  const handleStrokeEnd = useCallback((preStrokeSnapshot: LayerData[]) => {
    // Convert LayerData[] to FullLayer[] for history
    setLayers((currentLayers) => {
      const snapshot = currentLayers.map((l) => {
        const sd = preStrokeSnapshot.find((d) => d.id === l.id);
        if (!sd) return l;
        return {
          ...l,
          strokes: sd.strokes,
          visible: sd.visible,
          opacity: sd.opacity,
        };
      });
      setUndoStack((prev) => {
        const next = [...prev, snapshot];
        if (next.length > 30) next.shift();
        return next;
      });
      setRedoStack([]);
      return currentLayers; // don't change layers, just save snapshot
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, layers]);
      setLayers(last);
      saveLayersToPage(last);
      return prev.slice(0, -1);
    });
  }, [layers, saveLayersToPage]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setUndoStack((u) => [...u, layers]);
      setLayers(next);
      saveLayersToPage(next);
      return prev.slice(0, -1);
    });
  }, [layers, saveLayersToPage]);

  // ─── Color history ─────────────────────────────────────────────────────
  const addColorToHistory = useCallback((color: string) => {
    setColorHistory((prev) => {
      const filtered = prev.filter((c) => c !== color);
      const next = [color, ...filtered].slice(0, 30);
      localStorage.setItem("colorHistory", JSON.stringify(next));
      return next;
    });
  }, []);

  // ─── Layer management ─────────────────────────────────────────────────
  const [layerFilters, setLayerFilters] = useState<Record<number, LayerFilter>>(
    {},
  );

  // Called by DrawingCanvas when strokes change (LayerData[] — no name/locked)
  const handleLayersChange = useCallback(
    (newLayerData: LayerData[]) => {
      setLayers((prev) => {
        const merged = mergeLayerData(prev, newLayerData);
        saveLayersToPage(merged);
        return merged;
      });
    },
    [saveLayersToPage],
  );

  const handleLayerFilterChange = useCallback(
    (id: number, filter: Partial<LayerFilter>) => {
      const defaults: LayerFilter = {
        blur: 0,
        brightness: 100,
        contrast: 100,
        opacity: 100,
      };
      setLayerFilters((prev) => ({
        ...prev,
        [id]: { ...defaults, ...prev[id], ...filter } as LayerFilter,
      }));
    },
    [],
  );

  const handleAddLayer = useCallback(() => {
    setLayers((prev) => {
      const newId = Math.max(...prev.map((l) => l.id), 0) + 1;
      const newLayer = createDefaultLayer(newId);
      const next = [...prev, newLayer];
      saveLayersToPage(next);
      setActiveLayerId(newId);
      return next;
    });
  }, [saveLayersToPage]);

  const handleDeleteLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((l) => l.id !== id);
        saveLayersToPage(next);
        if (activeLayerId === id) setActiveLayerId(next[next.length - 1].id);
        return next;
      });
    },
    [activeLayerId, saveLayersToPage],
  );

  const handleToggleVisible = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, visible: !l.visible } : l,
        );
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleRenameLayer = useCallback(
    (id: number, name: string) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, name } : l));
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleLayerOpacityChange = useCallback(
    (id: number, opacity: number) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, opacity } : l));
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleMoveLayer = useCallback(
    (id: number, direction: "up" | "down") => {
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const swap = direction === "up" ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= next.length) return prev;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleDuplicateLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const src = prev.find((l) => l.id === id);
        if (!src) return prev;
        const newId = Math.max(...prev.map((l) => l.id), 0) + 1;
        const copy = {
          ...src,
          id: newId,
          name: `${src.name} Copy`,
          strokes: [...src.strokes],
        };
        const idx = prev.findIndex((l) => l.id === id);
        const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
        saveLayersToPage(next);
        setActiveLayerId(newId);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleReorderLayers = useCallback(
    (newOrder: number[]) => {
      setLayers((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]));
        const next = newOrder
          .map((id) => map.get(id))
          .filter(Boolean) as FullLayer[];
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  const handleLockLayer = useCallback(
    (id: number) => {
      setLayers((prev) => {
        const next = prev.map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l,
        );
        saveLayersToPage(next);
        return next;
      });
    },
    [saveLayersToPage],
  );

  // ─── Page management ──────────────────────────────────────────────────
  const handleAddPage = useCallback(() => {
    const newId = Math.max(...pages.map((p) => p.id), 0) + 1;
    setPages((prev) => [...prev, createDefaultPage(newId)]);
    setActivePageId(newId);
    setPanOffset({ x: 0, y: 0 });
  }, [pages]);

  const handleDeletePage = useCallback(
    (pageId: number) => {
      if (pages.length <= 1) return;
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (activePageId === pageId) {
        const remaining = pages.filter((p) => p.id !== pageId);
        setActivePageId(remaining[0].id);
      }
    },
    [pages, activePageId],
  );

  const handleRenamePage = useCallback((pageId: number, name: string) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, name } : p)));
  }, []);

  const handleDuplicatePage = useCallback(
    (pageId: number) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const newId = Math.max(...pages.map((p) => p.id), 0) + 1;
      setPages((prev) => [
        ...prev,
        {
          ...page,
          id: newId,
          name: `${page.name} Copy`,
          layers: page.layers.map((l) => ({ ...l, strokes: [...l.strokes] })),
        },
      ]);
      setActivePageId(newId);
    },
    [pages],
  );

  const handleSelectPage = useCallback(
    (pageId: number) => {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, layers, activeLayerId } : p,
        ),
      );
      setActivePageId(pageId);
    },
    [activePageId, layers, activeLayerId],
  );

  // ─── New project ──────────────────────────────────────────────────────
  const handleNewProject = useCallback(() => {
    const fresh = [createDefaultPage(1)];
    setPages(fresh);
    setActivePageId(1);
    setLayers([createDefaultLayer(1)]);
    setActiveLayerId(1);
    setUndoStack([]);
    setRedoStack([]);
    setPanOffset({ x: 0, y: 0 });
    canvasRef.current?.clearCanvas();
  }, []);

  // ─── Save / Export ────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "sketchora-export.png";
    a.click();
  }, []);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.href = tmp.toDataURL("image/png");
    a.download = "sketchora.png";
    a.click();
  }, []);

  const handleExportJPG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.href = tmp.toDataURL("image/jpeg", 0.92);
    a.download = "sketchora.jpg";
    a.click();
  }, []);

  const handleSaveDrw = useCallback(() => {
    const data = JSON.stringify({
      pages,
      activePageId,
      pageSizeKey,
      pageColor,
      colorTheme,
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sketchora-project.drw";
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, activePageId, pageSizeKey, pageColor, colorTheme]);

  const handleSaveAs = useCallback(() => {
    const name =
      prompt("File name:", "sketchora-project") ?? "sketchora-project";
    const data = JSON.stringify({
      pages,
      activePageId,
      pageSizeKey,
      pageColor,
      colorTheme,
    });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.drw`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pages, activePageId, pageSizeKey, pageColor, colorTheme]);

  const handleImportImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height,
          1,
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        canvasRef.current?.bakeToFlatLayer?.();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearCanvas = useCallback(() => {
    pushUndo(layers);
    canvasRef.current?.clearCanvas();
  }, [layers, pushUndo]);

  // ─── Tool selection ───────────────────────────────────────────────────
  const handleToolChange = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    setShowBrushPanel(tool === "brush");
    setShowEraserPanel(tool === "eraser");
    setShowShapePanel(tool === "shape");
    if (tool !== "text") setTextClickPos(null);
  }, []);

  const handleTextClick = useCallback(
    (canvasX: number, canvasY: number, screenX: number, screenY: number) => {
      setTextClickPos({ canvasX, canvasY, screenX, screenY });
    },
    [],
  );

  const handleTextConfirm = useCallback(
    (opts: TextOptions) => {
      if (!textClickPos) return;
      canvasRef.current?.drawText?.(
        textClickPos.canvasX,
        textClickPos.canvasY,
        opts.text,
        opts.fontFamily,
        opts.fontSize,
        opts.bold ? "bold" : "normal",
        opts.italic ? "italic" : "normal",
        opts.color,
        opts.textAlign,
        opts.underline,
      );
      setTextClickPos(null);
    },
    [textClickPos],
  );

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((prev) =>
      Math.max(10, Math.min(500, prev - Math.sign(e.deltaY) * 10)),
    );
  }, []);

  // ─── Page size from key ───────────────────────────────────────────────
  const canvasPageSize = PAGE_SIZE_MAP[pageSizeKey] ?? PAGE_SIZE_MAP.Square;
  const canvasBg = pageColor === "transparent" ? "transparent" : pageColor;

  // Effective brush size for eraser vs brush
  const effectiveBrushSize = activeTool === "eraser" ? eraserSize : brushSize;

  // LayerFilterData compatible from LayerFilter
  const layerFiltersForCanvas: Record<number, LayerFilterData> =
    layerFilters as Record<number, LayerFilterData>;

  const activeLayerLocked =
    layers.find((l) => l.id === activeLayerId)?.locked ?? false;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <PageTransitionLoader isLoading={isTransitioning} />

      {currentView === "landing" && (
        <div style={{ opacity: 1, transition: "opacity 0.4s ease" }}>
          <LandingPage
            onLaunchApp={() => navigateWithLoader("app")}
            onShowLogin={() => navigateWithLoader("app")}
            onShowGuide={() => navigateWithLoader("guide")}
          />
        </div>
      )}

      {currentView === "guide" && (
        <UserGuidePage onGoHome={() => navigateWithLoader("landing")} />
      )}

      {currentView === "app" && (
        <div
          className="flex flex-col"
          style={{
            height: "100dvh",
            overflow: "hidden",
            background:
              colorTheme === "light"
                ? "#e8e8ec"
                : colorTheme === "purple"
                  ? "#0d0a1a"
                  : "#0d0d0f",
            transition: "background 0.4s ease",
          }}
        >
          <TopNavBar
            projectName="Untitled Project"
            onProjectNameChange={() => {}}
            zoom={zoom}
            onZoomChange={setZoom}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onExport={handleExport}
            onClear={handleClearCanvas}
            uiTheme={uiTheme}
            uiAccent={uiAccent}
            brushColor={brushColor}
            onBrushColorChange={setBrushColor}
            colorTheme={colorTheme}
            onColorThemeChange={handleColorThemeChange}
            profileImage={profileImage}
            onProfileImageChange={setProfileImage}
            onSettingsOpen={() => setShowSettingsModal((v) => !v)}
            onImportImage={handleImportImage}
            onNewProject={handleNewProject}
            onSave={handleSaveDrw}
            onSaveAs={handleSaveAs}
            onExportPNG={handleExportPNG}
            onExportJPG={handleExportJPG}
            onCanvasSettingsOpen={() => setShowSettingsModal((v) => !v)}
            onGoHome={() => {
              if (onGoHome) {
                onGoHome();
              } else {
                navigateWithLoader("landing");
              }
            }}
          />

          {showBrushPanel && (
            <FloatingBrushPanel
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              opacity={brushOpacity}
              onOpacityChange={setBrushOpacity}
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

          {showEraserPanel && (
            <FloatingEraserPanel
              eraserSize={eraserSize}
              onEraserSizeChange={setEraserSize}
              eraserSoftness={eraserSoftness}
              onEraserSoftnessChange={setEraserSoftness}
              accentColor={uiAccent.accent}
              onClose={() => setShowEraserPanel(false)}
            />
          )}

          {showShapePanel && (
            <FloatingShapePanel
              selectedShape={shapeType}
              onShapeSelect={setShapeType}
              accentColor={uiAccent.accent}
              onClose={() => setShowShapePanel(false)}
            />
          )}

          {textClickPos && (
            <FloatingTextPanel
              initialX={textClickPos.screenX}
              initialY={textClickPos.screenY}
              canvasX={textClickPos.canvasX}
              canvasY={textClickPos.canvasY}
              color={brushColor}
              accentColor={uiAccent.accent}
              onConfirm={handleTextConfirm}
              onCancel={() => setTextClickPos(null)}
            />
          )}

          {showSettingsModal && (
            <FloatingSettingsModal
              pageColor={pageColor}
              onPageColorChange={setPageColor}
              canvasTheme={canvasTheme}
              onCanvasThemeChange={setCanvasTheme}
              pageSizeKey={pageSizeKey}
              onPageSizeChange={setPageSizeKey}
              onClose={() => setShowSettingsModal(false)}
              accentColor={uiAccent.accent}
              accentBg={uiAccent.accentBg}
              accentBorder={uiAccent.accentBorder}
              onExport={handleExport}
            />
          )}

          {showCreditModal && (
            <CreditModal
              onClose={() => setShowCreditModal(false)}
              onStartDrawing={() => setShowCreditModal(false)}
            />
          )}

          <div
            className="flex flex-1"
            style={{ overflow: "hidden", position: "relative" }}
          >
            <LeftToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              brushColor={brushColor}
              uiTheme={uiTheme}
              uiAccent={uiAccent}
              colorHistory={colorHistory}
              onColorSelect={(c) => {
                setBrushColor(c);
                addColorToHistory(c);
              }}
              colorTheme={colorTheme}
            />

            <div
              className="flex flex-col flex-1"
              style={{ overflow: "hidden", position: "relative" }}
            >
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    colorTheme === "light"
                      ? "#d0d0d8"
                      : colorTheme === "purple"
                        ? "#100824"
                        : "#141418",
                  cursor:
                    activeTool === "pan"
                      ? isPanningRef.current
                        ? "grabbing"
                        : "grab"
                      : undefined,
                }}
                onWheel={handleCanvasWheel}
                onMouseDown={(e) => {
                  if (activeTool === "pan") {
                    isPanningRef.current = true;
                    panStartRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      ox: panOffset.x,
                      oy: panOffset.y,
                    };
                    e.preventDefault();
                  }
                }}
                onMouseMove={(e) => {
                  if (activeTool === "pan" && isPanningRef.current) {
                    setPanOffset({
                      x:
                        panStartRef.current.ox +
                        (e.clientX - panStartRef.current.x),
                      y:
                        panStartRef.current.oy +
                        (e.clientY - panStartRef.current.y),
                    });
                  }
                }}
                onMouseUp={() => {
                  isPanningRef.current = false;
                }}
                onMouseLeave={() => {
                  isPanningRef.current = false;
                }}
              >
                <div
                  style={{
                    position: "relative",
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    ...(canvasBg === "transparent"
                      ? {
                          backgroundImage:
                            "repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%)",
                          backgroundSize: "16px 16px",
                        }
                      : {}),
                  }}
                >
                  <DrawingCanvas
                    key={`page-${activePageId}`}
                    ref={canvasRef}
                    layers={layers}
                    activeLayerId={activeLayerId}
                    activeTool={activeTool}
                    brushColor={brushColor}
                    brushSize={effectiveBrushSize}
                    brushOpacity={brushOpacity}
                    brushHardness={brushHardness}
                    brushShape={brushShape}
                    fillTolerance={fillTolerance}
                    pageSize={{
                      width: canvasPageSize.width,
                      height: canvasPageSize.height,
                    }}
                    canvasBg={canvasBg}
                    zoom={zoom}
                    onLayersChange={handleLayersChange}
                    onStrokeEnd={handleStrokeEnd}
                    onColorPick={(color) => {
                      setBrushColor(color);
                      addColorToHistory(color);
                    }}
                    layerFilters={layerFiltersForCanvas}
                    onLayerThumbnailUpdate={setLayerThumbnails}
                    eraserSoftness={eraserSoftness}
                    selectionRect={selectionRect}
                    activeLayerLocked={activeLayerLocked}
                    shapeToolType={activeTool === "shape" ? shapeType : null}
                    onTextClick={handleTextClick}
                    onEyedropperMove={(color, x, y) =>
                      setEyedropperPreview(color ? { color, x, y } : null)
                    }
                  />
                  {eyedropperPreview && activeTool === "colorpicker" && (
                    <div
                      style={{
                        position: "fixed",
                        left: eyedropperPreview.x,
                        top: eyedropperPreview.y,
                        transform: "translate(-50%, -130%)",
                        zIndex: 9999,
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: eyedropperPreview.color,
                          border: "2px solid white",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                        }}
                      />
                      <span
                        style={{
                          background: "rgba(0,0,0,0.85)",
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "monospace",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {eyedropperPreview.color}
                      </span>
                    </div>
                  )}
                  <SelectionOverlay
                    active={activeTool === "select"}
                    canvasRef={canvasRef}
                    pageWidth={canvasPageSize.width}
                    pageHeight={canvasPageSize.height}
                    onSelectionChange={setSelectionRect}
                    zoom={zoom}
                  />
                </div>
              </div>

              <PageBar
                pages={pages}
                activePageId={activePageId}
                onSelectPage={handleSelectPage}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onRenamePage={handleRenamePage}
                onDuplicatePage={handleDuplicatePage}
                uiAccent={uiAccent}
              />
            </div>

            <RightPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSetActive={setActiveLayerId}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onToggleVisible={handleToggleVisible}
              onRenameLayer={handleRenameLayer}
              onOpacityChange={handleLayerOpacityChange}
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
              opacity={brushOpacity}
              onOpacityPropChange={setBrushOpacity}
              canvasTheme={canvasTheme}
              onThemeChange={setCanvasTheme}
              uiTheme={uiTheme}
              onUiThemeToggle={handleUiThemeToggle}
              pageSizeKey={pageSizeKey}
              onPageSizeChange={setPageSizeKey}
              onClear={handleClearCanvas}
              uiAccent={uiAccent}
              layerFilters={layerFilters}
              onLayerFilterChange={handleLayerFilterChange}
              layerThumbnails={layerThumbnails}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              padding: "4px 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              background:
                colorTheme === "light"
                  ? "#e0e0e8"
                  : colorTheme === "purple"
                    ? "#0a0617"
                    : "#0a0a0d",
            }}
          >
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Built with{" "}
              <Heart
                size={10}
                style={{ display: "inline", verticalAlign: "middle" }}
              />{" "}
              using caffeine.ai
            </a>
          </div>
        </div>
      )}
    </>
  );
}
