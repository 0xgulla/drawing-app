import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { UIAccent, UITheme } from "../App";
import type { BrushShape } from "./DrawingCanvas";
import LayersPanel, { type Layer, type LayerFilter } from "./LayersPanel";

interface RightPanelProps {
  layers: Layer[];
  activeLayerId: number;
  onSetActive: (id: number) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: number) => void;
  onToggleVisible: (id: number) => void;
  onRenameLayer: (id: number, name: string) => void;
  onOpacityChange: (id: number, opacity: number) => void;
  onMoveLayer: (id: number, direction: "up" | "down") => void;
  onDuplicateLayer: (id: number) => void;
  onReorderLayers: (newOrder: number[]) => void;
  onLockLayer: (id: number) => void;
  brushColor: string;
  onBrushColorChange: (c: string) => void;
  brushSize: number;
  onBrushSizeChange: (s: number) => void;
  brushShape: BrushShape;
  onBrushShapeChange: (s: BrushShape) => void;
  opacity: number;
  onOpacityPropChange: (o: number) => void;
  canvasTheme: string;
  onThemeChange: (t: import("../App").CanvasTheme) => void;
  uiTheme: UITheme;
  onUiThemeToggle: () => void;
  pageSizeKey: string;
  onPageSizeChange: (k: import("../App").PageSizeKey) => void;
  onClear: () => void;
  uiAccent: UIAccent;
  layerFilters?: Record<number, LayerFilter>;
  onLayerFilterChange?: (id: number, filter: Partial<LayerFilter>) => void;
  layerThumbnails?: Record<number, string>;
}

export default function RightPanel({
  layers,
  activeLayerId,
  onSetActive,
  onAddLayer,
  onDeleteLayer,
  onToggleVisible,
  onRenameLayer,
  onOpacityChange,
  onMoveLayer,
  onDuplicateLayer,
  onReorderLayers,
  onLockLayer,
  uiTheme,
  uiAccent,
  layerFilters = {},
  onLayerFilterChange,
  layerThumbnails = {},
}: RightPanelProps) {
  const panelBg = uiTheme === "purple" ? "#0e0a1a" : "oklch(0.11 0.006 240)";
  const panelBorder =
    uiTheme === "purple" ? "oklch(0.22 0.06 290)" : "oklch(0.2 0.005 240)";

  return (
    <aside
      data-ocid="rightpanel.panel"
      style={{
        width: 240,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        background: panelBg,
        borderLeft: `1px solid ${panelBorder}`,
        zIndex: 40,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          borderBottom: `1px solid ${panelBorder}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: uiAccent.accent,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Layers
        </span>
      </div>

      {/* Layers content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LayersPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onSetActive={onSetActive}
          onAddLayer={onAddLayer}
          onDeleteLayer={onDeleteLayer}
          onToggleVisible={onToggleVisible}
          onRenameLayer={onRenameLayer}
          onOpacityChange={onOpacityChange}
          onMoveLayer={onMoveLayer}
          onDuplicateLayer={onDuplicateLayer}
          onReorderLayers={onReorderLayers}
          onLockLayer={onLockLayer}
          layerFilters={layerFilters}
          onLayerFilterChange={onLayerFilterChange ?? (() => {})}
          thumbnails={layerThumbnails}
          uiTheme={uiTheme}
          uiAccent={uiAccent}
        />
      </div>
    </aside>
  );
}

// Keep type re-exports so other files that import from RightPanel still compile
export type { Layer, LayerFilter };
