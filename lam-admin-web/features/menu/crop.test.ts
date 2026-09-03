import { describe, expect, it } from "vitest";

import {
  CROP_FRAME_SIZE,
  MAX_SCALE,
  MIN_SCALE,
  clampCropTransform,
  clampScale,
  computeFocusPoint,
  createInitialCropTransform,
  offsetFromFocusPercent,
  panCropTransform,
  zoomCropTransform,
  type CropTransform,
} from "./crop";

describe("clampScale", () => {
  it("clamps below MIN_SCALE up to MIN_SCALE", () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
  });

  it("clamps above MAX_SCALE down to MAX_SCALE", () => {
    expect(clampScale(10)).toBe(MAX_SCALE);
  });

  it("keeps an in-range scale unchanged", () => {
    expect(clampScale(2)).toBe(2);
  });
});

describe("clampCropTransform", () => {
  // A wide (landscape) image: baseHeight matches the frame exactly, so
  // there is no vertical room to pan at scale 1, and baseWidth exceeds the
  // frame, leaving horizontal room.
  const wideBase: Pick<CropTransform, "baseWidth" | "baseHeight"> = {
    baseWidth: CROP_FRAME_SIZE * 2,
    baseHeight: CROP_FRAME_SIZE,
  };

  it("clamps an out-of-range scale as part of clamping the transform", () => {
    const result = clampCropTransform({ ...wideBase, scale: 8, offsetX: 0, offsetY: 0 });
    expect(result.scale).toBe(MAX_SCALE);
  });

  it("pins offsetY to 0 at scale 1 when the image height exactly fills the frame (no vertical slack)", () => {
    const draggedUp = clampCropTransform({ ...wideBase, scale: 1, offsetY: -999, offsetX: 0 });
    const draggedDown = clampCropTransform({ ...wideBase, scale: 1, offsetY: 999, offsetX: 0 });
    expect(draggedUp.offsetY).toBe(0);
    expect(draggedDown.offsetY).toBe(0);
  });

  it("never lets the offset drift so far that a gap opens on the left/top edge", () => {
    // Dragging the image far to the right/down (positive offset) would
    // uncover the frame's left/top edge if not clamped.
    const result = clampCropTransform({ ...wideBase, scale: 1, offsetX: 999, offsetY: 999 });
    expect(result.offsetX).toBeLessThanOrEqual(0);
    expect(result.offsetY).toBeLessThanOrEqual(0);
  });

  it("never lets the offset drift so far that a gap opens on the right/bottom edge", () => {
    // Dragging the image far to the left/up (very negative offset) would
    // uncover the frame's right/bottom edge if not clamped.
    const result = clampCropTransform({ ...wideBase, scale: 1, offsetX: -99999, offsetY: -99999 });
    const scaledWidth = wideBase.baseWidth * result.scale;
    const scaledHeight = wideBase.baseHeight * result.scale;
    expect(result.offsetX).toBeGreaterThanOrEqual(CROP_FRAME_SIZE - scaledWidth);
    expect(result.offsetY).toBeGreaterThanOrEqual(CROP_FRAME_SIZE - scaledHeight);
  });

  it("allows more horizontal pan range at scale 3 than at scale 1", () => {
    const atMinScale = clampCropTransform({ ...wideBase, scale: MIN_SCALE, offsetX: -99999, offsetY: 0 });
    const atMaxScale = clampCropTransform({ ...wideBase, scale: MAX_SCALE, offsetX: -99999, offsetY: 0 });
    // The minimum reachable (most negative) offsetX is more negative at a
    // higher scale, i.e. there's more room to pan.
    expect(atMaxScale.offsetX).toBeLessThan(atMinScale.offsetX);
  });

  it("leaves a valid transform unchanged", () => {
    const input: CropTransform = { ...wideBase, scale: 2, offsetX: -50, offsetY: 0 };
    expect(clampCropTransform(input)).toEqual(input);
  });
});

