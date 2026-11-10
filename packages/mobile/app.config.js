const IS_PROD = process.env.APP_ENV === 'production';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const getAppName = () => {
  if (IS_PROD) return 'MeuAzulão';
  if (IS_PREVIEW) return 'MeuAzulão (Preview)';
  return 'MeuAzulão (Dev)';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'meuazulao-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1A6AFF',
    },
    plugins: [
      'expo-dev-client',
      [
        'expo-image-picker',
        {
          photosPermission: 'Precisamos acessar sua galeria para anexar comprovantes às transações.',
          cameraPermission: 'Precisamos acessar a câmera para fotografar comprovantes diretamente no app.',
          microphonePermission: 'Precisamos do microfone apenas se você registrar vídeos como comprovantes.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#1A6AFF',
          sounds: [],
        },
      ],
    ],
    notification: {
      icon: './assets/icon.png',
      color: '#1A6AFF',
      androidMode: 'default',
      androidCollapsedTitle: 'MeuAzulão',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.meuazulao.app',
      infoPlist: {
        NSUserTrackingUsageDescription: 'Este app não rastreia usuários entre apps e sites.',
        NSCameraUsageDescription: 'Permitir acesso à câmera para fotografar recibos de transações.',
        NSPhotoLibraryUsageDescription: 'Permitir acesso à galeria para selecionar fotos de recibos.',
      },
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.meuazulao.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1A6AFF',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
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
    },
    owner: 'felipexavier_kid',
  },
};
