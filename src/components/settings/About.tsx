import { RiGithubFill } from '@/components/icon'
import SponsorModal from '@/components/settings/SponsorModal.tsx'
import { getVersion } from '@tauri-apps/api/app'
import { useTranslation } from 'react-i18next'

let appVersion = '0.0.0'
getVersion().then(version => (appVersion = version))

function About() {
  const { t } = useTranslation()
  return (
    <div className="w-[490px]">
      <div className="mt-2 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 text-base font-semibold	">
          {t('Rename Photos')}
          <a
            href="https://github.com/Arman19941113/name-photos/releases"
            target="_blank"
            className="ml-1 text-secondary underline"
            rel="noreferrer"
          >
            {appVersion}
          </a>
        </h2>
        <p>
          <a
            href="https://github.com/Arman19941113/name-photos"
            target="_blank"
            className="flex items-center text-secondary underline"
            rel="noreferrer"
          >
            <RiGithubFill className="mr-1 text-large" />
            {t('This software is completely free and open source on Github.')}
          </a>
        </p>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <p>
          <span>{t('If you find this tool helpful, you can')}</span>
          <SponsorModal />
        </p>
      </div>
    </div>
  )
}

export default About
