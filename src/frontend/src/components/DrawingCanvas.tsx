import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { DrawingTool } from "./LeftToolbar";

export type BrushShape =
  | "circle"
  | "square"
  | "rectangle"
  | "triangle"
  | "diamond"
  | "star"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "cross"
  | "arrow"
  | "heart";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
  shape: BrushShape;
  opacity: number;
  eraserSoftness?: "hard" | "soft";
  hardness?: number;
}

export interface LayerData {
  id: number;
  strokes: Stroke[];
  visible: boolean;
  opacity: number;
}

export interface DrawingCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  clearCanvas: () => void;
  undoStroke: () => void;
  getImageData: (
    x: number,
    y: number,
    w: number,
    h: number,
  ) => ImageData | null;
  putImageData: (data: ImageData, x: number, y: number) => void;
  clearRegion: (x: number, y: number, w: number, h: number) => void;
  moveStrokesInRegion: (
    origRect: { x: number; y: number; w: number; h: number },
    dx: number,
    dy: number,
  ) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  snapshotCanvas: () => ImageData | null;
  bakeToFlatLayer?: () => void;
  getCompositeThumbnail?: () => string | null;
  drawText?: (
    x: number,
    y: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    fontWeight: string,
    fontStyle: string,
    color: string,
    textAlign: CanvasTextAlign,
    underline: boolean,
  ) => void;
}

export interface LayerFilterData {
  blur: number;
  brightness: number;
  contrast: number;
  opacity: number;
}

interface DrawingCanvasProps {
  brushColor: string;
  brushSize: number;
  activeTool: DrawingTool;
  brushShape: BrushShape;
  brushOpacity: number;
  layers: LayerData[];
  activeLayerId: number;
  onLayersChange: (layers: LayerData[]) => void;
  canvasBg: string;
  pageSize: { width: number; height: number };
  layerFilters?: Record<number, LayerFilterData>;
  onLayerThumbnailUpdate?: (thumbnails: Record<number, string>) => void;
  onColorPick?: (color: string) => void;
  onEyedropperMove?: (color: string | null, x: number, y: number) => void;
  eraserSoftness?: "hard" | "soft";
  brushHardness?: number;
  onCursorMove?: (x: number, y: number) => void;
  onCursorLeave?: () => void;
  fillTolerance?: number;
  selectionRect?: { x: number; y: number; w: number; h: number } | null;
  zoom?: number;
  activeLayerLocked?: boolean;
  shapeToolType?: string | null;
  onTextClick?: (
    canvasX: number,
    canvasY: number,
    screenX: number,
    screenY: number,
  ) => void;
}

export type VectorShapeType =
  | "rect"
  | "circle"
  | "line"
  | "triangle"
  | "arrow"
  | "star"
  | "polygon";

// ---------- flood fill helpers ----------
function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
    255,
  ];
}

function colorSimilar(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number,
  tol = 32,
): boolean {
  return (
    Math.abs(r1 - r2) +
      Math.abs(g1 - g2) +
      Math.abs(b1 - b2) +
      Math.abs(a1 - a2) <=
    tol * 4
  );
}

/**
 * Proper flood fill - stack-based BFS, no recursion.
 * Works in physical canvas pixel space (accounts for devicePixelRatio).
 * Returns the modified ImageData (already applied to canvas).
 */
