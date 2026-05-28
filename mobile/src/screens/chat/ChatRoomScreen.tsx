import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useChatStore, ChatMessage } from '../../store/chatStore';
import { spacing, radius, typography } from '../../theme';

export default function ChatRoomScreen() {
  const { colors, isDark } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { roomId } = route.params;

  const { chatRooms, sendMessage, setActiveRoom } = useChatStore();
  const { user: currentUser } = useAuthStore();

  const room = chatRooms[roomId];
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Set navigation header title to room name
    if (room) {
      navigation.setOptions({
        title: room.isGroup ? `👥 ${room.name}` : room.name,
      });
    }
  }, [room]);

  useEffect(() => {
    // Mark room as active and clear its unread counts
    setActiveRoom(roomId);

    // Auto-scroll to bottom initially
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 150);

    return () => {
      setActiveRoom(null);
    };
  }, [roomId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (room?.messages) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [room?.messages?.length]);

  if (!room) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>Sohbet bulunamadı.</Text>
      </View>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(roomId, inputText.trim(), currentUser!.id, currentUser!.fullName);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Info strip: group member names */}
      {room.isGroup && (
        <View style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{ fontSize: 10, color: colors.textTertiary }} numberOfLines={1}>
            {room.participantNames.filter((n: string) => n !== currentUser?.fullName).join(', ')}
          </Text>
        </View>
      )}

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
        style={{ flex: 1 }}
      >
        {room.messages.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.textTertiary, marginVertical: 30, fontStyle: 'italic' }}>
            Sohbet başlatıldı. İlk mesajınızı aşağıdan yazabilirsiniz! 🚀
          </Text>
        ) : (
          room.messages.map((msg, index) => {
            const isOwn = msg.senderId === currentUser?.id;
            
            return (
              <View
                key={msg.id || index}
                style={{
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  marginBottom: spacing.sm,
                }}
              >
                {/* Sender Name for group chats */}
                {room.isGroup && !isOwn && (
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 8, marginBottom: 2, fontWeight: '600' }}>
                    {msg.senderName}
                  </Text>
                )}

                <View style={{
                  backgroundColor: isOwn ? '#FF6B00' : colors.card,
                  borderRadius: radius.md,
                  borderTopRightRadius: isOwn ? 0 : radius.md,
                  borderTopLeftRadius: isOwn ? radius.md : 0,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: 1,
                  borderColor: isOwn ? '#FF6B00' : colors.border,
                  // Shadows
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.08,
                  shadowRadius: 1,
                  elevation: 1,
                }}>
                  <Text style={{
                    color: isOwn ? '#FFFFFF' : colors.text,
                    fontSize: 14,
                    lineHeight: 18,
                    fontWeight: '500',
                  }}>
                    {msg.text}
                  </Text>
                  
                  <Text style={{
                    alignSelf: 'flex-end',
                    fontSize: 9,
                    color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textTertiary,
                    marginTop: 4,
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Footer Typing Area */}
      <View style={{
        padding: spacing.md,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            color: colors.text,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={{
            marginLeft: spacing.md,
            backgroundColor: '#FF6B00',
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            // Shadow
            shadowColor: '#FF6B00',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
            elevation: 3,
          }}
          onPress={handleSend}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>➔</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
