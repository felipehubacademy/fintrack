import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/components/ui/Toast';
import { ConfirmationProvider } from './src/components/ui/ConfirmationProvider';
import { AlertProvider } from './src/components/ui/AlertProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ToastProvider>
          <ConfirmationProvider>
            <AlertProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </AlertProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
