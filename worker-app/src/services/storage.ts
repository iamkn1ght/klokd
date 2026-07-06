/**
 * Cross-platform secure storage shim.
 * iOS/Android → expo-secure-store (Keychain / Keystore)
 * Web        → localStorage (no native module available in browser)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const webStore = {
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined') return window.localStorage.getItem(key);
    return null;
  },
  async deleteItem(key: string) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') return webStore.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStore.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') return webStore.deleteItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
