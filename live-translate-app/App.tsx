import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraTranslateView } from './src/components/CameraTranslateView';
import { PermissionGate } from './src/components/PermissionGate';
import { PhotoTranslateView } from './src/components/PhotoTranslateView';
import type { TranslationDirection } from './src/types';

type Mode = 'camera' | 'photo';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('camera');
  const [direction, setDirection] = useState<TranslationDirection>({ from: 'es', to: 'en' });

  return (
    <View style={styles.container}>
      {mode === 'camera' ? (
        <PermissionGate>
          <CameraTranslateView direction={direction} onChangeDirection={setDirection} />
        </PermissionGate>
      ) : (
        <PhotoTranslateView direction={direction} onChangeDirection={setDirection} />
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
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppContent />
    </SafeAreaProvider>
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
