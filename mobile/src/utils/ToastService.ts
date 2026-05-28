// Basit bir Toast emülasyonu. Gerçek bir senaryoda react-native-toast-message veya benzeri kullanılır.
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export const ToastService = {
  showSuccess: (title: string, message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(`✅ ${title}`, message);
  },
  showError: (title: string, message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(`❌ ${title}`, message);
  },
  showInfo: (title: string, message: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(`ℹ️ ${title}`, message);
  }
};
