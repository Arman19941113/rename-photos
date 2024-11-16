/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/rename-photos',
  output: 'export',
  images: {
    loaderFile: './src/assets/loader.ts',
  },
}

export default nextConfig
