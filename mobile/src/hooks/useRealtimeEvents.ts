import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { subscribeToEvent, subscribeToUser } from '../services/websocket';
import { useAuthStore } from '../store/authStore';
import { useLoadAcceptStore } from '../store/loadAcceptStore';
import { useChatStore } from '../store/chatStore';
import { showToast } from '../utils/toast';
import * as Speech from 'expo-speech';

export function useRealtimeEvents() {
  const { user, isAuthenticated } = useAuthStore();
  const fetchBidsForLoad = useLoadAcceptStore((s) => s.fetchBidsForLoad);
  const fetchMyBids = useLoadAcceptStore((s) => s.fetchMyBids);
  const receiveMessage = useChatStore((s) => s.receiveMessage);
  const receiveNewChatRoom = useChatStore((s) => s.receiveNewChatRoom);
  const unsubs = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    subscribeToUser(user.id);

    unsubs.current.forEach((fn) => fn());
    unsubs.current = [];

    unsubs.current.push(
      subscribeToEvent('NOTIFICATION', (payload: any) => {
        if (payload.type === 'new_bid') {
          Alert.alert(
            payload.title || 'Yeni Teklif',
            payload.message || 'Yükünüze yeni bir teklif geldi.',
            [
              { text: 'Kapat', style: 'cancel' },
              { text: 'Görüntüle', onPress: () => {} },
            ],
          );
          if (payload.data?.loadId) {
            fetchBidsForLoad(payload.data.loadId).catch(() => {});
          }
        } else if (payload.type === 'bid_accepted') {
          Alert.alert('Teklifiniz Kabul Edildi!', payload.message);
          fetchMyBids().catch(() => {});
        } else if (payload.type === 'bid_rejected') {
          showToast(payload.message || 'Teklif güncellemesi', 'info');
          fetchMyBids().catch(() => {});
        } else if (payload.type === 'escrow_locked' || payload.type === 'escrow_released') {
          showToast(payload.message || payload.title, 'info');
        } else if (payload.type === 'delivery_confirmed') {
          showToast(payload.message || 'Teslimat onaylandı', 'success');
          Speech.speak('Teslimat başarıyla onaylandı. Geri dönüş yükü araması yapabilirsiniz.', { language: 'tr-TR' });
        } else if (payload.type === 'new_load_match') {
          showToast(payload.message || payload.title, 'info');
        } else if (payload.type === 'dispute_opened') {
          showToast(payload.message || 'İhtilaf açıldı', 'warning');
        } else if (payload.type === 'price_alert') {
          showToast(payload.message || 'Fiyat alarmı', 'warning');
        }
      }),
    );

    unsubs.current.push(
      subscribeToEvent('new_bid', (payload: any) => {
        if (payload.loadId) {
          fetchBidsForLoad(payload.loadId).catch(() => {});
        }
      }),
    );

    unsubs.current.push(
      subscribeToEvent('BID_STATUS_CHANGE', () => {
        fetchMyBids().catch(() => {});
      }),
    );

    unsubs.current.push(subscribeToEvent('CHAT_NOTIFICATION', () => {}));

    unsubs.current.push(
      subscribeToEvent('new_message', (payload: any) => {
        receiveMessage(payload);
      }),
    );

    unsubs.current.push(
      subscribeToEvent('NEW_CHAT_ROOM', (payload: any) => {
        receiveNewChatRoom(payload);
      }),
    );

    unsubs.current.push(
      subscribeToEvent('bid_accepted', (payload: any) => {
        Alert.alert(
          'Teklifiniz Kabul Edildi!',
          `${payload.amount?.toLocaleString?.('tr-TR') || ''} ₺ teklifiniz kabul edildi.`,
        );
        fetchMyBids().catch(() => {});
      }),
    );

    unsubs.current.push(
      subscribeToEvent('bid_rejected', () => {
        showToast('Teklifiniz yük sahibi tarafından reddedildi.', 'info');
        fetchMyBids().catch(() => {});
      }),
    );

    unsubs.current.push(
      subscribeToEvent('counter_bid', (payload: any) => {
        Alert.alert(
          'Karşı Teklif Geldi',
          `Yük sahibi ${payload.counterAmount?.toLocaleString?.('tr-TR')} ₺ karşı teklif yaptı.`,
          [{ text: 'Tekliflerim', onPress: () => { fetchMyBids().catch(() => {}); } }],
        );
      }),
    );

    unsubs.current.push(
      subscribeToEvent('PROFILE_VERIFIED', () => {
        showToast('Profiliniz onaylandı! Artık yük almaya uygunsunuz.', 'success');
        Speech.speak('Profiliniz onaylandı. Artık yük almaya uygunsunuz.', { language: 'tr-TR', rate: 0.9 });
      }),
    );

    unsubs.current.push(
      subscribeToEvent('PROFILE_REJECTED', (payload: any) => {
        showToast(payload.notes || 'Profiliniz reddedildi. Lütfen bilgilerinizi kontrol edin.', 'error');
      }),
    );

    unsubs.current.push(subscribeToEvent('PROFILE_STATUS_CHANGE', () => {}));

    return () => {
      unsubs.current.forEach((fn) => fn());
    };
  }, [isAuthenticated, user?.id]);
}
