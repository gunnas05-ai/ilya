import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

const DRAFT_PREFIX = '@form_draft_';

/**
 * Form durumunu AsyncStorage'a auto-save eden hook.
 * Kullanici formdan ayrilip geri geldiginde veri kaybolmaz.
 *
 * Kullanim:
 *   const form = useForm(...);
 *   useFormDraft(form, 'load-create-step1');
 *   // form verisi her 2 saniyede bir otomatik kaydedilir
 */
export function useFormDraft<T extends FieldValues>(
  form: UseFormReturn<T>,
  formKey: string,
) {
  const storageKey = DRAFT_PREFIX + formKey;

  // Sayfa acildiginda draft'i geri yukle
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          Object.entries(saved).forEach(([key, value]) => {
            form.setValue(key as any, value as any);
          });
        } catch {}
      }
    });
  }, [storageKey]);

  // Form verisini periyodik kaydet
  useEffect(() => {
    const interval = setInterval(() => {
      const values = form.getValues();
      AsyncStorage.setItem(storageKey, JSON.stringify(values));
    }, 2000);
    return () => clearInterval(interval);
  }, [storageKey, form]);

  /** Draft'i manuel temizle */
  const clearDraft = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  /** Draft'i manuel kaydet (form submit oncesi) */
  const saveDraft = useCallback(async () => {
    const values = form.getValues();
    await AsyncStorage.setItem(storageKey, JSON.stringify(values));
  }, [storageKey, form]);

  return { clearDraft, saveDraft };
}

/** Tum draft'leri temizle (cikis yaparken kullan) */
export async function clearAllDrafts(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const draftKeys = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
  if (draftKeys.length > 0) {
    await AsyncStorage.multiRemove(draftKeys);
  }
}
