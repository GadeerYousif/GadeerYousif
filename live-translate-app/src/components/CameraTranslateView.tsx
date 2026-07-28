import React, { useCallback, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMERA_SOURCE_LANGUAGES, SUPPORTED_LANGUAGES } from '../constants/languages';
import { useLiveTranslation } from '../hooks/useLiveTranslation';
import type { TranslationDirection } from '../types';
import { LanguagePicker } from './LanguagePicker';
import { TranslationOverlay } from './TranslationOverlay';

export function CameraTranslateView() {
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<TranslationDirection>({ from: 'es', to: 'en' });
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  const { device, outputs, blocks, frameSize, isTranslatorReady, translatorError } =
    useLiveTranslation(direction);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewSize({ width, height });
  }, []);

  const swapLanguages = useCallback(() => {
    setDirection((prev) => {
      const swappedFrom = CAMERA_SOURCE_LANGUAGES.some((l) => l.code === prev.to) ? prev.to : prev.from;
      return { from: swappedFrom, to: prev.from };
    });
  }, []);

  if (device == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No camera device found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={outputs} />

      <TranslationOverlay blocks={blocks} frameSize={frameSize} viewSize={viewSize} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.languageRow}>
          <LanguagePicker
            label="From"
            value={direction.from}
            options={CAMERA_SOURCE_LANGUAGES}
            onChange={(from) => setDirection((prev) => ({ ...prev, from }))}
          />
          <Pressable style={styles.swapButton} onPress={swapLanguages}>
            <Text style={styles.swapIcon}>⇄</Text>
          </Pressable>
          <LanguagePicker
            label="To"
            value={direction.to}
            options={SUPPORTED_LANGUAGES}
            onChange={(to) => setDirection((prev) => ({ ...prev, to }))}
          />
        </View>
      </View>

      {!isTranslatorReady && !translatorError && (
        <View style={[styles.statusPill, { bottom: insets.bottom + 24 }]}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.statusText}>Preparing offline translation model…</Text>
        </View>
      )}

      {translatorError && (
        <View style={[styles.statusPill, styles.errorPill, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.statusText}>Translation error: {translatorError}</Text>
        </View>
      )}

      {isTranslatorReady && blocks.length === 0 && (
        <View style={[styles.statusPill, { bottom: insets.bottom + 24 }]}>
          <Text style={styles.statusText}>Point the camera at some text</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  message: {
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statusPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,15,20,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  errorPill: {
    backgroundColor: 'rgba(120,20,20,0.9)',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
