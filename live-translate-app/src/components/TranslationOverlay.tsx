import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DetectedBlock } from '../types';
import { mapFrameRectToScreen, type Size } from '../utils/geometry';

interface Props {
  blocks: DetectedBlock[];
  frameSize: Size;
  viewSize: Size;
}

/**
 * Draws a translated-text "patch" over each recognized block, positioned to
 * match its live location in the camera preview. Nothing here is a captured
 * image — it's plain Views layered on top of the live <Camera> feed and
 * repositioned every time new OCR results arrive.
 */
export function TranslationOverlay({ blocks, frameSize, viewSize }: Props) {
  if (frameSize.width === 0 || viewSize.width === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {blocks.map((block) => {
        const rect = mapFrameRectToScreen(block.frame, frameSize, viewSize);
        return (
          <View
            key={block.key}
            style={[
              styles.patch,
              {
                left: rect.x,
                top: rect.y,
                width: rect.width,
                minHeight: rect.height,
              },
            ]}
          >
            <Text style={styles.text} numberOfLines={3} adjustsFontSizeToFit>
              {block.translatedText ?? block.originalText}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  patch: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 15, 20, 0.82)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
