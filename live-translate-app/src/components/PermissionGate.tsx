import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

export function PermissionGate({ children }: { children: React.ReactNode }) {
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  if (hasPermission) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera access needed</Text>
      <Text style={styles.body}>
        Live translation reads text straight from the camera feed — nothing is saved or
        captured. Grant camera access to continue.
      </Text>
      <Pressable style={styles.button} onPress={requestPermission}>
        <Text style={styles.buttonText}>Grant permission</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openSettings()}>
        <Text style={styles.link}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3478f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  link: {
    color: '#3478f6',
    fontSize: 14,
    marginTop: 4,
  },
});
