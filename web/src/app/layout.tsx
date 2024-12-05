import './globals.css'
import { Analytics } from '@vercel/analytics/react'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rename Photos - 图片重命名工具',
  description: 'Rename Photos is a cross-platform desktop-app for renaming photos using EXIF data.',
  keywords: 'Batch rename photos, Batch rename images, Batch rename files',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
