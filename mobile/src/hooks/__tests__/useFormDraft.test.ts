import { clearAllDrafts } from '../useFormDraft';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k: string, v: string) => { mockStorage[k] = v; return Promise.resolve(); }),
  getItem: jest.fn((k: string) => Promise.resolve(mockStorage[k] || null)),
  removeItem: jest.fn((k: string) => { delete mockStorage[k]; return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiRemove: jest.fn((keys: string[]) => { keys.forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
}));

describe('useFormDraft — clearAllDrafts', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it('should remove all draft keys', async () => {
    mockStorage['@form_draft_test1'] = '{"a":1}';
    mockStorage['@form_draft_test2'] = '{"b":2}';
    mockStorage['other_key'] = 'keep';

    await clearAllDrafts();

    expect(mockStorage['@form_draft_test1']).toBeUndefined();
    expect(mockStorage['@form_draft_test2']).toBeUndefined();
    expect(mockStorage['other_key']).toBeDefined();
  });

  it('should handle no drafts gracefully', async () => {
    await expect(clearAllDrafts()).resolves.toBeUndefined();
  });

  it('should only remove draft-prefixed keys', async () => {
    mockStorage['@form_draft_x'] = '1';
    mockStorage['settings'] = 'keep';
    mockStorage['@auth_tokens'] = 'keep';

    await clearAllDrafts();

    expect(mockStorage['@form_draft_x']).toBeUndefined();
    expect(mockStorage['settings']).toBe('keep');
    expect(mockStorage['@auth_tokens']).toBe('keep');
  });
});
