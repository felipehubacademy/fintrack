module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@fintrack/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@fintrack/shared$': '<rootDir>/../shared/src/index.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo|@expo|@unimodules|unimodules|expo-haptics|expo-notifications|expo-image-picker|expo-linear-gradient|expo-constants|expo-device|expo-status-bar|@supabase|react-native-chart-kit|react-native-svg|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-url-polyfill|lucide-react-native|simple-icons))',
  ],
};

