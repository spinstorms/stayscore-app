import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

/**
 * Storage for large JSON (the hotel directory, guest ranks, insights).
 * AsyncStorage on Android caps a single value at about 2 MB and the whole store at 6 MB,
 * so the directory never actually got saved there and every launch re-downloaded it.
 * On phones this writes plain files in the app's documents folder instead; the web build
 * keeps using AsyncStorage (browser storage).
 */
const IS_WEB = process.env.EXPO_OS === 'web';

function fileFor(key: string) {
  return new File(Paths.document, `${key.replace(/[^a-z0-9_-]/gi, '_')}.json`);
}

export async function readBig(key: string): Promise<string | null> {
  try {
    if (IS_WEB) return await AsyncStorage.getItem(key);
    const f = fileFor(key);
    return f.exists ? await f.text() : null;
  } catch {
    return null;
  }
}

export async function writeBig(key: string, value: string): Promise<void> {
  try {
    if (IS_WEB) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    const f = fileFor(key);
    if (!f.exists) f.create();
    await f.write(value);
  } catch {
    // storage full or unavailable: the app still works from the bundled copy
  }
}
