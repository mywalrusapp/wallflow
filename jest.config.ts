/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  preset: 'ts-jest',
  clearMocks: true,
  coverageProvider: 'v8',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
};
