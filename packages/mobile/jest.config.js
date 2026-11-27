module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  // Files from ../shared resolve deps (e.g. @babel/runtime) from the mobile install.
  modulePaths: ['<rootDir>/node_modules'],
  moduleNameMapper: {
    // Subpaths whose file differs from the folder name (see shared package.json "exports").
    '^@fintrack/shared/config$': '<rootDir>/../shared/src/config/features.js',
    '^@fintrack/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@fintrack/shared$': '<rootDir>/../shared/src/index.js',
    // App imports phosphor icons by deep path (Metro falls back to file resolution);
    // Jest honours the package "exports" map, so stub them like the barrel mock.
    '^phosphor-react-native/lib/module/icons/(.*)$': '<rootDir>/test-mocks/phosphorIcon.js',
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

