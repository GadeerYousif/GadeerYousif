import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMERA_SOURCE_LANGUAGES, SUPPORTED_LANGUAGES } from '../constants/languages';
import { usePhotoTranslation } from '../hooks/usePhotoTranslation';
import type { TranslationDirection } from '../types';
import { mapImageRectToScreen } from '../utils/geometry';
import { LanguagePicker } from './LanguagePicker';
import { TranslationOverlay } from './TranslationOverlay';

interface Props {
  direction: TranslationDirection;
  onChangeDirection: (direction: TranslationDirection) => void;
}

export function PhotoTranslateView({ direction, onChangeDirection }: Props) {
  const insets = useSafeAreaInsets();
  const { image, blocks, isProcessing, error, isTranslatorReady, processImage, reset } =
    usePhotoTranslation(direction);
  const [displayWidth, setDisplayWidth] = useState(0);

  const pickScreenshot = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    await processImage({ uri: asset.uri, width: asset.width, height: asset.height });
  }, [processImage]);

  const onImageLayout = useCallback((event: LayoutChangeEvent) => {
    setDisplayWidth(event.nativeEvent.layout.width);
  }, []);

  const displayHeight = image ? displayWidth * (image.height / image.width) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }}
    >
      <Text style={styles.title}>Translate a screenshot</Text>
      <Text style={styles.subtitle}>
        Screenshot a chat (e.g. WhatsApp), then import it here — text gets recognized and
        translated right on top of the image. Nothing is uploaded; recognition and translation
        both run on-device.
      </Text>

      <View style={styles.languageRow}>
        <LanguagePicker
          label="From"
          value={direction.from}
          options={CAMERA_SOURCE_LANGUAGES}
          onChange={(from) => onChangeDirection({ ...direction, from })}
        />
        <Pressable
          style={styles.swapButton}
          onPress={() =>
            onChangeDirection({
              from: CAMERA_SOURCE_LANGUAGES.some((l) => l.code === direction.to) ? direction.to : direction.from,
              to: direction.from,
            })
          }
        >
          <Text style={styles.swapIcon}>⇄</Text>
        </Pressable>
        <LanguagePicker
          label="To"
          value={direction.to}
          options={SUPPORTED_LANGUAGES}
          onChange={(to) => onChangeDirection({ ...direction, to })}
        />
      </View>

      <Pressable style={styles.importButton} onPress={pickScreenshot}>
        <Text style={styles.importButtonText}>
          {image ? 'Choose a different screenshot' : 'Import screenshot'}
        </Text>
      </Pressable>

      {image && (
        <>
          <View style={styles.imageWrap} onLayout={onImageLayout}>
            {displayWidth > 0 && (
              <>
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: displayWidth, height: displayHeight }}
                  resizeMode="contain"
                />
                <TranslationOverlay
                  blocks={blocks}
                  frameSize={{ width: image.width, height: image.height }}
                  viewSize={{ width: displayWidth, height: displayHeight }}
                  mapRect={mapImageRectToScreen}
                />
              </>
            )}
          </View>

          <Pressable onPress={reset}>
            <Text style={styles.clearLink}>Clear</Text>
          </Pressable>
        </>
      )}

      {isProcessing && (
        <View style={styles.statusRow}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.statusText}>
            {isTranslatorReady ? 'Reading text…' : 'Preparing offline translation model…'}
          </Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {image && !isProcessing && blocks.length === 0 && !error && (
        <Text style={styles.statusText}>No text found in this image.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  importButton: {
    backgroundColor: '#3478f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  imageWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  clearLink: {
    color: '#3478f6',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
