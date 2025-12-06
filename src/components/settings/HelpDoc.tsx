import { formatVars } from '@/const'
import { Snippet } from '@nextui-org/snippet'
import { useTranslation } from 'react-i18next'

function HelpDoc({ toggleVisible }: { toggleVisible: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="w-[564px]">
      <div className="mt-2 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 text-base font-semibold">{t('helpDoc.step1Title')}</h2>
        <p>{t('helpDoc.step1Desc')}</p>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 text-base font-semibold">{t('helpDoc.step2Title')}</h2>
        <p>{t('helpDoc.step2Desc')}</p>
        <ul className="flex flex-wrap">
          {formatVars.map(item => (
            <li className="mr-2 mt-2" key={item}>
              <Snippet
                hideSymbol
                disableTooltip
                size="sm"
                radius="sm"
                color="secondary"
                classNames={{ base: 'gap-0 pl-2.5', copyButton: 'ml-0 text-sm' }}
                onCopy={toggleVisible}
              >
                {item}
              </Snippet>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="text-base font-semibold">{t('helpDoc.step3Title')}</h2>
      </div>
    </div>
  )
}

export default HelpDoc
