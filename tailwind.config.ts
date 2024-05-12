import { nextui } from '@nextui-org/theme'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/components/(button|input|radio|scroll-shadow|table|tabs|popover|ripple|spinner|checkbox|spacer).js',
  ],
  theme: {
    extend: {
      fontSize: {
        s: '13px',
      },
    },
  },
  plugins: [nextui()],
}

export default config
