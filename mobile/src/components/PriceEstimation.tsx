import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { CITIES, getDistricts, getCityName } from '../constants/cities';
import { spacing, radius, typography } from '../theme';

interface Props {
  compact?: boolean;
  style?: any;
  fromCity?: string;
  toCity?: string;
  onCitiesSelected?: (from: string, to: string) => void;
}

export default function PriceEstimation({ compact, style, fromCity, toCity, onCitiesSelected }: Props) {
  const { colors } = useTheme();
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState(fromCity || '');
  const [selectedTo, setSelectedTo] = useState(toCity || '');
  const [showDistricts, setShowDistricts] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (fromCity) setSelectedFrom(fromCity);
    if (toCity) setSelectedTo(toCity);
  }, [fromCity, toCity]);

  const fromCityObj = CITIES.find(c => c.name === selectedFrom || c.id === selectedFrom);
  const toCityObj = CITIES.find(c => c.name === selectedTo || c.id === selectedTo);
  const fromDistricts = fromCityObj ? getDistricts(fromCityObj.id) : [];
  const toDistricts = toCityObj ? getDistricts(toCityObj.id) : [];

  const handleCitySelect = (type: 'from' | 'to', cityName: string) => {
    if (type === 'from') {
      setSelectedFrom(cityName);
      if (onCitiesSelected) onCitiesSelected(cityName, selectedTo);
      setShowFrom(false);
    } else {
      setSelectedTo(cityName);
      if (onCitiesSelected) onCitiesSelected(selectedFrom, cityName);
      setShowTo(false);
    }
    setShowDistricts(type);
  };

  const selectDistrict = (type: 'from' | 'to', districtName: string) => {
    setShowDistricts(null);
    setShowFrom(false);
    setShowTo(false);
  };

  return (
    <View style={[compact ? null : { marginBottom: spacing.md }, style]}>
      {/* Nereden — Accordion */}
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => { setShowFrom(!showFrom); setShowTo(false); setShowDistricts(null); }}
        activeOpacity={0.7}
      >
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>
          📍 Nereden: {selectedFrom ? getCityName(selectedFrom) || selectedFrom : 'Seçiniz'}
        </Text>
        <Text style={{ color: colors.primary }}>{showFrom ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showFrom && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface || colors.card, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city.id}
                style={[styles.cityItem, { borderBottomColor: colors.border }, selectedFrom === city.name && { backgroundColor: colors.primary + '15' }]}
                onPress={() => handleCitySelect('from', city.name)}
                activeOpacity={0.6}
              >
                <Text style={[typography.caption, { color: selectedFrom === city.name ? colors.primary : colors.text, fontWeight: selectedFrom === city.name ? '700' : '400' }]}>
                  {city.id} — {city.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* İlçeler (il seçildikten sonra) */}
          {fromDistricts.length > 0 && showDistricts === 'from' && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs, paddingHorizontal: spacing.sm }]}>
                {getCityName(selectedFrom)} ilçeleri:
              </Text>
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                {fromDistricts.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.cityItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectDistrict('from', d.name)}
                    activeOpacity={0.6}
                  >
                    <Text style={[typography.small, { color: colors.textSecondary }]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Nereye — Accordion */}
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, marginTop: showFrom ? 0 : -1 }]}
        onPress={() => { setShowTo(!showTo); setShowFrom(false); setShowDistricts(null); }}
        activeOpacity={0.7}
      >
        <Text style={[typography.label, { color: colors.text, fontWeight: '700' }]}>
          📍 Nereye: {selectedTo ? getCityName(selectedTo) || selectedTo : 'Seçiniz'}
        </Text>
        <Text style={{ color: colors.primary }}>{showTo ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showTo && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface || colors.card, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
            {CITIES.map(city => (
              <TouchableOpacity
                key={city.id}
                style={[styles.cityItem, { borderBottomColor: colors.border }, selectedTo === city.name && { backgroundColor: colors.primary + '15' }]}
                onPress={() => handleCitySelect('to', city.name)}
                activeOpacity={0.6}
              >
                <Text style={[typography.caption, { color: selectedTo === city.name ? colors.primary : colors.text, fontWeight: selectedTo === city.name ? '700' : '400' }]}>
                  {city.id} — {city.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {toDistricts.length > 0 && showDistricts === 'to' && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Text style={[typography.small, { color: colors.textSecondary, marginBottom: spacing.xs, paddingHorizontal: spacing.sm }]}>
                {getCityName(selectedTo)} ilçeleri:
              </Text>
              <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                {toDistricts.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.cityItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectDistrict('to', d.name)}
                    activeOpacity={0.6}
                  >
                    <Text style={[typography.small, { color: colors.textSecondary }]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Fiyat Tahmini — iki şehir seçilince göster */}
      {selectedFrom && selectedTo && !compact && (
        <View style={{ marginTop: spacing.sm, padding: spacing.md, backgroundColor: colors.primary + '10', borderRadius: radius.md }}>
          <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>
            💰 Tahmini Fiyat
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
            {selectedFrom} → {selectedTo} rotası için piyasa verilerine göre fiyat aralığı hesaplanıyor...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    minHeight: 50,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cityItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    justifyContent: 'center',
  },
});
