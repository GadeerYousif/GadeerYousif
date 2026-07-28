import { useCallback, useMemo, useRef, useState } from 'react';
import { useCameraDevice, useFrameOutput } from 'react-native-vision-camera';
import { useTextRecognition, type Text as OcrText } from 'react-native-vision-camera-ocr-plus';
import { scheduleOnRN } from 'react-native-worklets';

import { ocrScriptForLanguage } from '../constants/languages';
import type { DetectedBlock, TranslationDirection } from '../types';
import { useTranslator } from './useTranslator';

const FRAME_SKIP_THRESHOLD = 8; // ~3-4x/sec at 30fps — enough to feel live, cheap on battery.
const STALE_BLOCK_TIMEOUT_MS = 1500; // Drop overlays for text that's left the frame.

export function useLiveTranslation(direction: TranslationDirection) {
  const device = useCameraDevice('back');
  const [blocks, setBlocks] = useState<DetectedBlock[]>([]);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const lastSeenAtRef = useRef(new Map<string, number>());

  const { translate, isReady, error: translatorError } = useTranslator(direction);

  const script = ocrScriptForLanguage(direction.from) ?? 'latin';
  const { scanText } = useTextRecognition({ language: script, frameSkipThreshold: FRAME_SKIP_THRESHOLD });

  const handleOcrResult = useCallback(
    (result: OcrText, size: { width: number; height: number }) => {
      setFrameSize((prev) => (prev.width === size.width && prev.height === size.height ? prev : size));

      const now = Date.now();
      const seenKeys = new Set<string>();

      setBlocks((prevBlocks) => {
        const prevByKey = new Map(prevBlocks.map((b) => [b.key, b]));
        const nextBlocks: DetectedBlock[] = result.blocks.map((block) => {
          const key = block.blockText;
          seenKeys.add(key);
          lastSeenAtRef.current.set(key, now);

          const existing = prevByKey.get(key);
          return {
            key,
            originalText: block.blockText,
            translatedText: existing?.translatedText ?? null,
            frame: {
              x: block.blockFrame.x,
              y: block.blockFrame.y,
              width: block.blockFrame.width,
              height: block.blockFrame.height,
            },
          };
        });

        // Keep recently-seen blocks that momentarily dropped out of this frame's
        // OCR result (flicker prevention), drop ones that have been gone a while.
        for (const prev of prevBlocks) {
          if (seenKeys.has(prev.key)) continue;
          const lastSeen = lastSeenAtRef.current.get(prev.key) ?? 0;
          if (now - lastSeen < STALE_BLOCK_TIMEOUT_MS) {
            nextBlocks.push(prev);
          } else {
            lastSeenAtRef.current.delete(prev.key);
          }
        }

        return nextBlocks;
      });

      for (const block of result.blocks) {
        translate(block.blockText).then((translatedText) => {
          setBlocks((prev) =>
            prev.map((b) => (b.key === block.blockText ? { ...b, translatedText } : b)),
          );
        });
      }
    },
    [translate],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame: (frame) => {
      'worklet';
      const result = scanText(frame);
      const width = frame.width;
      const height = frame.height;
      if (result.blocks.length > 0) {
        scheduleOnRN(handleOcrResult, result, { width, height });
      }
      frame.dispose();
    },
  });

  const outputs = useMemo(() => [frameOutput], [frameOutput]);

  return {
    device,
    outputs,
    blocks,
    frameSize,
    isTranslatorReady: isReady,
    translatorError,
  };
}
