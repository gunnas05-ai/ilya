import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { CITIES, getDistricts } from '../../constants/cities';
import { getCurrentLocation, LocationResult } from '../../services/locationService';

interface CityDistrictPickerProps {
  cityValue: string;
  districtValue: string;
  onCityChange: (cityId: string) => void;
  onDistrictChange: (districtId: string) => void;
  label: string;
  cityError?: string;
  districtError?: string;
  onLocationFound?: (result: LocationResult) => void;
}

export default function CityDistrictPicker({
  cityValue,
  districtValue,
  onCityChange,
  onDistrictChange,
  label,
  cityError,
  districtError,
  onLocationFound,
}: CityDistrictPickerProps) {
  const { colors } = useTheme();
  const [cityModal, setCityModal] = useState(false);
  const [districtModal, setDistrictModal] = useState(false);
  const [locating, setLocating] = useState(false);

  const selectedCity = CITIES.find((c) => c.id === cityValue);
  const districts = cityValue ? getDistricts(cityValue) : [];
  const selectedDistrict = districts.find((d) => d.id === districtValue);

  const handleFindLocation = async () => {
    if (locating) return;
    Alert.alert(
      'Konum Bul',
      'GPS konumunuz kullanılarak bulunduğunuz konum tespit edilecek ve il/ilçe/adres bilgileriniz otomatik doldurulacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Konumumu Bul',
          onPress: async () => {
            setLocating(true);
            try {
              const result = await getCurrentLocation();
              if (result.cityId) {
                onCityChange(result.cityId);
                if (result.districtName) {
                  const city = CITIES.find((c) => c.id === result.cityId);
                  const match = city?.districts.find(
                    (d) => d.name === result.districtName
                  );
                  onDistrictChange(match?.id || '');
                }
              }
              onLocationFound?.(result);
              Alert.alert(
                'Konum Bulundu',
                `${result.cityName}${result.districtName ? ' / ' + result.districtName : ''} olarak belirlendi.`
              );
            } catch (error: any) {
              Alert.alert('Konum Alınamadı', error.message || 'GPS konumunuz alınırken bir hata oluştu.');
            } finally {
              setLocating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[typography.label, { color: colors.text }]}>
          {label} <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.locationBtn, { backgroundColor: colors.primary + '15' }]}
          onPress={handleFindLocation}
          activeOpacity={0.7}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              📍 Konum Bul
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.picker,
            {
              backgroundColor: colors.surface,
              borderColor: cityError ? colors.danger : colors.border,
              flex: 1,
            },
          ]}
          onPress={() => setCityModal(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              typography.body,
              { color: selectedCity ? colors.text : colors.textTertiary },
            ]}
          >
            {selectedCity?.name || 'İl Seçiniz'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.picker,
            {
              backgroundColor: colors.surface,
              borderColor: districtError ? colors.danger : colors.border,
              flex: 1,
              opacity: cityValue ? 1 : 0.5,
            },
          ]}
          onPress={() => cityValue && setDistrictModal(true)}
          activeOpacity={0.7}
          disabled={!cityValue}
        >
          <Text
            style={[
              typography.body,
              { color: selectedDistrict ? colors.text : colors.textTertiary },
            ]}
          >
            {selectedDistrict?.name || 'İlçe Seçiniz'}
          </Text>
        </TouchableOpacity>
      </View>

      {cityError && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
          {cityError}
        </Text>
      )}
      {districtError && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
          {districtError}
        </Text>
      )}

      {/* City Modal */}
      <Modal visible={cityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[typography.h3, { color: colors.text }]}>İl Seçiniz</Text>
              <TouchableOpacity onPress={() => setCityModal(false)}>
                <Text style={[typography.body, { color: colors.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CITIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { backgroundColor: cityValue === item.id ? colors.primary + '15' : 'transparent' },
                  ]}
                  onPress={() => {
                    onCityChange(item.id);
                    onDistrictChange('');
                    setCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: cityValue === item.id ? colors.primary : colors.text,
                        fontWeight: cityValue === item.id ? '600' : '400',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* District Modal */}
      <Modal visible={districtModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[typography.h3, { color: colors.text }]}>İlçe Seçiniz</Text>
              <TouchableOpacity onPress={() => setDistrictModal(false)}>
                <Text style={[typography.body, { color: colors.primary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={districts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { backgroundColor: districtValue === item.id ? colors.primary + '15' : 'transparent' },
                  ]}
                  onPress={() => {
                    onDistrictChange(item.id);
                    setDistrictModal(false);
                  }}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color: districtValue === item.id ? colors.primary : colors.text,
                        fontWeight: districtValue === item.id ? '600' : '400',
                      },
                    ]}
                  >
                    {item.name}
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  picker: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
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
  modalItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
});
