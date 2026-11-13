import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'pipeline/**',
    'public/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  ...next,
  {
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
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
