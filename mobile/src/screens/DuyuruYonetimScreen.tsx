import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';
import { announcementService } from '../services/announcementService';
import { handleError } from '../services/errorService';
import ErrorState from '../components/shared/ErrorState';
import OfflineBar from '../components/shared/OfflineBar';
import { hapticLight, hapticSuccess } from '../utils/haptic';
import { showToast } from '../utils/toast';

interface Props {
  navigation: any;
}

export default function DuyuruYonetimScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await announcementService.getLatest();
      if (data) {
        setContent(data.content);
      }
    } catch (err) {
      handleError(err, { screen: 'DuyuruYonetim', action: 'fetchAnnouncement' });
      setError('Duyuru yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const handleSave = async () => {
    hapticLight();
    setSaving(true);
    try {
      await announcementService.save(content);
      hapticSuccess();
      showToast('Sistem duyurusu başarıyla güncellendi.', 'success');
      navigation.goBack();
    } catch (err) {
      handleError(err, { screen: 'DuyuruYonetim', action: 'save' });
      showToast('Duyuru kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Duyuru yükleniyor...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ErrorState message={error} onRetry={fetchAnnouncement} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <OfflineBar />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={{ fontSize: 24, marginBottom: spacing.xs }}>📣</Text>
            <Text style={[typography.label, { color: colors.text, fontWeight: '800' }]}>
              Sistem Genel Duyurusu
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
              Buraya yazacağınız duyuru metni, uygulamanın Ana Sayfasında tüm kullanıcılara ve misafirlere anında gösterilecektir. Metni boş bırakarak duyuruyu kaldırabilirsiniz.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.label, { color: colors.text, fontWeight: '700', marginBottom: spacing.sm }]}>
              Duyuru İçeriği
            </Text>
            
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Duyuru metnini buraya yazın..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { hapticLight(); navigation.goBack(); }}
              disabled={saving}
            >
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>
                Vazgeç
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[typography.body, { color: colors.white, fontWeight: '700' }]}>
                  Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.lg },
  infoCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  textArea: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 150,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  saveBtn: {
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
});
