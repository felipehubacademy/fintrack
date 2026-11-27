import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Crash reporting is optional: with no DSN (SENTRY_DSN at build time) Sentry
// is never initialised and Sentry.wrap() is a no-op, so the app runs fine.
const dsn = Constants.expoConfig?.extra?.sentryDsn || '';
const appEnv = Constants.expoConfig?.extra?.appEnv || 'development';

if (dsn) {
  try {
    Sentry.init({
      dsn,
      environment: appEnv,
      tracesSampleRate: appEnv === 'production' ? 0.2 : 1.0,
      // Privacy (App Store / Play data declarations): crash data only,
      // no IP address or other default PII.
      sendDefaultPii: false,
    });
  } catch (error) {
    // Never let crash reporting crash the app.
  }
}

export { Sentry };
