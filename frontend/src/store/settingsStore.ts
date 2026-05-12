import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storageMode: 'LOCAL' | 'CLOUD';
  setStorageMode: (mode: 'LOCAL' | 'CLOUD') => void;
  docType: 'AUTO' | 'QID' | 'PASSPORT';
  setDocType: (type: 'AUTO' | 'QID' | 'PASSPORT') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storageMode: 'LOCAL', // Default to LOCAL as per user request to reduce cost
      setStorageMode: (mode) => set({ storageMode: mode }),
      docType: 'AUTO', // Default to AUTO for smart scanning
      setDocType: (type) => set({ docType: type }),
    }),
    {
      name: 'qfy-settings',
    }
  )
);
