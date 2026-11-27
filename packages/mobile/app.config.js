// Expo app config. Store setup and what Felipe fills: docs/launch/STORES.md.
const IS_PROD = process.env.APP_ENV === 'production';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

// One app, localized names (plan 6): "MeuAzulão" for Portuguese, "Zul" for
// English (default) and Spanish. The base name below is the fallback; the
// per-language names come from ./locales/*.json (iOS CFBundleDisplayName,
// Android app_name).
const getAppName = () => {
  if (IS_PROD) return 'Zul';
  if (IS_PREVIEW) return 'Zul (Preview)';
  return 'Zul (Dev)';
};

const BRAND_COLOR = '#1A6AFF';

// Apple privacy manifest. Keep in sync with App Store Connect "App Privacy"
// and Google Play "Data safety" (docs/launch/STORES.md, plan 6.4).
const collected = (type, { linked = true, purposes = ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] } = {}) => ({
  NSPrivacyCollectedDataType: type,
  NSPrivacyCollectedDataTypeLinked: linked,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: purposes,
});

const privacyManifests = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyCollectedDataTypes: [
    collected('NSPrivacyCollectedDataTypePhoneNumber'),
    collected('NSPrivacyCollectedDataTypeName'),
    collected('NSPrivacyCollectedDataTypeEmailAddress'),
    collected('NSPrivacyCollectedDataTypeOtherFinancialInfo'),
    collected('NSPrivacyCollectedDataTypePhotosorVideos'),
    collected('NSPrivacyCollectedDataTypeCrashData', { linked: false }),
    collected('NSPrivacyCollectedDataTypeProductInteraction', {
      purposes: [
        'NSPrivacyCollectedDataTypePurposeAppFunctionality',
        'NSPrivacyCollectedDataTypePurposeAnalytics',
      ],
    }),
  ],
  // Required-reason APIs used by React Native, Expo modules and AsyncStorage.
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
      NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
      NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
      NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
    },
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
      NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
    },
  ],
};

export default {
  expo: {
    name: getAppName(),
    slug: 'meuazulao-mobile',
    version: '1.0.0',
    // Native build numbers (ios.buildNumber / android.versionCode) are managed
    // remotely by EAS (eas.json: appVersionSource "remote", autoIncrement).
    runtimeVersion: { policy: 'appVersion' },
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: BRAND_COLOR,
    },
    locales: {
      en: './locales/en.json',
      pt: './locales/pt.json',
      es: './locales/es.json',
    },
    plugins: [
      'expo-dev-client',
      '@sentry/react-native',
      [
        'expo-image-picker',
        {
          // English defaults; localized in ./locales/*.json.
          photosPermission: 'Zul opens your photos so you can attach a receipt to an expense or choose a profile picture.',
          cameraPermission: 'Zul uses the camera so you can take a photo of a receipt and attach it to an expense.',
          // Only still images are picked; no audio/video recording.
          microphonePermission: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: BRAND_COLOR,
          sounds: [],
        },
      ],
    ],
    notification: {
      icon: './assets/icon.png',
      color: BRAND_COLOR,
      androidMode: 'default',
      androidCollapsedTitle: 'Zul',
    },
    ios: {
      // iPhone only for launch: supporting iPad would require iPad screenshots
      // and iPad-specific review.
      supportsTablet: false,
      bundleIdentifier: 'com.meuazulao.app',
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        CFBundleLocalizations: ['en', 'pt', 'es'],
        CFBundleDevelopmentRegion: 'en',
      },
      privacyManifests,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.meuazulao.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: BRAND_COLOR,
      },
      // Camera for receipt photos. Photos are picked with the system photo
      // picker (no READ_MEDIA_* needed). READ/WRITE_EXTERNAL_STORAGE are not
      // requested here; expo-image-picker still declares them for Android 12
      // and older, where its gallery/camera flow asks for them.
      permissions: ['CAMERA'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        ...(IS_PROD ? ['android.permission.SYSTEM_ALERT_WINDOW'] : []),
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png',
    },
    extra: {
      eas: {
        projectId: '1c40456c-0cbf-44bf-be20-e6723bffc90c',
      },
      appEnv: process.env.APP_ENV || 'development',
      // Optional. Without a DSN Sentry stays off and the app runs normally.
      sentryDsn: process.env.SENTRY_DSN || '',
    },
    owner: 'felipexavier_kid',
  },
};
