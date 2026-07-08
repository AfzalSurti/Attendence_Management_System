import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { isWeb } from '../utils/platform';

export default function WebShell({ children }) {
  const { width } = useWindowDimensions();
  const maxWidth = width > 1200 ? 1200 : width;

  if (!isWeb) {
    return children;
  }

  return (
    <View style={styles.page}>
      <View style={[styles.shell, { maxWidth, width: '100%' }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  shell: {
    flex: 1,
    backgroundColor: '#f8faff',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#312e81',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
});
