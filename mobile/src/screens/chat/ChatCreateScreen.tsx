import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { spacing, radius, typography } from '../../theme';

export default function ChatCreateScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { usersList, fetchUsersList, user: currentUser } = useAuthStore();
  const { createChatRoom } = useChatStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    async function loadData() {
      await fetchUsersList();
      setLoading(false);
    }
    loadData();
  }, []);

  // Safely extract array from usersList to avoid any format discrepancies
  const safeUsersList = Array.isArray(usersList) 
    ? usersList 
    : (usersList && typeof usersList === 'object' && Array.isArray((usersList as any).data))
      ? (usersList as any).data
      : [];

  // Filter out current user from the list
  const otherUsers = safeUsersList.filter((u: any) => u && u.id !== currentUser?.id);

  // Filter based on search query
  const filteredUsers = otherUsers.filter((u: any) => {
    if (!u) return false;
    const query = searchQuery.toLowerCase();
    const nameMatch = u.fullName ? u.fullName.toLowerCase().includes(query) : false;
    const emailMatch = u.email ? u.email.toLowerCase().includes(query) : false;
    
    const roleLabels: Record<string, string> = {
      'super_admin': 'süper yönetici admin',
      'tasiyici': 'taşıyıcı sürücü sofor şoför filo',
      'sofor': 'sofor şoför sürücü tasiyici',
      'filo_yoneticisi': 'filo yöneticisi tasiyici',
      'yuk_veren': 'yük yükleyici veren',
    };
    const roleLabel = roleLabels[u.role] || 'üye genel';
    const roleMatch = roleLabel.includes(query);

    return nameMatch || emailMatch || roleMatch;
  });

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleStartChat = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir üye seçiniz.');
      return;
    }

    const isGroup = selectedUserIds.length > 1;
    if (isGroup && !groupName.trim()) {
      Alert.alert('Grup Adı Eksik', 'Lütfen grup sohbeti için bir grup ismi belirleyiniz.');
      return;
    }

    try {
      // Gather participant IDs and names including current user
      const participantIds = [...selectedUserIds, currentUser!.id];
      
      const selectedNames = otherUsers
        .filter((u: any) => selectedUserIds.includes(u.id))
        .map((u: any) => u.fullName);
      
      const participantNames = [...selectedNames, currentUser!.fullName];

      // Formulate room name
      let roomName = groupName.trim();
      if (!isGroup) {
        // For 1-on-1, room name is the other participant's name
        const otherUser = otherUsers.find((u: any) => u.id === selectedUserIds[0]);
        roomName = otherUser ? otherUser.fullName : 'Gizemli Üye';
      }

      const roomId = await createChatRoom(participantIds, participantNames, roomName, isGroup);
      
      // Navigate to ChatRoom Screen
      navigation.replace('ChatRoom', { roomId });
    } catch (err) {
      console.error('Error creating chat:', err);
      Alert.alert('Hata', 'Sohbet başlatılırken bir sorun oluştu.');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'super_admin': '👑 Süper Admin',
      'tasiyici': '🚛 Taşıyıcı Sürücü',
      'sofor': '🚚 Profesyonel Şoför',
      'filo_yoneticisi': '🏢 Filo Yöneticisi',
      'yuk_veren': '📦 Yük Yükleyici',
    };
    return labels[role] || '👤 Genel Üye';
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {/* Group Name input if group chat */}
        {selectedUserIds.length > 1 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.label, { color: colors.text, fontWeight: '800', marginBottom: spacing.xs }]}>
              👥 Grup Sohbeti Adı
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: '#FF6B00',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                color: colors.text,
                fontSize: 14,
                fontWeight: '600',
              }}
              placeholder="Grup ismini yazın (örn. Ege Taşıma Grubu)"
              placeholderTextColor={colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>
        )}

        {/* Search Field */}
        <View style={{ marginBottom: spacing.md }}>
          <TextInput
            style={{
              backgroundColor: colors.card,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.text,
              fontSize: 14,
            }}
            placeholder="🔍 İsim, e-posta veya role göre ara..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF6B00" style={{ marginTop: 50 }} />
        ) : filteredUsers.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontStyle: 'italic' }}>
            Aramanıza uygun kayıtlı üye bulunamadı.
          </Text>
        ) : (
          filteredUsers.map((u: any) => {
            const isSelected = selectedUserIds.includes(u.id);

            return (
              <TouchableOpacity
                key={u.id}
                onPress={() => toggleSelectUser(u.id)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                  borderRadius: radius.md,
                  marginBottom: spacing.sm,
                  borderWidth: 1,
                  borderColor: isSelected ? '#FF6B00' : colors.border,
                  padding: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '700' }]}>
                    {u.fullName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                    {u.email}
                  </Text>
                  
                  <View style={{
                    marginTop: 6,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: radius.sm,
                    backgroundColor: colors.border,
                    alignSelf: 'flex-start'
                  }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
                      {getRoleLabel(u.role)}
                    </Text>
                  </View>
                </View>

                {/* Checkbox indicator */}
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: isSelected ? '#FF6B00' : colors.textTertiary,
                  backgroundColor: isSelected ? '#FF6B00' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isSelected && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button to submit */}
      {selectedUserIds.length > 0 && (
        <View style={{
          padding: spacing.md,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#FF6B00',
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              alignItems: 'center',
            }}
            onPress={handleStartChat}
            activeOpacity={0.8}
          >
            <Text style={[typography.label, { color: '#FFF', fontWeight: '800' }]}>
              {selectedUserIds.length > 1 
                ? `👥 Sohbeti Başlat (${selectedUserIds.length} Üye Seçildi)` 
                : ' Bire Bir Sohbeti Başlat 🚀'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
