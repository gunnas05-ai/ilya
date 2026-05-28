import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import BottomSheet from '../shared/BottomSheet';
import TimeSlotPicker from './TimeSlotPicker';

interface DateTimeFieldsProps {
  dateLabel: string;
  timeLabel: string;
  dateValue: Date | null;
  timeValue: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: string) => void;
  dateError?: string;
  minDate?: Date;
}

export default function DateTimeFields({
  dateLabel,
  timeLabel,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateError,
}: DateTimeFieldsProps) {
  const { colors } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={[typography.label, { color: colors.text }]}>
            {dateLabel} <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: dateError ? colors.danger : colors.border },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                typography.body,
                { color: dateValue ? colors.text : colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {dateValue ? formatDate(dateValue) : 'Seç'}
            </Text>
          </TouchableOpacity>
          {dateError && (
            <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
              {dateError}
            </Text>
          )}
        </View>
        <View style={styles.field}>
          <TimeSlotPicker
            label={timeLabel}
            value={timeValue}
            onChange={onTimeChange}
          />
        </View>
      </View>

      <BottomSheet visible={showDatePicker} onClose={() => setShowDatePicker(false)}>
        <View style={styles.bottomSheetContent}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: spacing.md, textAlign: 'center' }]}>
            Tarih Seçiniz
          </Text>
          <View style={styles.dateGrid}>
            {dates.map((d) => {
              const isSelected = dateValue && d.toDateString() === dateValue.toDateString();
              const isPast = d < new Date(new Date().toDateString());
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[
                    styles.dateItem,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      opacity: isPast ? 0.3 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (!isPast) {
                      onDateChange(d);
                      setShowDatePicker(false);
                    }
                  }}
                  disabled={isPast}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? colors.white : colors.text,
                        fontWeight: isSelected ? '700' : '400',
                      },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? colors.white : colors.textTertiary,
                        fontSize: 9,
                      },
                    ]}
                  >
                    {d.toLocaleDateString('tr-TR', { month: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
  },
  dateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  calendar: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  bottomSheetContent: {},
  dateItem: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
});
