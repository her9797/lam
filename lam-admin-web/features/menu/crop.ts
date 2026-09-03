/**
 * Pure geometry for the menu-image crop editor. No DOM/React here so the
 * boundary math (the part that actually has to be correct — "never show
 * empty space around the image, at any pan/zoom") can be unit-tested
 * directly without mounting a component.
 *
 * Model: the image is rendered at `baseWidth`/`baseHeight` CSS pixels (the
 * size that makes the image's shorter side exactly fill a square viewport
 * of `CROP_FRAME_SIZE`), then scaled by `scale` (1-3) and panned by
 * `offsetX`/`offsetY`. `clampCropTransform` is the single place that
 * enforces both bounds:
 *   - `scale` stays within [MIN_SCALE, MAX_SCALE].
 *   - the scaled image can never leave a gap inside the frame: its left/top
 *     edge can't move past the frame's left/top edge (offset <= 0), and its
 *     right/bottom edge can't move before the frame's right/bottom edge
 *     (offset >= frameSize - scaledSize).
 *
 * `focusX`/`focusY` (sent to `lam-api` as the image-upload multipart
 * fields of the same name — see `POST /api/v1/admin/menu-items/{id}/images`
 * in `lam-api/internal/httpapi/router.go`) are derived from the transform:
 * the percentage position, within the *original* image, of whatever point
 * currently sits at the frame's center. `lam-api` clamps these to [0, 100]
 * server-side (`clampImageFocus` in `lam-api/internal/store/postgres.go`),
 * so this module clamps to the same range before sending.
 */

export const CROP_FRAME_SIZE = 280;
export const MIN_SCALE = 1;
export const MAX_SCALE = 3;

export type CropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  baseWidth: number;
  baseHeight: number;
};

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * The single source of truth for keeping a `CropTransform` valid: scale
 * within range, and offset such that the scaled image fully covers the
 * `CROP_FRAME_SIZE` square (no empty space on any edge).
 */
export function clampCropTransform(transform: CropTransform): CropTransform {
  const scale = clampScale(transform.scale);
  const scaledWidth = transform.baseWidth * scale;
  const scaledHeight = transform.baseHeight * scale;

  // The image's top-left corner (offset) may never be positive (that would
  // leave a gap on the left/top), and may never be smaller than
  // `frame - scaled` (that would leave a gap on the right/bottom). When the
  // scaled image is smaller than the frame in some dimension (shouldn't
  // happen with a correctly built `baseWidth`/`baseHeight`, but defends
  // against it), `minX`/`minY` collapses to 0 so the offset is pinned there
  // instead of allowing an out-of-range gap.
  const minX = Math.min(0, CROP_FRAME_SIZE - scaledWidth);
  const minY = Math.min(0, CROP_FRAME_SIZE - scaledHeight);

  return {
    ...transform,
    scale,
    offsetX: Math.min(0, Math.max(minX, transform.offsetX)),
    offsetY: Math.min(0, Math.max(minY, transform.offsetY)),
  };
}

/**
 * Builds the initial transform for a freshly selected image: `scale` 1,
 * `baseWidth`/`baseHeight` sized so the image's shorter side exactly fills
 * the frame (cover-fit), and centered.
 */
export function createInitialCropTransform(naturalWidth: number, naturalHeight: number): CropTransform {
  const aspectRatio = naturalWidth / naturalHeight;
  const baseWidth = aspectRatio >= 1 ? CROP_FRAME_SIZE * aspectRatio : CROP_FRAME_SIZE;
  const baseHeight = aspectRatio >= 1 ? CROP_FRAME_SIZE : CROP_FRAME_SIZE / aspectRatio;

  return clampCropTransform({
    scale: MIN_SCALE,
    offsetX: (CROP_FRAME_SIZE - baseWidth) / 2,
    offsetY: (CROP_FRAME_SIZE - baseHeight) / 2,
    baseWidth,
    baseHeight,
  });
}

/**
 * Pans the image by a pointer/keyboard delta (in CSS pixels), then
 * re-clamps.
 */
export function panCropTransform(transform: CropTransform, deltaX: number, deltaY: number): CropTransform {
  return clampCropTransform({
    ...transform,
    offsetX: transform.offsetX + deltaX,
    offsetY: transform.offsetY + deltaY,
  });
}

