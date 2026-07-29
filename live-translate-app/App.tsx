import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';

import { PhotoTranslateView } from './src/components/PhotoTranslateView';
import { usePhotoTranslation } from './src/hooks/usePhotoTranslation';
import type { TranslationDirection } from './src/types';

/** expo-share-intent's file width/height are nullable — some sources (e.g. a Shortcut-provided image) may omit them. */
function resolveImageSize(uri: string, width: number | null, height: number | null): Promise<{ width: number; height: number }> {
  if (width && height) return Promise.resolve({ width, height });
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

function AppContent() {
  const [direction, setDirection] = useState<TranslationDirection>({ from: 'es', to: 'en' });
  const photo = usePhotoTranslation(direction);

  // Fed by a Shortcut (e.g. bound to the Action Button or Back Tap) that
  // takes a screenshot and shares it into this app, or by a manual share
  // from Photos/WhatsApp. Either way: no in-app taps needed, it lands here
  // already translated.
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const processingUriRef = useRef<string | null>(null);
  useEffect(() => {
    const file = shareIntent.files?.[0];
    if (!hasShareIntent || !file || processingUriRef.current === file.path) return;

    processingUriRef.current = file.path;
    resolveImageSize(file.path, file.width, file.height)
      .then(({ width, height }) => photo.processImage({ uri: file.path, width, height }))
      .finally(() => {
        resetShareIntent();
        processingUriRef.current = null;
      });
    // photo.processImage's identity changes with `direction`; only the incoming share intent should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);

  return (
    <View style={styles.container}>
      <PhotoTranslateView direction={direction} onChangeDirection={setDirection} {...photo} />
    </View>
  );
}

export default function App() {
  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppContent />
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
