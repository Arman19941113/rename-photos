import { nextui } from '@nextui-org/theme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/components/(button|input|ripple|spinner).js',
  ],
  theme: {
    extend: {},
  },
  plugins: [nextui()],
}
