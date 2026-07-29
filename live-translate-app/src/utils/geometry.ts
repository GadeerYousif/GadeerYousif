import type { DetectedBlock } from '../types';

export interface Size {
  width: number;
  height: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Maps a bounding box from a still image's own pixel coordinates to
 * on-screen coordinates. The image is displayed at `displaySize`, which the
 * caller keeps at the same aspect ratio as `imageSize`, so this is a plain
 * uniform scale with no offset or cropping.
 */
export function mapImageRectToScreen(
  imageRect: DetectedBlock['frame'],
  imageSize: Size,
  displaySize: Size,
): ScreenRect {
  const scale = displaySize.width / imageSize.width;
  return {
    x: imageRect.x * scale,
    y: imageRect.y * scale,
    width: imageRect.width * scale,
    height: imageRect.height * scale,
  };
}