function floodFill(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  fillHex: string,
  tolerance = 32,
  selectionRect?: { x: number; y: number; w: number; h: number } | null,
): ImageData | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  // cx/cy are in logical CSS canvas space → convert to physical pixel coords
  const px = Math.round(cx * dpr);
  const py = Math.round(cy * dpr);
  const w = canvas.width; // physical pixels
  const h = canvas.height; // physical pixels

  if (px < 0 || px >= w || py < 0 || py >= h) return null;

  // Selection bounds in physical pixel space
  let minX = 0;
  let minY = 0;
  let maxX = w - 1;
  let maxY = h - 1;
  if (selectionRect && selectionRect.w > 2 && selectionRect.h > 2) {
    minX = Math.max(0, Math.round(selectionRect.x * dpr));
    minY = Math.max(0, Math.round(selectionRect.y * dpr));
    maxX = Math.min(
      w - 1,
      Math.round((selectionRect.x + selectionRect.w) * dpr) - 1,
    );
    maxY = Math.min(
      h - 1,
      Math.round((selectionRect.y + selectionRect.h) * dpr) - 1,
    );
    if (px < minX || px > maxX || py < minY || py > maxY) return null;
  }

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Target color (color of the clicked pixel)
  const targetIdx = (py * w + px) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  const [fr, fg, fb, fa] = hexToRgba(fillHex);

  // If target color is already the fill color (within tolerance), skip
  if (colorSimilar(tr, tg, tb, ta, fr, fg, fb, fa, tolerance)) return null;

  const visited = new Uint8Array(w * h);
  const stack: number[] = [py * w + px];

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const x = idx % w;
    const y = Math.floor(idx / w);

    // Respect bounds
    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    const di = idx * 4;
    // Check if this pixel matches the target color
    if (
      !colorSimilar(
        data[di],
        data[di + 1],
        data[di + 2],
        data[di + 3],
        tr,
        tg,
        tb,
        ta,
        tolerance,
      )
    )
      continue;

    // Paint the pixel
    data[di] = fr;
    data[di + 1] = fg;
    data[di + 2] = fb;
    data[di + 3] = fa;

    // Push neighbors
    if (x > minX) stack.push(idx - 1);
    if (x < maxX) stack.push(idx + 1);
    if (y > minY) stack.push(idx - w);
    if (y < maxY) stack.push(idx + w);
  }

  ctx.putImageData(imageData, 0, 0);
  return imageData;
}
// ----------------------------------------

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  rotation = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + rotation;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: BrushShape,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
) {
  const savedAlpha = ctx.globalAlpha;
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const r = size / 2;
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "square":
      ctx.rect(x - r, y - r, size, size);
      ctx.fill();
      break;
    case "rectangle": {
      const hw = r;
      const hh = r * 0.5;
      ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
      ctx.fill();
      break;
    }
    case "triangle": {
      const h = size;
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + h / 2, y + h / 2);
      ctx.lineTo(x - h / 2, y + h / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "diamond": {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "star": {
      const outerR = r;
      const innerR = r * 0.45;
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR : innerR;
        const px = x + Math.cos(angle) * rad;
        const py = y + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "pentagon":
      drawPolygon(ctx, x, y, r, 5, -Math.PI / 2);
      ctx.fill();
      break;
    case "hexagon":
      drawPolygon(ctx, x, y, r, 6, 0);
      ctx.fill();
      break;
    case "octagon":
      drawPolygon(ctx, x, y, r, 8, Math.PI / 8);
      ctx.fill();
      break;
    case "cross": {
      const t = r * 0.35;
      ctx.moveTo(x - t, y - r);
      ctx.lineTo(x + t, y - r);
      ctx.lineTo(x + t, y - t);
      ctx.lineTo(x + r, y - t);
      ctx.lineTo(x + r, y + t);
      ctx.lineTo(x + t, y + t);
      ctx.lineTo(x + t, y + r);
      ctx.lineTo(x - t, y + r);
      ctx.lineTo(x - t, y + t);
      ctx.lineTo(x - r, y + t);
      ctx.lineTo(x - r, y - t);
      ctx.lineTo(x - t, y - t);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "arrow": {
      const ah = r;
      const aw = r;
      const neckH = ah * 0.45;
      ctx.moveTo(x + aw, y);
      ctx.lineTo(x, y - ah);
      ctx.lineTo(x, y - neckH);
      ctx.lineTo(x - aw, y - neckH);
      ctx.lineTo(x - aw, y + neckH);
      ctx.lineTo(x, y + neckH);
      ctx.lineTo(x, y + ah);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "heart": {
      const s = r * 0.9;
      ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x - s * 1.5, y, x - s * 2, y - s, x, y - s * 0.5);
      ctx.bezierCurveTo(x + s * 2, y - s, x + s * 1.5, y, x, y + s * 0.9);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.globalAlpha = savedAlpha;
}

function drawEraserStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { size, points, eraserSoftness } = stroke;
  if (points.length === 0) return;

  const savedOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "destination-out";

  if (eraserSoftness === "soft") {
    for (const pt of points) {
      const grad = ctx.createRadialGradient(
        pt.x,
        pt.y,
        0,
        pt.x,
        pt.y,
        size / 2,
      );
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  } else {
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = savedOp;
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasBg: string,
) {
  if (stroke.isEraser) {
    drawEraserStroke(ctx, stroke);
    return;
  }

  const { color, shape, size, points, opacity, hardness = 100 } = stroke;

  if (points.length === 0) return;

  // Soft brush: stamp radial gradients along path
  if (shape === "circle" && hardness < 95) {
    const r = size / 2;
    const opacity01 = opacity / 100;
    const hardR = r * (hardness / 100);
    const softR = r;
    const tmp = document.createElement("canvas");
    tmp.width = 1;
    tmp.height = 1;
    const tmpCtx = tmp.getContext("2d")!;
    tmpCtx.fillStyle = color;
    tmpCtx.fillRect(0, 0, 1, 1);
    const [cr, cg, cb] = Array.from(tmpCtx.getImageData(0, 0, 1, 1).data);
    const spacing = Math.max(1, r * 0.4);
    const allPts: { x: number; y: number }[] = [];
    if (points.length === 1) {
      allPts.push(points[0]);
    } else {
      let accDist = spacing;
      allPts.push(points[0]);
      let lx = points[0].x;
      let ly = points[0].y;
      for (let i = 1; i < points.length; i++) {
        const ddx = points[i].x - lx;
        const ddy = points[i].y - ly;
        accDist += Math.sqrt(ddx * ddx + ddy * ddy);
        if (accDist >= spacing) {
          allPts.push(points[i]);
          accDist = 0;
        }
        lx = points[i].x;
        ly = points[i].y;
      }
    }
    for (const pt of allPts) {
      const grad = ctx.createRadialGradient(
        pt.x,
        pt.y,
        hardR,
        pt.x,
        pt.y,
        softR,
      );
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${opacity01})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, softR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    return;
  }

  if (shape === "circle") {
    if (points.length === 1) {
      drawShape(ctx, "circle", points[0].x, points[0].y, size, color, opacity);
      return;
    }
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity / 100;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
    ctx.stroke();
    ctx.globalAlpha = savedAlpha;
  } else {
    const spacing = Math.max(2, size * 0.4);
    let accDist = spacing;
    drawShape(ctx, shape, points[0].x, points[0].y, size, color, opacity);
    let lastX = points[0].x;
    let lastY = points[0].y;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - lastX;
      const dy = points[i].y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      accDist += dist;
      if (accDist >= spacing) {
        drawShape(ctx, shape, points[i].x, points[i].y, size, color, opacity);
        accDist = 0;
      }
      lastX = points[i].x;
      lastY = points[i].y;
    }
  }
  void canvasBg;
}

function redrawAll(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: LayerData[],
  canvasBg: string,
) {
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, width, height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    const savedAlpha = ctx.globalAlpha;
    ctx.globalAlpha = layer.opacity / 100;
    for (const stroke of layer.strokes) {
      drawStroke(ctx, stroke, canvasBg);
    }
    ctx.globalAlpha = savedAlpha;
  }
}

/**
 * Render a vector shape onto a canvas context using CSS coordinates.
 * The context must already be scaled by DPR via ctx.scale(dpr, dpr).
 */
function renderVectorShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fillColor: string,
  opacity: number,
) {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  const w = maxX - minX;
  const h = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (w < 2 && h < 2 && type !== "line") return;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = fillColor;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (type) {
    case "rect":
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      ctx.fill();
      break;
    case "circle":
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        Math.max(1, w / 2),
        Math.max(1, h / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(maxX, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      ctx.fill();
      break;
    case "arrow": {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const hw = Math.max(12, len * 0.28);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - Math.cos(ang - 0.45) * hw,
        y2 - Math.sin(ang - 0.45) * hw,
      );
      ctx.lineTo(
        x2 - Math.cos(ang + 0.45) * hw,
        y2 - Math.sin(ang + 0.45) * hw,
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "star": {
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.42;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "polygon": {
      const r = Math.min(w, h) / 2;
      const sides = 6;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      ctx.fill();
  }
  ctx.restore();
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  (
    {
      brushColor,
      brushSize,
      activeTool,
      brushShape,
      brushOpacity,
      layers,
      activeLayerId,
      onLayersChange,
      canvasBg,
      pageSize,
      layerFilters,
      onLayerThumbnailUpdate,
      onColorPick,
      onEyedropperMove,
      eraserSoftness = "hard",
      brushHardness = 100,
      onCursorMove,
      onCursorLeave,
      fillTolerance = 32,
      selectionRect,
      zoom = 100,
      activeLayerLocked = false,
      shapeToolType = null,
      onTextClick,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const flatLayerRef = useRef<ImageData | null>(null);
    const historyStackRef = useRef<ImageData[]>([]);
    const redoStackRef = useRef<ImageData[]>([]);
    const MAX_HISTORY = 30;
    const isDrawingRef = useRef(false);
    const isPanningRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const layersRef = useRef<LayerData[]>(layers);
    const canvasBgRef = useRef<string>(canvasBg);
    const pageSizeRef = useRef(pageSize);
    const lastStampPosRef = useRef<Point | null>(null);
    const activeLayerIdRef = useRef(activeLayerId);
    const onLayerThumbnailUpdateRef = useRef(onLayerThumbnailUpdate);
    const onLayersChangeRef = useRef(onLayersChange);
    const onColorPickRef = useRef(onColorPick);
    const onEyedropperMoveRef = useRef(onEyedropperMove);
    const onCursorMoveRef = useRef(onCursorMove);
    const onCursorLeaveRef = useRef(onCursorLeave);
    const isShiftRef = useRef(false);
    const eraserSoftnessRef = useRef(eraserSoftness);
    const brushHardnessRef = useRef(brushHardness);
    const zoomRef = useRef(zoom);
    const shapeToolTypeRef = useRef<string | null>(shapeToolType);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
    const activeToolRef = useRef(activeTool);
    const brushSizeRef = useRef(brushSize);
    const onTextClickRef = useRef(onTextClick);

    useEffect(() => {
      onLayerThumbnailUpdateRef.current = onLayerThumbnailUpdate;
    }, [onLayerThumbnailUpdate]);
    useEffect(() => {
      onLayersChangeRef.current = onLayersChange;
    }, [onLayersChange]);
    useEffect(() => {
      onColorPickRef.current = onColorPick;
    }, [onColorPick]);
    useEffect(() => {
      onEyedropperMoveRef.current = onEyedropperMove;
    }, [onEyedropperMove]);
    useEffect(() => {
      onCursorMoveRef.current = onCursorMove;
    }, [onCursorMove]);
    useEffect(() => {
      onCursorLeaveRef.current = onCursorLeave;
    }, [onCursorLeave]);
    useEffect(() => {
      eraserSoftnessRef.current = eraserSoftness;
    }, [eraserSoftness]);
    useEffect(() => {
      brushHardnessRef.current = brushHardness;
    }, [brushHardness]);
    useEffect(() => {
      zoomRef.current = zoom;
    }, [zoom]);
    useEffect(() => {
      shapeToolTypeRef.current = shapeToolType;
    }, [shapeToolType]);
    useEffect(() => {
      activeToolRef.current = activeTool;
    }, [activeTool]);
    useEffect(() => {
      brushSizeRef.current = brushSize;
    }, [brushSize]);
    useEffect(() => {
      onTextClickRef.current = onTextClick;
    }, [onTextClick]);

    // Track Shift key globally
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") isShiftRef.current = true;
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") isShiftRef.current = false;
      };
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
      };
    }, []);

    const generateThumbnails = useCallback((currentLayers: LayerData[]) => {
      const { width, height } = pageSizeRef.current;
      const thumbs: Record<number, string> = {};
      for (const layer of currentLayers) {
        const offscreen = document.createElement("canvas");
        offscreen.width = 120;
        offscreen.height = Math.round((120 * height) / width);
        const ctx2 = offscreen.getContext("2d");
        if (!ctx2) continue;
        ctx2.fillStyle = canvasBgRef.current;
        ctx2.fillRect(0, 0, offscreen.width, offscreen.height);
        const scaleX = offscreen.width / width;
        const scaleY = offscreen.height / height;
        ctx2.save();
        ctx2.scale(scaleX, scaleY);
        if (layer.visible) {
          ctx2.globalAlpha = layer.opacity / 100;
          for (const stroke of layer.strokes) {
            drawStroke(ctx2, stroke, canvasBgRef.current);
          }
        }
        ctx2.restore();
        thumbs[layer.id] = offscreen.toDataURL("image/png", 0.6);
      }
      onLayerThumbnailUpdateRef.current?.(thumbs);
    }, []);

    useEffect(() => {
      layersRef.current = layers;
    }, [layers]);
    useEffect(() => {
      canvasBgRef.current = canvasBg;
    }, [canvasBg]);
    useEffect(() => {
      pageSizeRef.current = pageSize;
    }, [pageSize]);
    useEffect(() => {
      activeLayerIdRef.current = activeLayerId;
    }, [activeLayerId]);

    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      flatLayerRef.current = null;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = pageSizeRef.current;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      redrawAll(ctx, width, height, layersRef.current, canvasBgRef.current);
      // Also init overlay canvas
      const oc = overlayCanvasRef.current;
      if (oc) {
        oc.width = width * dpr;
        oc.height = height * dpr;
        const octx = oc.getContext("2d");
        if (octx) {
          octx.setTransform(1, 0, 0, 1, 0, 0);
          octx.scale(dpr, dpr);
        }
      }
    }, []);

    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      clearCanvas: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const { width, height } = pageSizeRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeLayerIdRef.current ? { ...l, strokes: [] } : l,
        );
        onLayersChangeRef.current(newLayers);
        ctx.fillStyle = canvasBgRef.current;
        ctx.fillRect(0, 0, width, height);
        redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
        flatLayerRef.current = null;
      },
      undoStroke: () => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: l.strokes.slice(0, -1) } : l,
        );
        onLayersChangeRef.current(newLayers);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const { width, height } = pageSizeRef.current;
        redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
      },
      getImageData: (x: number, y: number, w: number, h: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return null;
        const dpr = window.devicePixelRatio || 1;
        return ctx.getImageData(
          Math.round(x * dpr),
          Math.round(y * dpr),
          Math.round(w * dpr),
          Math.round(h * dpr),
        );
      },
      putImageData: (data: ImageData, x: number, y: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.putImageData(data, Math.round(x * dpr), Math.round(y * dpr));
      },
      clearRegion: (x: number, y: number, w: number, h: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(
          Math.round(x * dpr),
          Math.round(y * dpr),
          Math.round(w * dpr),
          Math.round(h * dpr),
        );
        ctx.fillStyle = canvasBgRef.current;
        ctx.fillRect(
          Math.round(x * dpr),
          Math.round(y * dpr),
          Math.round(w * dpr),
          Math.round(h * dpr),
        );
        if (flatLayerRef.current && canvas) {
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = canvas.width;
          tmpCanvas.height = canvas.height;
          const tmpCtx = tmpCanvas.getContext("2d")!;
          tmpCtx.putImageData(flatLayerRef.current, 0, 0);
          tmpCtx.fillStyle = canvasBgRef.current;
          tmpCtx.fillRect(
            Math.round(x * dpr),
            Math.round(y * dpr),
            Math.round(w * dpr),
            Math.round(h * dpr),
          );
          flatLayerRef.current = tmpCtx.getImageData(
            0,
            0,
            tmpCanvas.width,
            tmpCanvas.height,
          );
        }
      },
      moveStrokesInRegion: (
        origRect: { x: number; y: number; w: number; h: number },
        dx: number,
        dy: number,
      ) => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) => {
          if (l.id !== activeId) return l;
          const movedStrokes = l.strokes.map((stroke) => {
            const allPointsInRect = stroke.points.every(
              (p) =>
                p.x >= origRect.x &&
                p.x <= origRect.x + origRect.w &&
                p.y >= origRect.y &&
                p.y <= origRect.y + origRect.h,
            );
            if (allPointsInRect) {
              return {
                ...stroke,
                points: stroke.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              };
            }
            return stroke;
          });
          return { ...l, strokes: movedStrokes };
        });
        onLayersChangeRef.current(newLayers);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          const { width, height } = pageSizeRef.current;
          redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
        }
      },
      saveHistory: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyStackRef.current.push(snap);
        if (historyStackRef.current.length > MAX_HISTORY) {
          historyStackRef.current.shift();
        }
        redoStackRef.current = [];
      },
      undo: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const prev = historyStackRef.current.pop();
        if (!prev) {
          const activeId = activeLayerIdRef.current;
          const newLayers = layersRef.current.map((l) =>
            l.id === activeId ? { ...l, strokes: l.strokes.slice(0, -1) } : l,
          );
          onLayersChangeRef.current(newLayers);
          const { width, height } = pageSizeRef.current;
          redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
          flatLayerRef.current = null;
          return;
        }
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        redoStackRef.current.push(current);
        ctx.putImageData(prev, 0, 0);
        // Bake undo state so re-renders preserve it
        flatLayerRef.current = prev;
      },
      redo: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const next = redoStackRef.current.pop();
        if (!next) return;
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyStackRef.current.push(current);
        ctx.putImageData(next, 0, 0);
        flatLayerRef.current = next;
      },
      snapshotCanvas: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return null;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
      bakeToFlatLayer: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        flatLayerRef.current = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
      },
    }));

    useEffect(() => {
      initCanvas();
    }, [initCanvas]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
    useEffect(() => {
      initCanvas();
    }, [pageSize.width, pageSize.height, initCanvas]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const { width, height } = pageSize;
      const dpr = window.devicePixelRatio || 1;
      if (flatLayerRef.current) {
        ctx.fillStyle = canvasBg;
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.putImageData(flatLayerRef.current, 0, 0);
        ctx.restore();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const layer of layers) {
          if (!layer.visible) continue;
          const savedAlpha = ctx.globalAlpha;
          ctx.globalAlpha = layer.opacity / 100;
          for (const stroke of layer.strokes) {
            drawStroke(ctx, stroke, canvasBg);
          }
          ctx.globalAlpha = savedAlpha;
        }
      } else {
        redrawAll(ctx, width, height, layers, canvasBg);
      }
    }, [layers, canvasBg, pageSize]);

    /**
     * Convert mouse/touch event to logical canvas coordinates.
     * Accounts for zoom (CSS transform scale) and DPR.
     * canvas CSS size = pageSize.{width,height}
     * canvas is wrapped in a div scaled by (zoom/100) via CSS transform
     * getBoundingClientRect() returns the scaled visual rect
     * → logical position = (clientPos - rect.origin) / (zoom/100)
     */
    const getPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const zf = zoomRef.current / 100;
        if ("touches" in e) {
          const touch = e.touches[0];
          if (!touch) return null;
          return {
            x: (touch.clientX - rect.left) / zf,
            y: (touch.clientY - rect.top) / zf,
          };
        }
        return {
          x: ((e as React.MouseEvent).clientX - rect.left) / zf,
          y: ((e as React.MouseEvent).clientY - rect.top) / zf,
        };
      },
      [],
    );

    const canDraw = activeTool === "brush" || activeTool === "eraser";

    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
        if (activeLayerLocked) return;
        e.preventDefault();
        const pos = getPos(e);
        if (!pos) return;

        isDrawingRef.current = true;
        lastStampPosRef.current = pos;
        currentStrokeRef.current = {
          points: [pos],
          color: brushColor,
          size: brushSize,
          isEraser: activeTool === "eraser",
          shape: brushShape,
          opacity: brushOpacity,
          eraserSoftness:
            activeTool === "eraser" ? eraserSoftnessRef.current : undefined,
          hardness: activeTool === "brush" ? brushHardnessRef.current : 100,
        };

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && currentStrokeRef.current) {
          if (activeTool === "eraser") {
            drawEraserStroke(ctx, currentStrokeRef.current);
          } else {
            drawStroke(ctx, currentStrokeRef.current, canvasBgRef.current);
          }
        }
      },
      [
        brushColor,
        brushSize,
        activeTool,
        brushShape,
        brushOpacity,
        getPos,
        canDraw,
        activeLayerLocked,
      ],
    );

    const draw = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        // Draw cursor on overlay canvas (brush/eraser circle preview)
        const canvas = canvasRef.current;
        const cursorPos = getPos(e);
        if (canvas && cursorPos) {
          const oc = overlayCanvasRef.current;
          if (oc && !shapeStartRef.current) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
              const tool = activeToolRef.current;
              if (tool === "brush" || tool === "eraser") {
                const r = Math.max(1, brushSizeRef.current / 2);
                octx.save();
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, r, 0, Math.PI * 2);
                octx.strokeStyle = "rgba(255,255,255,0.9)";
                octx.lineWidth = 1.5;
                octx.stroke();
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, r + 0.5, 0, Math.PI * 2);
                octx.strokeStyle = "rgba(0,0,0,0.5)";
                octx.lineWidth = 0.8;
                octx.stroke();
                // Center crosshair dot
                octx.beginPath();
                octx.arc(cursorPos.x, cursorPos.y, 1, 0, Math.PI * 2);
                octx.fillStyle = "rgba(255,255,255,0.8)";
                octx.fill();
                octx.restore();
              }
            }
          }
        }

        // Handle eyedropper hover
        if (activeTool === "colorpicker") {
          if (canvas) {
            const pos = getPos(e);
            if (pos) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const px = Math.max(0, Math.round(pos.x * dpr));
                const py = Math.max(0, Math.round(pos.y * dpr));
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                const hex = `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
                const rect = canvas.getBoundingClientRect();
                onEyedropperMoveRef.current?.(
                  hex,
                  rect.left + pos.x,
                  rect.top + pos.y,
                );
              }
            }
          }
          return;
        }

        // ─── SHAPE PREVIEW ───
        if (activeTool === "shape" && shapeStartRef.current) {
          const pos = getPos(e);
          if (!pos) return;
          const oc = overlayCanvasRef.current;
          if (oc) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
              renderVectorShape(
                octx,
                shapeToolTypeRef.current || "rect",
                shapeStartRef.current.x,
                shapeStartRef.current.y,
                pos.x,
                pos.y,
                brushColor,
                brushOpacity,
              );
            }
          }
          return;
        }

        if (!canDraw) return;
        e.preventDefault();
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        const pos = getPos(e);
        if (!pos) return;

        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const stroke = currentStrokeRef.current;

        if (stroke.isEraser) {
          if (isShiftRef.current && stroke.points.length >= 1) {
            const startPt = stroke.points[0];
            stroke.points = [startPt, pos];
            const { width, height } = pageSizeRef.current;
            redrawAll(
              ctx,
              width,
              height,
              layersRef.current,
              canvasBgRef.current,
            );
            drawEraserStroke(ctx, stroke);
          } else {
            stroke.points.push(pos);
            const savedOp = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "destination-out";
            const softness = stroke.eraserSoftness;
            if (softness === "soft") {
              const grad = ctx.createRadialGradient(
                pos.x,
                pos.y,
                0,
                pos.x,
                pos.y,
                stroke.size / 2,
              );
              grad.addColorStop(0, "rgba(0,0,0,1)");
              grad.addColorStop(1, "rgba(0,0,0,0)");
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, stroke.size / 2, 0, Math.PI * 2);
              ctx.fillStyle = grad;
              ctx.fill();
            } else {
              const pts = stroke.points;
              if (pts.length === 2) {
                ctx.beginPath();
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.lineWidth = stroke.size;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.stroke();
              } else if (pts.length > 2) {
                const i = pts.length - 2;
                const midX = (pts[i].x + pts[i + 1].x) / 2;
                const midY = (pts[i].y + pts[i + 1].y) / 2;
                const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
                const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
                ctx.beginPath();
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.lineWidth = stroke.size;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.moveTo(prevMidX, prevMidY);
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
                ctx.stroke();
              }
            }
            ctx.globalCompositeOperation = savedOp;
          }
          return;
        }

        stroke.points.push(pos);

        const color = stroke.color;

        if (stroke.shape === "circle") {
          const pts = stroke.points;
          const savedAlpha = ctx.globalAlpha;
          ctx.globalAlpha = stroke.opacity / 100;
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = stroke.size;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
          } else if (pts.length > 2) {
            const i = pts.length - 2;
            const midX = (pts[i].x + pts[i + 1].x) / 2;
            const midY = (pts[i].y + pts[i + 1].y) / 2;
            const prevMidX = (pts[i - 1].x + pts[i].x) / 2;
            const prevMidY = (pts[i - 1].y + pts[i].y) / 2;
            ctx.moveTo(prevMidX, prevMidY);
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
          }
          ctx.stroke();
          ctx.globalAlpha = savedAlpha;
        } else {
          const lastStamp = lastStampPosRef.current;
          if (lastStamp) {
            const dx = pos.x - lastStamp.x;
            const dy = pos.y - lastStamp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const spacing = Math.max(2, stroke.size * 0.4);
            if (dist >= spacing) {
              drawShape(
                ctx,
                stroke.shape,
                pos.x,
                pos.y,
                stroke.size,
                color,
                stroke.opacity,
              );
              lastStampPosRef.current = pos;
            }
          }
        }
      },
      [getPos, canDraw, activeTool, brushColor, brushOpacity],
    );

    const stopDrawing = useCallback(() => {
      if (!isDrawingRef.current || !currentStrokeRef.current) return;
      isDrawingRef.current = false;
      lastStampPosRef.current = null;

      if (currentStrokeRef.current.points.length > 0) {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId
            ? { ...l, strokes: [...l.strokes, currentStrokeRef.current!] }
            : l,
        );
        onLayersChangeRef.current(newLayers);
        generateThumbnails(newLayers);
      }

      currentStrokeRef.current = null;
    }, [generateThumbnails]);

    // Determine canvas cursor style
    const getCursor = () => {
      if (activeTool === "pan") {
        return isPanningRef.current ? "grabbing" : "grab";
      }
      switch (activeTool) {
        case "select":
          return "crosshair";
        case "eraser":
          return "none"; // circle preview overlay
        case "brush":
          return "none"; // custom brush icon overlay
        case "fill":
          return "none"; // custom bucket icon overlay
        case "text":
          return "text";
        case "colorpicker":
          return "crosshair";
        case "layers":
          return "default";
        default:
          return "crosshair";
      }
    };

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (activeTool === "pan") {
          isPanningRef.current = true;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grabbing";
          return;
        }

        if (activeLayerLocked && activeTool !== "colorpicker") return;

        // ─── VECTOR SHAPE DRAWING ───
        if (activeTool === "shape") {
          const pos = getPos(e);
          if (!pos) return;
          shapeStartRef.current = pos;
          return;
        }

        // ─── FLOOD FILL ───
        if (activeTool === "fill") {
          const pos = getPos(e);
          if (!pos) return;
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Save undo snapshot BEFORE the fill
          const snapBefore = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          historyStackRef.current.push(snapBefore);
          if (historyStackRef.current.length > MAX_HISTORY)
            historyStackRef.current.shift();
          redoStackRef.current = [];

          // Run flood fill
          const result = floodFill(
            canvas,
            pos.x,
            pos.y,
            brushColor,
            fillTolerance,
            selectionRect,
          );

          if (result) {
            // ── CRITICAL FIX ──
            // Bake the filled state into flatLayerRef so that any subsequent
            // React re-render (triggered by setLayerThumbnails etc.) won't call
            // redrawAll() and overwrite the freshly filled canvas.
            flatLayerRef.current = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            generateThumbnails(layersRef.current);
          }
          return;
        }

        // Eyedropper pick on click
        if (activeTool === "colorpicker") {
          const pos = getPos(e);
          if (!pos) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const dpr = window.devicePixelRatio || 1;
          const px = Math.round(pos.x * dpr);
          const py = Math.round(pos.y * dpr);
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          const hex = `#${[pixel[0], pixel[1], pixel[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
          onColorPickRef.current?.(hex);
          return;
        }

        // ─── TEXT TOOL ───
        if (activeTool === "text") {
          const pos = getPos(e);
          if (!pos) return;
          const clientX = (e as React.MouseEvent).clientX;
          const clientY = (e as React.MouseEvent).clientY;
          onTextClickRef.current?.(pos.x, pos.y, clientX, clientY);
          return;
        }

        startDrawing(e);
      },
      [
        activeTool,
        startDrawing,
        getPos,
        brushColor,
        generateThumbnails,
        fillTolerance,
        selectionRect,
        activeLayerLocked,
      ],
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (activeTool === "pan") {
          isPanningRef.current = false;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grab";
          return;
        }

        // ─── FINALIZE SHAPE ───
        if (activeTool === "shape" && shapeStartRef.current) {
          const pos = getPos(e);
          if (pos) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) {
              const snapBefore = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              historyStackRef.current.push(snapBefore);
              if (historyStackRef.current.length > MAX_HISTORY)
                historyStackRef.current.shift();
              redoStackRef.current = [];
              renderVectorShape(
                ctx,
                shapeToolTypeRef.current || "rect",
                shapeStartRef.current.x,
                shapeStartRef.current.y,
                pos.x,
                pos.y,
                brushColor,
                brushOpacity,
              );
              flatLayerRef.current = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              generateThumbnails(layersRef.current);
            }
          }
          // Clear overlay
          const oc = overlayCanvasRef.current;
          if (oc) {
            const octx = oc.getContext("2d");
            if (octx) {
              const { width, height } = pageSizeRef.current;
              octx.clearRect(0, 0, width, height);
            }
          }
          shapeStartRef.current = null;
          return;
        }

        stopDrawing();
      },
      [
        activeTool,
        stopDrawing,
        getPos,
        brushColor,
        brushOpacity,
        generateThumbnails,
      ],
    );

    const handleMouseLeave = useCallback(
      (_e: React.MouseEvent) => {
        onEyedropperMoveRef.current?.(null, 0, 0);
        onCursorLeaveRef.current?.();
        // Clear cursor from overlay canvas
        const oc = overlayCanvasRef.current;
        if (oc && !shapeStartRef.current) {
          const octx = oc.getContext("2d");
          const { width, height } = pageSizeRef.current;
          if (octx) octx.clearRect(0, 0, width, height);
        }
        if (activeTool === "pan") {
          isPanningRef.current = false;
          const canvas = canvasRef.current;
          if (canvas) canvas.style.cursor = "grab";
          return;
        }
        stopDrawing();
      },
      [activeTool, stopDrawing],
    );

    const handleTouchEnd = useCallback(() => {
      onCursorLeaveRef.current?.();
      // Clear cursor overlay
      const oc = overlayCanvasRef.current;
      if (oc && !shapeStartRef.current) {
        const octx = oc.getContext("2d");
        const { width, height } = pageSizeRef.current;
        if (octx) octx.clearRect(0, 0, width, height);
      }
      stopDrawing();
    }, [stopDrawing]);

    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            cursor: getCursor(),
            touchAction: "none",
            background: canvasBg,
            boxShadow: "0 4px 32px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            filter:
              layerFilters && activeLayerId && layerFilters[activeLayerId]
                ? `blur(${layerFilters[activeLayerId].blur}px) brightness(${layerFilters[activeLayerId].brightness}%) contrast(${layerFilters[activeLayerId].contrast}%)`
                : undefined,
            opacity:
              layerFilters && activeLayerId && layerFilters[activeLayerId]
                ? layerFilters[activeLayerId].opacity / 100
                : 1,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={draw}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={handleTouchEnd}
          data-ocid="drawing.canvas_target"
        />
      </div>
    );
  },
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
