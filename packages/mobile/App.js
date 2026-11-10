import './src/services/sentry';
import { Sentry } from './src/services/sentry';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/components/ui/Toast';
import { ConfirmationProvider } from './src/components/ui/ConfirmationProvider';
import { AlertProvider } from './src/components/ui/AlertProvider';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function StatusBarWithTheme() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <AlertProvider>
                <AppNavigator />
                <StatusBarWithTheme />
              </AlertProvider>
            </ConfirmationProvider>
          </ToastProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
