module.exports = function (api) {
  api.cache(true)

  console.log('[babel.config.js] Loading with NODE_ENV:', process.env.NODE_ENV)
  console.log('[babel.config.js] Platform:', process.env.EXPO_PLATFORM)

  const isWeb = process.env.EXPO_PLATFORM === 'web'
  const plugins = []

  // Add the React Native ID plugin for web builds or when explicitly testing
  if (isWeb || process.env.NODE_ENV === 'development') {
    console.log('[babel.config.js] Adding React Native ID plugin')
    plugins.push([
      require.resolve('./babel-plugin-add-react-native-id'),
      {
        platform: process.env.EXPO_PLATFORM || 'web',
        enabled: true,
      },
    ])
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  }
}
