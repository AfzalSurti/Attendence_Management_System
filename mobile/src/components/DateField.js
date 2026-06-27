import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { isWeb } from '../utils/platform';

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DateField({
  value,
  onChange,
  placeholder = 'Select Date',
  style,
  textStyle,
  placeholderStyle,
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (isWeb) {
    return (
      <View style={[styles.field, style]}>
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: value ? '#333' : '#999',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
          }}
          placeholder={placeholder}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.field, style]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={value ? [styles.value, textStyle] : [styles.placeholder, placeholderStyle]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          mode="date"
          display="default"
          value={new Date(value || new Date().toISOString())}
          onChange={(_, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (!selectedDate) return;
            onChange(toIsoDate(selectedDate));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  value: { color: '#333', fontSize: 14 },
  placeholder: { color: '#999', fontSize: 14 },
});
