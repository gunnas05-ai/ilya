import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { TIME_SLOTS } from '../../constants/loadConstants';
import BottomSheet from '../shared/BottomSheet';

interface TimeSlotPickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  error?: string;
  disabledSlots?: string[];
}

export default function TimeSlotPicker({
  value,
  onChange,
  label,
  error,
  disabledSlots,
}: TimeSlotPickerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const isDisabled = (slot: string) =>
    disabledSlots?.includes(slot) ?? false;

  const handleSelect = (slot: string) => {
    if (isDisabled(slot)) return;
    onChange(slot);
    setVisible(false);
  };

  const handleClear = () => {
    onChange('');
    setVisible(false);
  };

  const displayValue = value || 'Seç';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[typography.label, { color: colors.text, marginBottom: spacing.xs }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            typography.body,
            { color: value ? colors.text : colors.textTertiary },
          ]}
        >
          {displayValue}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
          {error}
        </Text>
      )}

      <BottomSheet visible={visible} onClose={() => setVisible(false)}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={[typography.h3, { color: colors.text }]}>
              {label || 'Saat Seçiniz'}
            </Text>
          </View>
          <FlatList
            data={TIME_SLOTS}
            keyExtractor={(item) => item}
            numColumns={4}
            columnWrapperStyle={styles.columnRow}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => {
              const selected = value === item;
              const disabled = isDisabled(item);
              return (
                <TouchableOpacity
                  style={[
                    styles.slot,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : 'transparent',
                      opacity: disabled ? 0.3 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: selected ? colors.white : colors.text,
                        fontWeight: selected ? '700' : '400',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              value ? (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: colors.danger }]}
                  onPress={handleClear}
                >
                  <Text style={[typography.label, { color: colors.danger }]}>
                    Temizle
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trigger: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  sheetContent: {
    flex: 1,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  grid: {
    paddingBottom: spacing.lg,
  },
  columnRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  slot: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  clearBtn: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
});
