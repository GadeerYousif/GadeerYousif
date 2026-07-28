import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslate } from 'react-native-vision-camera-ocr-plus';

import type { TranslationDirection } from '../types';

/**
 * Wraps the OCR-Plus translator with an in-memory cache (identical text seen
 * across consecutive frames shouldn't re-hit the on-device model every time)
 * and exposes model-download / error state so the UI can show useful
 * feedback the first time a new language pair is used.
 */
export function useTranslator({ from, to }: TranslationDirection) {
  const { translate: translateRaw } = useTranslate({ from, to });
  const cacheRef = useRef(new Map<string, string>());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cacheRef.current.clear();
    setIsReady(false);
    setError(null);

    let cancelled = false;
    translateRaw('hello')
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [translateRaw, from, to]);

  const translate = useCallback(
    async (text: string): Promise<string> => {
      const trimmed = text.trim();
      if (!trimmed) return '';

      const cacheKey = `${from}|${to}|${trimmed}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) return cached;

      try {
        const translated = await translateRaw(trimmed);
        cacheRef.current.set(cacheKey, translated);
        setIsReady(true);
        setError(null);
        return translated;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return trimmed;
      }
    },
    [translateRaw, from, to],
  );

  return { translate, isReady, error };
}
