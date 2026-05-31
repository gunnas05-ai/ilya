import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useChatStore } from '../../store/chatStore';
import { spacing, radius, typography } from '../../theme';
import { hapticLight } from '../../utils/haptic';
import EmptyState from '../../components/shared/EmptyState';

type ChatFilter = 'all' | 'groups' | 'direct' | 'unread';

const FILTER_TABS: { key: ChatFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: '💬' },
  { key: 'direct', label: 'Birebir', icon: '👤' },
  { key: 'groups', label: 'Gruplar', icon: '👥' },
  { key: 'unread', label: 'Okunmamış', icon: '🔵' },
];

const BOTTOM_TAB_HEIGHT = 48;

export default function ChatListScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { chatRooms, isLoading } = useChatStore();
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');

  const roomsList = useMemo(() => {
    const all = Object.values(chatRooms);
    switch (activeFilter) {
      case 'groups':
        return all.filter(r => r.isGroup);
      case 'direct':
        return all.filter(r => !r.isGroup);
      case 'unread':
        return all.filter(r => (r.unreadCount || 0) > 0);
      default:
        return all;
    }
  }, [chatRooms, activeFilter]);

  const unreadCount = useMemo(
    () => Object.values(chatRooms).filter(r => (r.unreadCount || 0) > 0).length,
    [chatRooms],
  );

  if (chatRooms && Object.keys(chatRooms).length === 0 && isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.actionStrip, {
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
          {roomsList.length > 0
            ? `${roomsList.length} sohbet · ${unreadCount} okunmamış`
            : 'Gerçek zamanlı mesajlaşma'}
        </Text>
        <TouchableOpacity
          style={[styles.newChatPill, { backgroundColor: '#FF6B00' }]}
          onPress={() => {
            hapticLight();
            navigation.navigate('ChatCreate');
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>+ Yeni Sohbet</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sohbet Listesi ── */}
      <FlatList
        data={roomsList}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState emoji={activeFilter === 'unread' ? '✅' : '💬'} message={activeFilter === 'unread' ? 'Okunmamış Mesaj Yok' : activeFilter === 'groups' ? 'Grup Sohbeti Bulunmuyor' : activeFilter === 'direct' ? 'Birebir Sohbet Bulunmuyor' : 'Henüz Sohbet Bulunmuyor'} description="Yeni bir sohbet başlatmak için + butonuna tıklayın." />
        }
        renderItem={({ item: room }) => {
          const lastMessage = room.messages?.[room.messages.length - 1];
          const hasUnread = (room.unreadCount || 0) > 0;
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatRoom', { roomId: room.id })}
              activeOpacity={0.7}
              style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDark ? '#FFFFFF' : '#000000' }]}
            >
              <View style={{ width: 6, backgroundColor: hasUnread ? '#FF6B00' : colors.border, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md }} />
              <View style={{ flex: 1, padding: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.label, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>{room.isGroup ? '👥 ' : '👤 '}{room.name}</Text>
                  {hasUnread && (<View style={styles.unreadBadge}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{room.unreadCount}</Text></View>)}
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, fontStyle: lastMessage ? 'normal' : 'italic' }]} numberOfLines={1}>{lastMessage ? `${lastMessage.senderName}: ${lastMessage.text}` : 'Henüz mesaj gönderilmedi.'}</Text>
                {lastMessage && (<Text style={{ alignSelf: 'flex-end', fontSize: 10, color: colors.textTertiary, marginTop: 4 }}>{new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>)}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── ALT TAB BAR: Filtreleme Sekmeleri ── */}
      <View style={[styles.bottomTabBar, {
        height: BOTTOM_TAB_HEIGHT,
        backgroundColor: colors.card,
        borderTopColor: colors.border,
      }]}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.bottomTab}
              onPress={() => {
                hapticLight();
                setActiveFilter(tab.key);
              }}
              activeOpacity={0.7}
            >
              <Text style={[typography.caption, {
                color: isActive ? '#FF6B00' : colors.textTertiary,
                fontWeight: isActive ? '700' : '500',
              }]}>
                {tab.icon} {tab.label}
              </Text>
              {tab.key === 'unread' && unreadCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#FF6B00' }]}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>{unreadCount}</Text>
                </View>
              )}
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: '#FF6B00' }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  newChatPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  roomCard: {
    flexDirection: 'row',
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  unreadBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Bottom Tab Bar ──
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.xs,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: 2,
    right: '20%',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 1.5,
  },
});
