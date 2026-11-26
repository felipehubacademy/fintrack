import 'react-native-url-polyfill/auto';
import { createSupabaseClient } from '@fintrack/shared/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persist the session in AsyncStorage (SecureStore caps values at 2048 bytes,
// too small for a Supabase session).
const AsyncStorageAdapter = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  },
};

// Supabase client (null when EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are missing;
// callers must handle that). Login is phone + OTP on WhatsApp, email fallback.
export const supabase = createSupabaseClient({
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

