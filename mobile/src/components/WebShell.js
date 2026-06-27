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
    backgroundColor: '#e8eaf6',
    alignItems: 'center',
  },
  shell: {
    flex: 1,
    backgroundColor: '#f0f2ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
});
