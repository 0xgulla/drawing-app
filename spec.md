# Drawing App

## Current State
A professional multi-layer drawing app with: brush, eraser, shape, fill bucket, text, selection, eyedropper, hand/pan tools in a left vertical toolbar. Right panel has layers. Top nav has project controls. Themes: Light, Dark, Purple. Color history (last 12-20 colors, localStorage). Canvas system with zoom, pan, undo/redo.

## Requested Changes (Diff)

### Add
- Brush cursor: visible circle preview following cursor at all zoom levels, no lag
- Text tool: full editing (font family, size, bold/italic, alignment, resize/move text box)
- Purple theme toggle button (already exists but verify it works)
- Color history expanded to 30+ colors with scroll
- Dedicated theme toggle button visible in UI

### Modify
- Brush tool: cursor circle must reflect brush size accurately, no disappearance while drawing
- Eraser tool: real-time erasing while dragging (not just on release), single circle cursor matching eraser size
- Shape tool: live preview while dragging, bounding box with handles after completion, transform (resize/rotate/move)
- Layer panel: move controls to bottom section, add/delete/rename/opacity/visibility all present with improved UI spacing
- Zoom + cursor sync: fix brush/eraser misalignment at all zoom levels using correct coordinate mapping
- Color history: 30+ colors, instant update, scrollable panel
- General performance: smooth real-time rendering, no flicker

### Remove
- Duplicate cursor bug on eraser (only one circle)

## Implementation Plan
1. Fix DrawingCanvas.tsx:
   - Brush cursor: draw circle on overlay canvas that follows mouse pointer even while mousedown, synced with zoom
   - Eraser: apply erasure on every mousemove (not just mouseup), single circle cursor
   - Coordinate mapping: use `(e.clientX - rect.left) * (canvas.width / rect.width)` pattern consistently
   - Shape tool: use preview canvas overlay for live shape preview, show transform box after finalize
2. Add/fix TextTool: floating text editor with font controls, resize/move text box
3. Update LayersPanel.tsx: controls at bottom, improved spacing
4. Update color history: increase to 30, add scroll, instant update
5. Verify Purple theme button is accessible
6. Performance: use requestAnimationFrame batching, minimize re-renders
