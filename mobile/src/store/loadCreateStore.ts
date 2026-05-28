import { create } from 'zustand';
import { LoadFormData, PriceSummary } from '../types/load';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = 'kaptan_load_draft';
const TEMPLATES_KEY = 'kaptan_load_templates';

interface LoadCreateState {
  step: number;
  formData: Partial<LoadFormData>;
  priceSummary: PriceSummary | null;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  savedId: string | null;
  templates: Array<{ name: string; data: Partial<LoadFormData> }>;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<LoadFormData>) => void;
  setPriceSummary: (summary: PriceSummary) => void;
  setSubmitting: (val: boolean) => void;
  setSavingDraft: (val: boolean) => void;
  setSavedId: (id: string | null) => void;
  reset: () => void;
  // UX-006: Draft + Template
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<boolean>;
  saveAsTemplate: (name: string) => Promise<void>;
  loadTemplate: (name: string) => void;
  loadTemplates: () => Promise<void>;
}

const initialState = {
  step: 1,
  formData: {},
  priceSummary: null,
  isSubmitting: false,
  isSavingDraft: false,
  savedId: null,
  templates: [],
};

export const useLoadCreateStore = create<LoadCreateState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 3) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),
  updateFormData: (data) => {
    set((s) => ({ formData: { ...s.formData, ...data } }));
    // Auto-save draft on each update
    const { formData } = get();
    if (Object.keys(formData).length > 1) {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(formData)).catch(() => {});
    }
  },
  setPriceSummary: (summary) => set({ priceSummary: summary }),
  setSubmitting: (val) => set({ isSubmitting: val }),
  setSavingDraft: (val) => set({ isSavingDraft: val }),
  setSavedId: (id) => set({ savedId: id }),
  reset: () => {
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    set(initialState);
  },

  // UX-006: Save current form as draft
  saveDraft: async () => {
    const { formData } = get();
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  },

  // UX-006: Load saved draft
  loadDraft: async () => {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    if (json) {
      set({ formData: JSON.parse(json) });
      return true;
    }
    return false;
  },

  // UX-006: Save as reusable template
  saveAsTemplate: async (name: string) => {
    const { formData, templates } = get();
    const updated = [...templates.filter(t => t.name !== name), { name, data: { ...formData } }];
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    set({ templates: updated });
  },

  // UX-006: Load template into form
  loadTemplate: (name: string) => {
    const { templates } = get();
    const tmpl = templates.find(t => t.name === name);
    if (tmpl) set({ formData: { ...tmpl.data } });
  },

  // UX-006: Load all templates
  loadTemplates: async () => {
    const json = await AsyncStorage.getItem(TEMPLATES_KEY);
    if (json) set({ templates: JSON.parse(json) });
  },
}));
