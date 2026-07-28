import type { Languages } from 'react-native-vision-camera-ocr-plus';

/**
 * Languages supported by ML Kit Translate (used on-device by
 * react-native-vision-camera-ocr-plus). Re-exported from the library's own
 * type so this list can never drift out of sync with what it actually
 * supports (e.g. it notably does *not* include Swedish or Croatian).
 */
export type LanguageCode = Languages;

export type OcrScript = 'latin' | 'chinese' | 'japanese' | 'korean' | 'devanagari';

export interface Language {
  code: LanguageCode;
  label: string;
}

/**
 * ML Kit's on-device text *recognizer* only understands five scripts. A
 * language can still be a translation *target* (see SUPPORTED_LANGUAGES)
 * without being detectable as camera input, e.g. Arabic or Thai text can be
 * translated *into*, but can't currently be read off the live camera feed
 * on-device.
 */
const OCR_SCRIPT_BY_CODE: Partial<Record<LanguageCode, OcrScript>> = {
  zh: 'chinese',
  ja: 'japanese',
  ko: 'korean',
  hi: 'devanagari',
  mr: 'devanagari',
  en: 'latin',
  es: 'latin',
  fr: 'latin',
  de: 'latin',
  it: 'latin',
  pt: 'latin',
  nl: 'latin',
  pl: 'latin',
  tr: 'latin',
  no: 'latin',
  da: 'latin',
  fi: 'latin',
  ro: 'latin',
  hu: 'latin',
  bg: 'latin',
  sk: 'latin',
  sl: 'latin',
  cs: 'latin',
  id: 'latin',
  ms: 'latin',
  sw: 'latin',
  vi: 'latin',
};

export function ocrScriptForLanguage(code: string): OcrScript | null {
  return OCR_SCRIPT_BY_CODE[code as LanguageCode] ?? null;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ur', label: 'Urdu' },
  { code: 'fa', label: 'Persian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'sw', label: 'Swahili' },
  { code: 'el', label: 'Greek' },
  { code: 'cs', label: 'Czech' },
  { code: 'no', label: 'Norwegian' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
];

export function languageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

/** Languages the camera can actually read text from (see ocrScriptForLanguage). */
export const CAMERA_SOURCE_LANGUAGES: Language[] = SUPPORTED_LANGUAGES.filter((l) =>
  ocrScriptForLanguage(l.code),
);
