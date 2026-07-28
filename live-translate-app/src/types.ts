import type { LanguageCode } from './constants/languages';

/** A single recognized text block, positioned in camera-frame coordinates. */
export interface DetectedBlock {
  /** Stable key derived from the original text + frame position bucket. */
  key: string;
  originalText: string;
  translatedText: string | null;
  /** Bounding box in the *frame's* coordinate space (not screen pixels). */
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TranslationDirection {
  from: LanguageCode;
  to: LanguageCode;
}
