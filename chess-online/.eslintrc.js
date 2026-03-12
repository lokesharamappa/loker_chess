/**
 * @fileoverview ESLint configuration for Chess Online
 * @author Chess Master Pro Team
 * @version 1.0.0
 */

module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  
  extends: [
    'airbnb-base',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  
  rules: {
    // General code quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code style
    'indent': ['error', 2],
    'max-len': ['error', { code: 120, ignoreUrls: true }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'es5'],
    
    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
      },
    ],
    
    // Function rules
    'func-names': 'off',
    'prefer-arrow-callback': 'error',
    'arrow-parens': ['error', 'as-needed'],
    
    // Object rules
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    
    // Async/await
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'off',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Performance
    'no-loop-func': 'error',
    'no-inner-declarations': 'error',
    
    // Testing
    'jest/expect-expect': 'off',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    
    // Documentation
    'jsdoc/require-jsdoc': 'off',
    'jsdoc/require-description': 'off',
    'jsdoc/require-param-description': 'off',
    'jsdoc/require-returns-description': 'off',
  },
  
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
    
    {
      files: ['public/**/*.js'],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        'no-console': 'off',
        'no-alert': 'warn',
      },
    },
    
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.json'],
      },
    },
  },
  
  globals: {
    // Node.js globals
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    global: 'readonly',
    
    // Performance API
    performance: 'readonly',
    
    // Test globals
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
  },
};