describe("createInitialCropTransform", () => {
  it("fits a landscape image so height matches the frame and width overflows, centered horizontally", () => {
    const transform = createInitialCropTransform(400, 200);
    expect(transform.baseHeight).toBeCloseTo(CROP_FRAME_SIZE);
    expect(transform.baseWidth).toBeGreaterThan(CROP_FRAME_SIZE);
    expect(transform.offsetY).toBe(0);
    expect(transform.offsetX).toBeCloseTo((CROP_FRAME_SIZE - transform.baseWidth) / 2);
  });

  it("fits a portrait image so width matches the frame and height overflows, centered vertically", () => {
    const transform = createInitialCropTransform(200, 400);
    expect(transform.baseWidth).toBeCloseTo(CROP_FRAME_SIZE);
    expect(transform.baseHeight).toBeGreaterThan(CROP_FRAME_SIZE);
    expect(transform.offsetX).toBe(0);
    expect(transform.offsetY).toBeCloseTo((CROP_FRAME_SIZE - transform.baseHeight) / 2);
  });

  it("fits a square image exactly to the frame with no pan slack", () => {
    const transform = createInitialCropTransform(300, 300);
    expect(transform.baseWidth).toBeCloseTo(CROP_FRAME_SIZE);
    expect(transform.baseHeight).toBeCloseTo(CROP_FRAME_SIZE);
    expect(transform.offsetX).toBe(0);
    expect(transform.offsetY).toBe(0);
  });

  it("starts at MIN_SCALE", () => {
    expect(createInitialCropTransform(400, 200).scale).toBe(MIN_SCALE);
  });
});

describe("panCropTransform", () => {
  it("applies a delta and clamps the result", () => {
    const start = createInitialCropTransform(400, 200);
    const panned = panCropTransform(start, -20, 0);
    expect(panned.offsetX).toBeCloseTo(start.offsetX - 20);
  });

  it("clamps a pan that would otherwise open a gap", () => {
    const start = createInitialCropTransform(400, 200);
    const panned = panCropTransform(start, -99999, 0);
    const scaledWidth = start.baseWidth * start.scale;
    expect(panned.offsetX).toBeGreaterThanOrEqual(CROP_FRAME_SIZE - scaledWidth);
  });

  it("never introduces vertical slack for an image with no vertical room", () => {
    const start = createInitialCropTransform(400, 200);
    const panned = panCropTransform(start, 0, 500);
    expect(panned.offsetY).toBe(0);
  });
});

describe("zoomCropTransform", () => {
  it("clamps the requested scale into [MIN_SCALE, MAX_SCALE]", () => {
    const start = createInitialCropTransform(400, 200);
    expect(zoomCropTransform(start, 10).scale).toBe(MAX_SCALE);
    expect(zoomCropTransform(start, -10).scale).toBe(MIN_SCALE);
  });

  it("keeps the frame fully covered immediately after zooming in", () => {
    const start = createInitialCropTransform(300, 300);
    const zoomed = zoomCropTransform(start, 3);
    const scaledWidth = zoomed.baseWidth * zoomed.scale;
    const scaledHeight = zoomed.baseHeight * zoomed.scale;
    expect(zoomed.offsetX).toBeLessThanOrEqual(0);
    expect(zoomed.offsetX).toBeGreaterThanOrEqual(CROP_FRAME_SIZE - scaledWidth);
    expect(zoomed.offsetY).toBeLessThanOrEqual(0);
    expect(zoomed.offsetY).toBeGreaterThanOrEqual(CROP_FRAME_SIZE - scaledHeight);
  });

  it("keeps the frame fully covered immediately after zooming back out to MIN_SCALE", () => {
    const start = createInitialCropTransform(300, 300);
    const zoomedIn = zoomCropTransform(start, 3);
    const zoomedOut = zoomCropTransform(zoomedIn, MIN_SCALE);
    expect(zoomedOut.offsetX).toBe(0);
    expect(zoomedOut.offsetY).toBe(0);
  });

  it("keeps the point at the frame center visually fixed while zooming", () => {
    // Pan a square image so its top-left quadrant sits at the frame
    // center, then zoom in: that same image point should still be at (or
    // very near) the frame center afterwards.
    const start = createInitialCropTransform(300, 300);
    const panned = panCropTransform(start, -70, -70);
    const zoomed = zoomCropTransform(panned, 2);

    const frameCenter = CROP_FRAME_SIZE / 2;
    const pannedImageXAtCenter = (frameCenter - panned.offsetX) / (panned.baseWidth * panned.scale);
    const zoomedImageXAtCenter = (frameCenter - zoomed.offsetX) / (zoomed.baseWidth * zoomed.scale);
    expect(zoomedImageXAtCenter).toBeCloseTo(pannedImageXAtCenter, 2);
  });
});

