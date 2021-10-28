/* eslint-disable */
module.exports = {
  env: {
    'react-native/react-native': true
  },
  extends: [
    'plugin:react/recommended',
    'eslint:recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
      legacyDecorators: true
    },
    ecmaVersion: 11,
    sourceType: 'module'
  },
  plugins: [
    'react',
    'react-native'
  ],
  parser: 'babel-eslint',
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react-native/no-unused-styles': 2,
    'react-native/no-raw-text': 2,
    'react-native/no-single-element-style-arrays': 2,
    semi: ['error', 'always'],
    quotes: ['error', 'single', { 'avoidEscape': true }],
    'jsx-quotes': ['error', 'prefer-single'],
    'react/prop-types': [0],
    'semi-style': ['error', 'last'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'no-unused-vars': ['error', { 'args': 'none' }],
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'new-cap': 'error',
    'no-var': 'error'
  }
};
