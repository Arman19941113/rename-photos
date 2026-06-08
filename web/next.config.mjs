/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true'
const githubPagesPath = '/rename-photos'

const nextConfig = {
  output: 'export',
  basePath: isGithubPages ? githubPagesPath : '',
  assetPrefix: isGithubPages ? githubPagesPath : '',
  images: {
    loaderFile: './src/assets/loader.ts',
  },
}

export default nextConfig
