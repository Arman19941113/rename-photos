import postcssPresetEnv from 'postcss-preset-env'
import tailwindcss from 'tailwindcss'

export default {
  plugins: [
    tailwindcss,
    postcssPresetEnv(),
  ],
}
