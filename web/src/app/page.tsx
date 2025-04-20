'use client'

import duplicatesEn from '@/assets/images/duplicates-en.png'
import homeEn from '@/assets/images/home-en.png'
import lackExifEn from '@/assets/images/lack-exif-en.png'
import successEn from '@/assets/images/success-en.png'
import { IconLanguage, RiFolderOpenLine, RiSettings4Line } from '@/components/icon'
import MacShot from '@/components/mac-shot'
import { useFullPage } from '@/hooks'
import { Button } from '@nextui-org/button'
import { Snippet } from '@nextui-org/snippet'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const images = [homeEn, homeEn, successEn, duplicatesEn, lackExifEn]

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
            Download
          </span>
          <Link
            href="https://github.com/Arman19941113/rename-photos"
            className="ml-6 cursor-pointer text-base font-semibold text-default-600 transition-transform hover:scale-110"
          >
            View on Github
          </Link>
          <div className="ml-6 h-5 w-[1px] bg-default-300" />
          <Link
            href="/zh"
            className="flex-center ml-6 cursor-pointer text-base font-semibold text-default-600 transition-transform hover:scale-110"
          >
            中
            <IconLanguage className="relative top-[0.5px] ml-0.5 text-large" />
          </Link>
        </div>
      </header>

      {/* Page0 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Step1: Choose files to rename</h1>
          <ul className="list-disc pl-5 pt-3 text-default-600">
            <li className="py-1">
              Click
              <Button
                radius="sm"
                size="sm"
                className="btn--grad-blue ml-2"
                startContent={<RiFolderOpenLine className="text-base" />}
              >
                Open Folder
              </Button>
            </li>
            <li className="py-1">Drag and drop files into the window</li>
          </ul>
        </div>
      </div>

      {/* Page1 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Step2: Confirm the new names</h1>
          <ul className="list-decimal pl-5 pt-3 text-default-600">
            <li className="py-1">Enter the format in the Input Box</li>
            <li className="py-1">Preview the new names in the Table</li>
          </ul>
        </div>
      </div>

      {/* Page2 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Step3: Perform Rename</h1>
          <ul className="pt-3 text-default-600">
            <li className="py-1">
              Click
              <Button radius="sm" size="sm" className="btn--grad-pink ml-2">
                Rename Photos
                <span>🚀</span>
              </Button>
            </li>
          </ul>

          <h2 className="mt-8 text-lg font-medium">💡 Open settings to view the rename rules</h2>
          <ul className="list-disc pl-5 pt-1 text-default-600">
            <li className="py-1">
              Click
              <motion.button
                className="relative top-[2px] mx-2 text-lg text-default-600 outline-none"
                whileHover={{ scale: 1.6, rotate: 90 }}
                whileTap={{ scale: 1.2, rotate: 180 }}
              >
                <RiSettings4Line />
              </motion.button>
              in the bottom left corner
            </li>
            <li className="py-1">
              Use the shortcuts of
              <span className="ml-2 rounded bg-neutral-200 p-1 font-mono text-sm font-semibold">Ctrl/Command + ,</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Page3 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Q&A: Have same EXIF data</h1>
          <ul className="pt-3 text-default-600">
            <li className="py-1">
              If some photos share the same EXIF data, we will automatically generate serial numbers to avoid naming
              conflicts.
            </li>
          </ul>
        </div>
      </div>

      {/* Page4 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Q&A: Lack EXIF data</h1>
          <ul className="pt-3 text-default-600">
            <li className="py-1">
              If some files lack EXIF data, we will use the created time as Date, And other fields will be replaced with
              placeholder. So you can rename any file, even if it&apos;s not an image file.
            </li>
            <li className="py-1">
              If you enable the EXIF mode in the settings, files without EXIF data will be ignored.
            </li>
          </ul>
        </div>
      </div>

      {/* Page5 */}
      <div className="flex h-[100vh] w-1/3 items-center justify-end pb-24 pr-6 pt-16">
        <div className="w-96">
          <h1 className="text-2xl font-bold">Download</h1>
          <ul className="ml-4 list-disc pt-3 text-default-600">
            <li className="py-1 underline">
              <a
                href="https://github.com/Arman19941113/rename-photos/releases/download/v0.1.1/Rename.Photos_0.1.1_aarch64.dmg"
                download
              >
                MacOs (Apple silicon)
              </a>
            </li>
            <li className="py-1 underline">
              <a
                href="https://github.com/Arman19941113/rename-photos/releases/download/v0.1.1/Rename.Photos_0.1.1_x64.dmg"
                download
              >
                MacOs (Intel silicon)
              </a>
            </li>
            <li className="py-1 underline">
              <a
                href="https://github.com/Arman19941113/rename-photos/releases/download/v0.1.1/Rename.Photos_0.1.1_x64_en-US.msi"
                download
              >
                Windows
              </a>
            </li>
            <li className="py-1 underline">
              <a
                href="https://github.com/Arman19941113/rename-photos/releases/download/v0.1.1/Rename.Photos_0.1.1_amd64.deb"
                download
              >
                Linux
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="fixed inset-y-0 left-[426px] flex w-[853px] max-w-[1000px] items-center xl:left-1/3 xl:w-2/3">
        <MacShot>
          {page === 5 ? (
            <div className="ml-5">
              <h2 className="mt-12 text-lg font-medium">MacOS: App is damaged and can&apos;t be opened</h2>
              <p className="my-3">Open Terminal and then enter the following command:</p>
              <Snippet className="mb-24" color="secondary">
                sudo xattr -d -r com.apple.quarantine /Applications/Rename\ Photos.app
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
