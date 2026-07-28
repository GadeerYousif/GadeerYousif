import { useCallback, useEffect, useRef, useState } from 'react';
import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';

import { ocrScriptForLanguage } from '../constants/languages';
import type { DetectedBlock, TranslationDirection } from '../types';
import { useTranslator } from './useTranslator';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Runs on-device OCR + translation over a single still image (e.g. a
 * screenshot picked from the photo library), producing the same
 * DetectedBlock shape the live camera overlay uses.
 */
export function usePhotoTranslation(direction: TranslationDirection) {
  const [image, setImage] = useState<PickedImage | null>(null);
  const [blocks, setBlocks] = useState<DetectedBlock[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { translate, isReady: isTranslatorReady, error: translatorError } = useTranslator(direction);

  const script = ocrScriptForLanguage(direction.from) ?? 'latin';
  // useTextRecognition also exposes the raw ML Kit `recognizer`, which has a
  // recognizePhoto() method for still images alongside the frame-based scanText().
  const { recognizer } = useTextRecognition({ language: script });

  const processImage = useCallback(
    async (picked: PickedImage) => {
      setImage(picked);
      setBlocks([]);
      setError(null);
      setIsProcessing(true);

      try {
        const orientation = picked.width > picked.height ? 'landscapeLeft' : 'portrait';
        const result = await recognizer.recognizePhoto(picked.uri, orientation);

        const initialBlocks: DetectedBlock[] = result.blocks.map((block) => ({
          key: block.blockText,
          originalText: block.blockText,
          translatedText: null,
          frame: {
            x: block.blockFrame.x,
            y: block.blockFrame.y,
            width: block.blockFrame.width,
            height: block.blockFrame.height,
          },
        }));
        setBlocks(initialBlocks);

        for (const block of result.blocks) {
          translate(block.blockText).then((translatedText) => {
            setBlocks((prev) =>
              prev.map((b) => (b.key === block.blockText ? { ...b, translatedText } : b)),
            );
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [recognizer, translate],
  );

  const reset = useCallback(() => {
    setImage(null);
    setBlocks([]);
    setError(null);
  }, []);

  // Re-scan the current image whenever the language pair changes, so
  // switching languages updates the overlay without a manual re-import.
  const imageRef = useRef(image);
  imageRef.current = image;
  useEffect(() => {
    if (imageRef.current) {
      processImage(imageRef.current);
    }
    // Only the language pair should trigger a re-scan, not every processImage identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction.from, direction.to]);

  return {
    image,
    blocks,
    isProcessing,
    error: error ?? translatorError,
    isTranslatorReady,
    processImage,
    reset,
  };
}
