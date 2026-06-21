'use client'

import duplicatesZh from '@/assets/images/duplicates-zh.png'
import homeZh from '@/assets/images/home-zh.png'
import lackExifZh from '@/assets/images/lack-exif-zh.png'
import successZh from '@/assets/images/success-zh.png'
import DownloadLinks, { type DownloadLabels } from '@/components/download-links'
import { IconLanguage, RiFolderOpenLine, RiSettings4Line } from '@/components/icon'
import MacShot from '@/components/mac-shot'
import { useFullPage } from '@/hooks'
import { Button } from '@nextui-org/button'
import { Snippet } from '@nextui-org/snippet'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const images = [homeZh, homeZh, successZh, duplicatesZh, lackExifZh]

const downloadLabels = {
  macApple: 'macOS (Apple Silicon)',
  macIntel: 'macOS (Intel)',
  windows: 'Windows',
  linux: 'Linux',
} satisfies DownloadLabels

export default function NamePhotos() {
  const { page, setPage } = useFullPage({ maxPage: 5 })
  const currentImage = images[page]

  return (
    <div className="min-w-[1280px] px-6">
      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between bg-[#fff8] px-6 backdrop-blur backdrop-saturate-50 xl:px-10">
        <div className="cursor-pointer text-lg font-bold" onClick={() => setPage(0)}>
          Rename Photos
        </div>
        <div className="flex items-center">
          <span
            className="cursor-pointer text-base font-semibold text-default-600 transition-transform hover:scale-110"
            onClick={() => setPage(5)}
          >
            下载安装
          </span>
          <Link
            href="https://github.com/Arman19941113/rename-photos"
            className="ml-6 cursor-pointer text-base font-semibold text-default-600 transition-transform hover:scale-110"
          >
            前往 GitHub
          </Link>
          <div className="ml-6 h-5 w-[1px] bg-default-300" />
          <Link
            href="/"
            className="flex-center ml-6 cursor-pointer text-base font-semibold text-default-600 transition-transform hover:scale-110"
          >
            EN
            <IconLanguage className="relative top-[0.5px] ml-0.5 text-large" />
          </Link>
        </div>
      </header>

      {/* Page0 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">第一步：选择需要重命名的文件</h1>
          <ul className="list-disc pl-5 pt-3 text-default-600">
            <li className="py-1">
              点击
              <Button
                radius="sm"
                size="sm"
                className="btn--grad-blue ml-2"
                startContent={<RiFolderOpenLine className="text-base" />}
              >
                打开文件夹
              </Button>
            </li>
            <li className="py-1">将文件拖入窗口中</li>
          </ul>
        </div>
      </div>

      {/* Page1 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">第二步：确认新文件名</h1>
          <ul className="list-decimal pl-5 pt-3 text-default-600">
            <li className="py-1">在输入框中输入命名格式</li>
            <li className="py-1">在表格中实时预览新文件名</li>
          </ul>
        </div>
      </div>

      {/* Page2 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">第三步：执行重命名操作</h1>
          <ul className="list-disc pl-5 pt-3 text-default-600">
            <li className="py-1">
              点击
              <Button radius="sm" size="sm" className="btn--grad-pink ml-2">
                重命名
                <span>🚀</span>
              </Button>
            </li>
          </ul>

          <h2 className="mt-8 text-lg font-medium">💡 打开设置查看重命名规则</h2>
          <ul className="list-disc pl-5 pt-1 text-default-600">
            <li className="py-1">
              点击左下角的
              <motion.button
                className="relative top-[2px] mx-2 text-lg text-default-600 outline-none"
                whileHover={{ scale: 1.6, rotate: 90 }}
                whileTap={{ scale: 1.2, rotate: 180 }}
              >
                <RiSettings4Line />
              </motion.button>
              图标
            </li>
            <li className="py-1">
              使用快捷键
              <span className="ml-2 rounded bg-neutral-200 p-1 font-mono text-sm font-semibold">Ctrl/Command + ,</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Page3 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Q&A：多个文件元数据相同</h1>
          <ul className="list-disc pl-5 pt-3 text-default-600">
            <li className="py-1">如果多个文件含有相同的元数据，软件将自动生成序列号以避免命名冲突。</li>
          </ul>
        </div>
      </div>

      {/* Page4 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Q&A：缺少元数据</h1>
          <ul className="list-disc pl-5 pt-3 text-default-600">
            <li className="py-1">如果文件缺少元数据，将使用占位符补足。</li>
            <li className="py-1">如果在设置中开启严格模式，会忽略元数据缺失的文件。</li>
          </ul>
        </div>
      </div>

      {/* Page5 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">下载安装</h1>
          <DownloadLinks labels={downloadLabels} />
        </div>
      </div>

      <div className="fixed inset-y-0 left-[426px] flex w-[853px] max-w-[1000px] items-center xl:left-1/3 xl:w-2/3">
        <MacShot>
          {page === 5 ? (
            <div className="ml-5">
              <h2 className="mt-12 text-lg font-medium">macOS：提示“Rename Photos 已损坏，无法打开”</h2>
              <p className="my-3">
                Rename Photos 目前没有经过 Apple 公证。如果你确认应用来自官方 GitHub Releases 页面，并且信任该来源，可以通过以下命令移除隔离标记：
              </p>
              <Snippet className="pointer-events-auto mb-24" color="secondary">
                sudo xattr -dr com.apple.quarantine &quot;/Applications/Rename Photos.app&quot;
              </Snippet>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Image
                src={currentImage}
                alt=""
                className={clsx('w-full origin-top transition-transform', page === 1 && 'scale-[1.7]')}
                priority
                unoptimized
              />
            </div>
          )}
        </MacShot>
      </div>
    </div>
  )
}
