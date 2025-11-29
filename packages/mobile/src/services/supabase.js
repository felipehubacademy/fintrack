import 'react-native-url-polyfill/auto';
import { createSupabaseClient } from '@fintrack/shared/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar storage persistente usando AsyncStorage
// AsyncStorage não tem limite de tamanho como SecureStore (2048 bytes)
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

// Criar cliente Supabase com storage personalizado
export const supabase = createSupabaseClient({
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

