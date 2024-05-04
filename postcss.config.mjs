import tailwindcss from 'tailwindcss'
import postcssPresetEnv from 'postcss-preset-env'

export default {
  plugins: [
    tailwindcss,
    postcssPresetEnv({
      stage: 0,
    }),
  ],
}
