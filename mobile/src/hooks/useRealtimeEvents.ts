import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { subscribeToEvent, subscribeToUser } from '../services/websocket';
import { useAuthStore } from '../store/authStore';
import { useLoadAcceptStore } from '../store/loadAcceptStore';
import { useChatStore } from '../store/chatStore';
import * as Speech from 'expo-speech';

/**
 * EX-011: Global real-time WebSocket event listener.
 * Subscribes to bid updates, notifications, chat, tracking events.
 * Mount once at the app root (NavigationContainer level).
 */
export function useRealtimeEvents() {
  const { user, isAuthenticated } = useAuthStore();
  const fetchBidsForLoad = useLoadAcceptStore(s => s.fetchBidsForLoad);
  const fetchMyBids = useLoadAcceptStore(s => s.fetchMyBids);
  const receiveMessage = useChatStore(s => s.receiveMessage);
  const receiveNewChatRoom = useChatStore(s => s.receiveNewChatRoom);
  const unsubs = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Subscribe user to their channel
    subscribeToUser(user.id);

    // Clean up previous subscriptions
    unsubs.current.forEach(fn => fn());
    unsubs.current = [];

    // 1. Real-time notifications → Alert
    unsubs.current.push(subscribeToEvent('NOTIFICATION', (payload: any) => {
      if (payload.type === 'new_bid') {
        Alert.alert(
          payload.title || 'Yeni Teklif',
          payload.message || 'Yükünüze yeni bir teklif geldi.',
          [
            { text: 'Kapat', style: 'cancel' },
            { text: 'Görüntüle', onPress: () => {
              // Navigation handled by the screen that uses this hook
            }},
          ]
        );
        // Refresh bids if we're viewing a load
        if (payload.data?.loadId) {
          fetchBidsForLoad(payload.data.loadId).catch(() => {});
        }
      } else if (payload.type === 'bid_accepted') {
        Alert.alert('Teklifiniz Kabul Edildi!', payload.message);
        fetchMyBids().catch(() => {});
      } else if (payload.type === 'bid_rejected') {
        Alert.alert('Teklif Güncellemesi', payload.message);
        fetchMyBids().catch(() => {});
      } else if (payload.type === 'escrow_locked' || payload.type === 'escrow_released') {
        Alert.alert(payload.title, payload.message);
      } else if (payload.type === 'delivery_confirmed') {
        Alert.alert('Teslimat Onaylandı', payload.message);
        Speech.speak('Teslimat başarıyla onaylandı. Geri dönüş yükü araması yapabilirsiniz.', { language: 'tr-TR' });
      } else if (payload.type === 'new_load_match') {
        Alert.alert(payload.title, payload.message);
      } else if (payload.type === 'dispute_opened') {
        Alert.alert('⚠️ İhtilaf Açıldı', payload.message);
      } else if (payload.type === 'price_alert') {
        Alert.alert('⛽ Fiyat Alarmı', payload.message);
      }
    }));

    // 2. Real-time bid updates for load detail
    unsubs.current.push(subscribeToEvent('new_bid', (payload: any) => {
      if (payload.loadId) {
        fetchBidsForLoad(payload.loadId).catch(() => {});
      }
    }));

    // 3. Bid status changes (for MyBidsScreen)
    unsubs.current.push(subscribeToEvent('BID_STATUS_CHANGE', (payload: any) => {
      fetchMyBids().catch(() => {});
    }));

    // 4. Chat message received (for badge/notification when app is in background)
    unsubs.current.push(subscribeToEvent('CHAT_NOTIFICATION', (payload: any) => {
      // handled by chatStore via new_message event
    }));

    // 5. Chat new message
    unsubs.current.push(subscribeToEvent('new_message', (payload: any) => {
      receiveMessage(payload);
    }));

    // 6. New chat room
    unsubs.current.push(subscribeToEvent('NEW_CHAT_ROOM', (payload: any) => {
      receiveNewChatRoom(payload);
    }));

    // 7. Bid accepted/rejected for carrier
    unsubs.current.push(subscribeToEvent('bid_accepted', (payload: any) => {
      Alert.alert('🎉 Teklifiniz Kabul Edildi!', `${payload.amount?.toLocaleString?.('tr-TR') || ''} ₺ teklifiniz kabul edildi.`);
      fetchMyBids().catch(() => {});
    }));

    unsubs.current.push(subscribeToEvent('bid_rejected', (payload: any) => {
      Alert.alert('Teklif Reddedildi', 'Teklifiniz yük sahibi tarafından reddedildi.');
      fetchMyBids().catch(() => {});
    }));

    unsubs.current.push(subscribeToEvent('counter_bid', (payload: any) => {
      Alert.alert(
        'Karşı Teklif Geldi',
        `Yük sahibi ${payload.counterAmount?.toLocaleString?.('tr-TR')} ₺ karşı teklif yaptı.`,
        [{ text: 'Tekliflerim', onPress: () => { fetchMyBids().catch(() => {}); } }]
      );
    }));

    // 8. Profile verification events
    unsubs.current.push(subscribeToEvent('PROFILE_VERIFIED', (payload: any) => {
      Alert.alert('✅ Profil Onaylandı!', 'Profiliniz yük almak için uygun. Artık yükleri görebilirsiniz.');
      Speech.speak('Profiliniz onaylandı. Artık yük almaya uygunsunuz.', { language: 'tr-TR', rate: 0.9 });
    }));

    unsubs.current.push(subscribeToEvent('PROFILE_REJECTED', (payload: any) => {
      Alert.alert('⚠️ Profil Reddedildi', payload.notes || 'Lütfen bilgilerinizi kontrol edip tekrar gönderin.');
    }));

    unsubs.current.push(subscribeToEvent('PROFILE_STATUS_CHANGE', (payload: any) => {
      // Durum değişikliğini sessizce işle, bir sonraki API çağrısında güncellenir
    }));

    return () => {
      unsubs.current.forEach(fn => fn());
    };
  }, [isAuthenticated, user?.id]);
}
