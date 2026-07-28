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
 * Maps a bounding box from camera-frame coordinates to on-screen coordinates.
 *
 * The <Camera> preview renders with `resizeMode="cover"`: the frame is
 * uniformly scaled up until it fills the view, then center-cropped. Camera
 * sensors also commonly report frame buffers in landscape orientation
 * (frame.width > frame.height) even while the phone is held in portrait, so
 * we detect that mismatch and swap axes before scaling.
 *
 * Note: exact sensor/orientation behavior varies by device and OS, so this
 * mapping may need small calibration adjustments on a real device.
 */
export function mapFrameRectToScreen(
  frameRect: DetectedBlock['frame'],
  frameSize: Size,
  viewSize: Size,
): ScreenRect {
  const frameIsLandscape = frameSize.width > frameSize.height;
  const viewIsPortrait = viewSize.height >= viewSize.width;
  const shouldRotate = frameIsLandscape && viewIsPortrait;

  const effectiveFrameWidth = shouldRotate ? frameSize.height : frameSize.width;
  const effectiveFrameHeight = shouldRotate ? frameSize.width : frameSize.height;

  const rect = shouldRotate
    ? {
        x: frameRect.y,
        y: frameSize.width - frameRect.x - frameRect.width,
        width: frameRect.height,
        height: frameRect.width,
      }
    : frameRect;

  const scale = Math.max(
    viewSize.width / effectiveFrameWidth,
    viewSize.height / effectiveFrameHeight,
  );

  const scaledContentWidth = effectiveFrameWidth * scale;
  const scaledContentHeight = effectiveFrameHeight * scale;
  const offsetX = (viewSize.width - scaledContentWidth) / 2;
  const offsetY = (viewSize.height - scaledContentHeight) / 2;

  return {
    x: rect.x * scale + offsetX,
    y: rect.y * scale + offsetY,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
