import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { spacing, radius, typography } from '../theme';

const VOICE_COMMANDS = [
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

export default function VoiceCommandBar({ onCommand, colors }: VoiceCommandBarProps) {
  const [listening, setListening] = useState(false);

  const handleVoiceCommand = (action: string, command: string) => {
    onCommand(action, command);
    Speech.speak(`"${command}" komutu algılandı`, {
      language: 'tr-TR',
      rate: 0.85,
    });
  };

  const toggleListening = () => {
    if (listening) {
      setListening(false);
      Speech.stop();
    } else {
      setListening(true);
      Speech.speak('Sesli komutlar kullanıma hazır. Lütfen bir komut seçin.', {
        language: 'tr-TR',
        rate: 0.85,
      });
      // Auto-dismiss after 10 seconds
      setTimeout(() => setListening(false), 10000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.micBtn, listening && { backgroundColor: colors.danger + '20' }]}
          onPress={toggleListening}
        >
          <Text style={[typography.h3, { color: listening ? colors.danger : colors.text }]}>
            {listening ? '🔴' : '🎤'}
          </Text>
        </TouchableOpacity>
        <Text style={[typography.label, { color: colors.textTertiary, flex: 1 }]}>
          {listening ? 'Dinleniyor... Bir komut seçin' : 'Sesli Komutlar'}
        </Text>
      </View>
      {listening && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.commandsScroll}>
          {VOICE_COMMANDS.map((cmd) => (
            <TouchableOpacity
              key={cmd.action}
              style={[styles.commandChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => handleVoiceCommand(cmd.action, cmd.command)}
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
