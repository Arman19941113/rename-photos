// Renders download links and resolves the latest GitHub Release assets in the browser.
'use client'

import { useEffect, useState } from 'react'

const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/Arman19941113/rename-photos/releases/latest'
const LATEST_RELEASE_URL = 'https://github.com/Arman19941113/rename-photos/releases/latest'

const downloadTargets = [
  { key: 'macApple', assetSuffix: '_aarch64.dmg' },
  { key: 'macIntel', assetSuffix: '_x64.dmg' },
  { key: 'windows', assetSuffix: '_x64_en-US.msi' },
  { key: 'linux', assetSuffix: '_amd64.deb' },
] as const

type DownloadKey = (typeof downloadTargets)[number]['key']
export type DownloadLabels = Record<DownloadKey, string>

type GithubRelease = {
  html_url?: string
  assets?: GithubReleaseAsset[]
}

type GithubReleaseAsset = {
  name?: string
  browser_download_url?: string
}

type DownloadLinksProps = {
  labels: DownloadLabels
}

export default function DownloadLinks({ labels }: DownloadLinksProps) {
  const [releaseUrl, setReleaseUrl] = useState(LATEST_RELEASE_URL)
  const [downloadUrls, setDownloadUrls] = useState<Partial<Record<DownloadKey, string>>>({})

  useEffect(() => {
    let cancelled = false

    async function loadLatestRelease() {
      try {
        const response = await fetch(LATEST_RELEASE_API_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        })

        if (!response.ok) return

        const release = (await response.json()) as GithubRelease

        if (cancelled) return

        setReleaseUrl(release.html_url ?? LATEST_RELEASE_URL)
        setDownloadUrls(resolveDownloadUrls(release))
      } catch {
        // Keep the fallback link to the latest release page.
      }
    }

    loadLatestRelease()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ul className="ml-4 list-disc pt-3 text-default-600">
      {downloadTargets.map(({ key }) => {
        const downloadUrl = downloadUrls[key]

        return (
          <li key={key} className="py-1 underline">
            <a href={downloadUrl ?? releaseUrl} download={downloadUrl ? true : undefined}>
              {labels[key]}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function resolveDownloadUrls(release: GithubRelease) {
  const urls: Partial<Record<DownloadKey, string>> = {}

  for (const target of downloadTargets) {
    const asset = release.assets?.find(asset => asset.name?.endsWith(target.assetSuffix))

    if (asset?.browser_download_url) {
      urls[target.key] = asset.browser_download_url
    }
  }

  return urls
}
