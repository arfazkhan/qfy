import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storageMode: 'LOCAL' | 'CLOUD';
  setStorageMode: (mode: 'LOCAL' | 'CLOUD') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storageMode: 'LOCAL', // Default to LOCAL as per user request to reduce cost
      setStorageMode: (mode) => set({ storageMode: mode }),
    }),
    {
      name: 'qfy-settings',
    }
  )
);
