import * as Haptics from 'expo-haptics';

export const hapticLight = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
};

export const hapticMedium = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
};

export const hapticSuccess = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
};

export const hapticError = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
};

export const hapticWarning = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
};
