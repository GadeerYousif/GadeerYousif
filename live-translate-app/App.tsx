import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CameraTranslateView } from './src/components/CameraTranslateView';
import { PermissionGate } from './src/components/PermissionGate';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PermissionGate>
        <CameraTranslateView />
      </PermissionGate>
    </SafeAreaProvider>
  );
}
