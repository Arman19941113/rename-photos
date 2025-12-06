import { RiGithubFill } from '@/components/icon'
import CheckForUpdates from '@/components/settings/CheckForUpdates.tsx'
import { getVersion } from '@tauri-apps/api/app'
import { useTranslation } from 'react-i18next'

let appVersion = '0.0.0'
getVersion().then(version => (appVersion = version))

function About() {
  const { t } = useTranslation()
  return (
    <div className="w-[564px]">
      <div className="mt-2 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 flex items-center text-base font-semibold">
          {t('app.name')}
          <a
            href="https://github.com/Arman19941113/rename-photos/releases"
            target="_blank"
            className="mx-2 text-secondary underline"
            rel="noreferrer"
          >
            v{appVersion}
          </a>
          <CheckForUpdates />
        </h2>
        <p>
          <a
            href="https://github.com/Arman19941113/rename-photos"
            target="_blank"
            className="flex items-center text-secondary underline"
            rel="noreferrer"
          >
            <RiGithubFill className="mr-1 text-large" />
            {t('about.freeAndOpen')}
          </a>
        </p>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <p>
          <span>{t('about.ifHelpful')}</span>{' '}
          <a
            href="https://github.com/Arman19941113/rename-photos"
            target="_blank"
            className="text-secondary underline"
            rel="noreferrer"
          >
            {t('about.starProject')}
          </a>
        </p>
      </div>
    </div>
  )
}

export default About