describe("computeFocusPoint", () => {
  it("reports the center (50, 50) for a centered, unzoomed square image", () => {
    const transform = createInitialCropTransform(300, 300);
    expect(computeFocusPoint(transform)).toEqual({ focusX: 50, focusY: 50 });
  });

  it("reports 50 (centered) on an axis with no pan range (minX/minY === 0), not a division by zero", () => {
    // baseHeight matches the frame exactly at scale 1: no vertical pan
    // range, so offsetY is pinned at 0 regardless of what's requested.
    const wide: CropTransform = { baseWidth: CROP_FRAME_SIZE * 2, baseHeight: CROP_FRAME_SIZE, scale: 1, offsetX: 0, offsetY: 0 };
    expect(computeFocusPoint(wide).focusY).toBe(50);
  });

  // Matches lam-web's actual CSS object-position formula:
  // offset = (P / 100) * (boxSize - imageSize). For object-position, the
  // reachable offset range is [minX, 0] (minX is negative), so the percentage
  // that reproduces a given offsetX is `focusX = 100 * offsetX / minX` — NOT
  // the fraction of the scaled image sitting at the frame's center (those
  // only agree when centered).
  it("computes the exact CSS-consistent focusX for a fully panned wide image (the review's worked example)", () => {
    // 400x200 source scaled to baseWidth=560/baseHeight=280 for a
    // frame=280 crop editor; minX = 280 - 560 = -280, so offsetX=-280 is
    // the full pan to the right edge.
    const transform: CropTransform = {
      baseWidth: 560,
      baseHeight: 280,
      scale: 1,
      offsetX: -280,
      offsetY: 0,
    };
    expect(computeFocusPoint(transform)).toEqual({ focusX: 100, focusY: 50 });
  });

  it("computes the exact CSS-consistent focusX for a partial pan (not just centered or fully panned)", () => {
    const start = createInitialCropTransform(400, 200);
    // start.offsetX === -140 (centered), minX === -280; panning by -40
    // lands at offsetX === -180, i.e. 180/280 === 64.28...% -> rounds to 64.
    const panned = panCropTransform(start, -40, 0);
    expect(panned.offsetX).toBe(-180);
    expect(computeFocusPoint(panned)).toEqual({ focusX: 64, focusY: 50 });
  });

  it("stays within [0, 100] even when panned to the leftmost/topmost extreme", () => {
    const start = createInitialCropTransform(400, 200);
    const pannedToEdge = panCropTransform(start, 99999, 99999);
    // Panned fully left: offsetX clamps to 0 -> focusX 0. No vertical pan
    // range on this image, so focusY stays centered at 50.
    expect(computeFocusPoint(pannedToEdge)).toEqual({ focusX: 0, focusY: 50 });
  });

  it("stays within [0, 100] even when panned to the rightmost/bottommost extreme", () => {
    const start = createInitialCropTransform(400, 200);
    const pannedToEdge = panCropTransform(start, -99999, -99999);
    // Panned fully right: offsetX clamps to minX (-280) -> focusX 100.
    expect(computeFocusPoint(pannedToEdge)).toEqual({ focusX: 100, focusY: 50 });
  });

  it("round-trips through offsetFromFocusPercent for a non-trivial (off-center, zoomed) pan", () => {
    const start = createInitialCropTransform(400, 200);
    const zoomed = zoomCropTransform(start, 2);
    const panned = panCropTransform(zoomed, -30, 0);

    const scaledWidth = panned.baseWidth * panned.scale;
    const minX = Math.min(0, CROP_FRAME_SIZE - scaledWidth);
    const { focusX } = computeFocusPoint(panned);

    // computeFocusPoint rounds focusX to the nearest integer percent, so
    // the round trip can be off by at most half a percent of the pan
    // range (|minX| / 200) — well short of the ~70px/25%-of-frame
    // discrepancy the old (incorrect) formula produced.
    const roundedOffset = offsetFromFocusPercent(focusX, minX);
    expect(Math.abs(roundedOffset - panned.offsetX)).toBeLessThanOrEqual(Math.abs(minX) / 200 + 0.001);
  });
});
