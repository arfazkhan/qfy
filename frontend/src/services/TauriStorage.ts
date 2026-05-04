import { BaseDirectory, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { desktopDir, join } from '@tauri-apps/api/path';

export const STORAGE_FOLDER = 'QFY_Archive';

export class TauriStorageService {
  /**
   * Saves a base64 image to the local desktop archive.
   * @param base64 The base64 string (with or without data prefix)
   * @param filename The desired filename (e.g., 'NAME_QID_FRONT.jpg')
   * @param subfolder Optional subfolder (e.g., 'Individuals', 'Businesses')
   * @returns The absolute path to the saved file
   */
  static async saveImage(base64: string, filename: string, subfolder: string = ''): Promise<string> {
    try {
      // 1. Clean base64 data
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // 2. Get Desktop Path
      const desktop = await desktopDir();
      const archivePath = await join(desktop, STORAGE_FOLDER);
      const targetDir = subfolder ? await join(archivePath, subfolder) : archivePath;

      // 3. Ensure directories exist
      await mkdir(targetDir, { recursive: true });

      // 4. Construct final path
      const filePath = await join(targetDir, filename);

      // 5. Write file
      await writeFile(filePath, binaryData);

      return filePath;
    } catch (error) {
      console.error('Tauri Storage Error:', error);
      throw new Error('Failed to save file locally. Ensure Tauri permissions are set.');
    }
  }

  /**
   * Checks if the app is currently running in a Tauri environment.
   */
  static isTauri(): boolean {
    return !!(window as any).__TAURI_INTERNALS__;
  }
}
