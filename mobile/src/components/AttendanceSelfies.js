import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';

const isValidUrl = (url) =>
  typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

export default function AttendanceSelfies({ checkinUrl, checkoutUrl }) {
  const [preview, setPreview] = useState(null);

  const renderThumb = (url, label) => (
    <View style={styles.thumbBlock}>
      <Text style={styles.thumbLabel}>{label}</Text>
      {isValidUrl(url) ? (
        <TouchableOpacity onPress={() => setPreview(url)} activeOpacity={0.85}>
          <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No photo</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <View style={styles.row}>
        {renderThumb(checkinUrl, 'Check-in Selfie')}
        {renderThumb(checkoutUrl, 'Check-out Selfie')}
      </View>

      <Modal visible={!!preview} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPreview(null)}
        >
          <Image source={{ uri: preview }} style={styles.fullImage} resizeMode="contain" />
          <Text style={styles.tapClose}>Tap to close</Text>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  thumbBlock: { flex: 1 },
  thumbLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
  },
  thumb: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  placeholder: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 12, color: '#aaa' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullImage: {
    width: '100%',
    height: '75%',
  },
  tapClose: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
    opacity: 0.8,
  },
});
