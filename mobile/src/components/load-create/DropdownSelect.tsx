import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

interface DropdownSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export default function DropdownSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seçiniz',
  error,
  required = false,
}: DropdownSelectProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[typography.label, { color: colors.text }]}>
        {label} {required && <Text style={{ color: colors.danger }}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            typography.body,
            { color: value ? colors.text : colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
          {error}
        </Text>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[typography.h3, { color: colors.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[typography.body, { color: colors.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: value === item ? colors.primary + '15' : 'transparent' },
                  ]}
                  onPress={() => {
                    onChange(item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: value === item ? colors.primary : colors.text,
                        fontWeight: value === item ? '600' : '400',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '60%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
});
