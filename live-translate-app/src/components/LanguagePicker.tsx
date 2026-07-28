import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language, LanguageCode } from '../constants/languages';

interface Props {
  label: string;
  value: LanguageCode;
  options: Language[];
  onChange: (code: LanguageCode) => void;
}

export function LanguagePicker({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.code === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerLabel}>{label}</Text>
        <Text style={styles.triggerValue}>{current?.label ?? value}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.code === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  triggerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  triggerValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    maxHeight: '65%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
});
