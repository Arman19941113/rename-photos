import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rename Photos - 图片重命名工具',
  description: 'Rename Photos 是一个使用 EXIF 数据给图片重命名的跨平台桌面应用。',
  keywords: '照片批量重命名，图片批量重命名，文件批量重命名',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