/**
 * Zooms to `nextScale` around the frame's center, keeping whatever image
 * point is currently at the center fixed there, then re-clamps (which is
 * what makes zooming in from an edge feel stable instead of snapping).
 */
export function zoomCropTransform(transform: CropTransform, nextScale: number): CropTransform {
  const clampedScale = clampScale(nextScale);
  const frameCenter = CROP_FRAME_SIZE / 2;
  const currentWidth = transform.baseWidth * transform.scale;
  const currentHeight = transform.baseHeight * transform.scale;
  const nextWidth = transform.baseWidth * clampedScale;
  const nextHeight = transform.baseHeight * clampedScale;

  const relativeCenterX = (frameCenter - transform.offsetX) / currentWidth;
  const relativeCenterY = (frameCenter - transform.offsetY) / currentHeight;

  return clampCropTransform({
    ...transform,
    scale: clampedScale,
    offsetX: frameCenter - nextWidth * relativeCenterX,
    offsetY: frameCenter - nextHeight * relativeCenterY,
  });
}

export type ImageNaturalSize = {
  naturalWidth: number;
  naturalHeight: number;
};

/**
 * Loads `url` (an object URL created from the selected `File`) into an
 * offscreen `Image` purely to read its natural pixel dimensions, which
 * `createInitialCropTransform` needs. Kept as its own export (rather than
 * inlined where it's called) so component code can be tested without a
 * real image decode: tests mock this one function and keep every pure
 * geometry helper above real.
 */
export function loadImageNaturalSize(url: string): Promise<ImageNaturalSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    };
    image.onerror = () => {
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.src = url;
  });
}

export type FocusPoint = {
  focusX: number;
  focusY: number;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Derives the `focusX`/`focusY` percentages (0-100) to upload alongside the
 * image.
 *
 * These values are consumed by `lam-web` purely as CSS
 * `object-position: focusX% focusY%` on the full (uncropped) image — see
 * `lam-web/components/menu/menu-item-card.tsx` and
 * `lam-web/components/screens/admin-screen.tsx`. Per the CSS spec, a
 * percentage `P` for `object-position` resolves to
 * `offset = (P / 100) * (boxSize - imageSize)`, i.e. exactly the pan
 * `offsetX`/`offsetY` this editor already tracks (`boxSize` is the frame,
 * `imageSize` the scaled image). So `focusX`/`focusY` must be the inverse of
 * that formula — linear interpolation of `offsetX`/`offsetY` between `0` at
 * `0%` and `minX`/`minY` (the most-negative reachable offset, see
 * `clampCropTransform`) at `100%` — NOT the fraction of the scaled image
 * sitting at the frame's center (those two only agree when the crop is
 * exactly centered).
 */
export function computeFocusPoint(transform: CropTransform): FocusPoint {
  const normalized = clampCropTransform(transform);
  const scaledWidth = normalized.baseWidth * normalized.scale;
  const scaledHeight = normalized.baseHeight * normalized.scale;

  const minX = Math.min(0, CROP_FRAME_SIZE - scaledWidth);
  const minY = Math.min(0, CROP_FRAME_SIZE - scaledHeight);

  // When there's no pan range on an axis (the scaled image exactly fills
  // the frame there), the offset is pinned at 0 and there is no "point at
  // the center" to solve for — treat it as centered (50) rather than
  // dividing by zero.
  const focusX = minX === 0 ? 50 : clampPercent((100 * normalized.offsetX) / minX);
  const focusY = minY === 0 ? 50 : clampPercent((100 * normalized.offsetY) / minY);

  return {
    focusX: Math.round(focusX),
    focusY: Math.round(focusY),
  };
}

/**
 * Algebraic inverse of `computeFocusPoint`'s per-axis formula: given a
 * stored `focusX`/`focusY` percentage and the `minX`/`minY` pan bound for a
 * transform (see `clampCropTransform`), recovers the `offsetX`/`offsetY`
 * that produced it. Not currently wired to any UI (this app doesn't yet
 * re-open the crop editor on an existing image's stored focus point) but
 * kept alongside `computeFocusPoint` since the two must stay in exact
 * agreement, and covered by the round-trip test in `crop.test.ts`.
 */
export function offsetFromFocusPercent(focusPercent: number, min: number): number {
  if (min === 0) {
    return 0;
  }
  return (focusPercent / 100) * min;
}
