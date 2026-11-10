import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn || '';
const appEnv = Constants.expoConfig?.extra?.appEnv || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment: appEnv,
    tracesSampleRate: appEnv === 'production' ? 0.2 : 1.0,
    enabled: appEnv !== 'development' || !!dsn,
  });
}

export { Sentry };
