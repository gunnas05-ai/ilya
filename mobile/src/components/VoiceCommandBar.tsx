import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { spacing, radius, typography } from '../theme';

const QUICK_COMMANDS = [
  { command: 'Yakınımdaki dönüş yüklerini göster', action: 'show_nearby', icon: '📍' },
  { command: '100 kilometre içindeki yükleri filtrele', action: 'filter_100', icon: '🎯' },
  { command: 'Escrow garantili yükleri göster', action: 'filter_escrow', icon: '🔒' },
  { command: 'Güvenli ödemeli yükleri filtrele', action: 'filter_escrow_safe', icon: '🔒' },
  { command: '10 ton altındaki yükleri filtrele', action: 'filter_tonnage_10', icon: '⚖️' },
  { command: 'Rotayı aç', action: 'open_route', icon: '🗺️' },
  { command: 'Escrow detaylarını aç', action: 'escrow_details', icon: '🔐' },
  { command: '5000 TL teklif ver', action: 'bid_5000', icon: '💰' },
  { command: 'Pazarlığı kabul et', action: 'accept_counter', icon: '🤝' },
  { command: 'Haritada İstanbul ilanlarını göster', action: 'show_istanbul', icon: '🗺️' },
  { command: 'İlanı oku', action: 'read_aloud', icon: '🔊' },
];

interface VoiceCommandBarProps {
  onCommand: (action: string, command: string) => void;
  colors: any;
}

/** Hızlı komut çubuğu — tek dokunuşla sık kullanılan işlemleri tetikler.
 *  Sesli komut özelliği (expo-speech-recognition) henüz aktif değil. */
export default function VoiceCommandBar({ onCommand, colors }: VoiceCommandBarProps) {
  const [expanded, setExpanded] = useState(false);

  const handleQuickCommand = (action: string, command: string) => {
    onCommand(action, command);
    Speech.speak(`"${command}" komutu uygulandı`, {
      language: 'tr-TR',
      rate: 0.85,
    });
  };

  const toggleExpanded = () => {
    if (expanded) {
      setExpanded(false);
      Speech.stop();
    } else {
      setExpanded(true);
      Speech.speak('Hızlı komutlar kullanıma hazır.', {
        language: 'tr-TR',
        rate: 0.85,
      });
      setTimeout(() => setExpanded(false), 10000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.micBtn, expanded && { backgroundColor: colors.primary + '15' }]}
          onPress={toggleExpanded}
        >
          <Text style={[typography.h3, { color: expanded ? colors.primary : colors.text }]}>
            {expanded ? '⚡' : '🎤'}
          </Text>
        </TouchableOpacity>
        <Text style={[typography.label, { color: colors.textTertiary, flex: 1 }]}>
          {expanded ? 'Hızlı Komutlar — birini seçin' : 'Hızlı Komutlar'}
        </Text>
      </View>
      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commandsScroll}>
          {QUICK_COMMANDS.map((cmd) => (
            <TouchableOpacity
              key={cmd.action}
              style={[styles.commandChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => handleQuickCommand(cmd.action, cmd.command)}
            >
              <Text style={[typography.caption, { color: colors.primary }]}>
                {cmd.icon} {cmd.command}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandsScroll: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  commandChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});
