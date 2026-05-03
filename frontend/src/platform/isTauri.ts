export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI_METADATA__ !== undefined;
};
