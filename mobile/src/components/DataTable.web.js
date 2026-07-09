import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Simple web data table — columns: [{ key, label, flex?, render?(row, index) }]
 * rows: [{ key, ...fields }]
 */
export default function DataTable({ columns, rows, emptyMessage = 'No data' }) {
  if (!rows?.length) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <View key={col.key} style={[styles.cell, { flex: col.flex ?? 1 }]}>
            <Text style={styles.headerText}>{col.label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, index) => (
        <View
          key={row.key ?? String(index)}
          style={[styles.dataRow, index % 2 === 1 && styles.stripedRow]}
        >
          {columns.map((col) => (
            <View key={col.key} style={[styles.cell, { flex: col.flex ?? 1 }]}>
              {col.render ? (
                col.render(row, index)
              ) : (
                <Text style={styles.cellText} numberOfLines={2}>
                  {row[col.key] ?? '—'}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#312e81',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#4338ca',
  },
  headerText: {
    color: '#e0e7ff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 48,
  },
  stripedRow: {
    backgroundColor: '#f8fafc',
  },
  cell: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 32,
    fontSize: 14,
  },
});
