export default {
  $schema: 'https://json.schemastore.org/prettierrc',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles.css',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  htmlWhitespaceSensitivity: 'css',
  overrides: [
    {
      files: ['web/**/*.{ts,tsx,css}'],
      options: { tailwindStylesheet: './web/src/app/globals.css' },
    },
    {
      files: ['**/*.css'],
      options: {
        singleQuote: false,
      },
    },
  ],
}
