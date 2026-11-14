import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// `eslint-config-next` already registers a jsx-a11y plugin instance. Strip it
// so the strict flat config below can own the registration without clashing.
const nextConfigs = next.map((config) => {
  if (!config.plugins?.['jsx-a11y']) return config;
  const { 'jsx-a11y': _ignored, ...plugins } = config.plugins;
  return { ...config, plugins };
});

export default defineConfig([
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'pipeline/**',
    'public/**',
    'src/components/react-bits/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  ...nextConfigs,
  jsxA11y.flatConfigs.strict,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*', '@/modules/*/*/**'],
              message: 'Import a module through src/modules/<name>/index.ts.',
            },
          ],
        },
      ],
    },
  },
]);
