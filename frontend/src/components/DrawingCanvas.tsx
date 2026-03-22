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
  | "star";

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
  importImage: (img: HTMLImageElement) => void;
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
  ctx.beginPath();
  const r = size / 2;
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case "square":
      ctx.rect(x - r, y - r, size, size);
      break;
    case "rectangle": {
      const hw = r;
      const hh = r * 0.5;
      ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
      break;
    }
    case "triangle": {
      const h = size;
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + h / 2, y + h / 2);
      ctx.lineTo(x - h / 2, y + h / 2);
      ctx.closePath();
      break;
    }
    case "diamond": {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
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
      break;
    }
  }
  ctx.fill();
  ctx.globalAlpha = savedAlpha;
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasBg: string,
) {
  const color = stroke.isEraser ? canvasBg : stroke.color;
  const { shape, size, points, opacity } = stroke;

  if (points.length === 0) return;

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
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const layersRef = useRef<LayerData[]>(layers);
    const canvasBgRef = useRef<string>(canvasBg);
    const pageSizeRef = useRef(pageSize);
    const lastStampPosRef = useRef<Point | null>(null);
    const activeLayerIdRef = useRef(activeLayerId);
    const onLayerThumbnailUpdateRef = useRef(onLayerThumbnailUpdate);

    useEffect(() => {
      onLayerThumbnailUpdateRef.current = onLayerThumbnailUpdate;
    }, [onLayerThumbnailUpdate]);

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
        onLayersChange(newLayers);
        ctx.fillStyle = canvasBgRef.current;
        ctx.fillRect(0, 0, width, height);
        redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
      },
      undoStroke: () => {
        const activeId = activeLayerIdRef.current;
        const newLayers = layersRef.current.map((l) =>
          l.id === activeId ? { ...l, strokes: l.strokes.slice(0, -1) } : l,
        );
        onLayersChange(newLayers);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const { width, height } = pageSizeRef.current;
        redrawAll(ctx, width, height, newLayers, canvasBgRef.current);
      },
      importImage: (img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
      redrawAll(ctx, width, height, layers, canvasBg);
    }, [layers, canvasBg, pageSize]);

    const getPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e) {
          const touch = e.touches[0];
          if (!touch) return null;
          return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }
        return {
          x: (e as React.MouseEvent).clientX - rect.left,
          y: (e as React.MouseEvent).clientY - rect.top,
        };
      },
      [],
    );

    const canDraw =
      activeTool === "brush" ||
      activeTool === "eraser" ||
      activeTool === "shape";

    const startDrawing = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
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
        };

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && currentStrokeRef.current) {
          drawStroke(ctx, currentStrokeRef.current, canvasBgRef.current);
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
      ],
    );

    const draw = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!canDraw) return;
        e.preventDefault();
        if (!isDrawingRef.current || !currentStrokeRef.current) return;

        const pos = getPos(e);
        if (!pos) return;

        currentStrokeRef.current.points.push(pos);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const stroke = currentStrokeRef.current;
        const color = stroke.isEraser ? canvasBgRef.current : stroke.color;

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
      [getPos, canDraw],
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
        onLayersChange(newLayers);
        generateThumbnails(newLayers);
      }

      currentStrokeRef.current = null;
    }, [onLayersChange, generateThumbnails]);

    const getCursor = () => {
      switch (activeTool) {
        case "eraser":
          return "cell";
        case "text":
          return "text";
        case "select":
          return "default";
        case "colorpicker":
          return "crosshair";
        case "fill":
          return "cell";
        case "pan":
          return "grab";
        case "layers":
          return "default";
        default:
          return "crosshair";
      }
    };

    return (
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
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        data-ocid="drawing.canvas_target"
      />
    );
  },
);

DrawingCanvas.displayName = "DrawingCanvas";

export default DrawingCanvas;
