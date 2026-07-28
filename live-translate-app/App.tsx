import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';

import { CameraTranslateView } from './src/components/CameraTranslateView';
import { PermissionGate } from './src/components/PermissionGate';
import { PhotoTranslateView } from './src/components/PhotoTranslateView';
import { usePhotoTranslation } from './src/hooks/usePhotoTranslation';
import type { TranslationDirection } from './src/types';

type Mode = 'camera' | 'photo';

/** expo-share-intent's file width/height are nullable — some sources (e.g. a Shortcut-provided image) may omit them. */
function resolveImageSize(uri: string, width: number | null, height: number | null): Promise<{ width: number; height: number }> {
  if (width && height) return Promise.resolve({ width, height });
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('camera');
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
    setMode('photo');
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
      {mode === 'camera' ? (
        <PermissionGate>
          <CameraTranslateView direction={direction} onChangeDirection={setDirection} />
        </PermissionGate>
      ) : (
        <PhotoTranslateView direction={direction} onChangeDirection={setDirection} {...photo} />
      )}

      <View style={[styles.tabBar, { bottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.tab, mode === 'camera' && styles.tabActive]} onPress={() => setMode('camera')}>
          <Text style={[styles.tabText, mode === 'camera' && styles.tabTextActive]}>Live Camera</Text>
        </Pressable>
        <Pressable style={[styles.tab, mode === 'photo' && styles.tabActive]} onPress={() => setMode('photo')}>
          <Text style={[styles.tabText, mode === 'photo' && styles.tabTextActive]}>Photo</Text>
        </Pressable>
      </View>
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
  tabBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(30,30,32,0.92)',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#3478f6',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
});
