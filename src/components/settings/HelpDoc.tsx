import { formatVars } from '@/const'
import { Snippet } from '@nextui-org/snippet'
import { useTranslation } from 'react-i18next'

function HelpDoc() {
  const { t } = useTranslation()

  return (
    <div className="w-[564px]">
      <div className="mt-2 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 text-base font-semibold">{t('1. Select a folder or drag and drop files')}</h2>
        <p>{t('Selected files will be displayed in the table.')}</p>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="mb-2 text-base font-semibold">{t('2. Enter the rename rule')}</h2>
        <p>{t('The variables listed below are supported, and you can preview the expected new name in the table.')}</p>
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
              >
                {item}
              </Snippet>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-md border bg-default-100 px-4 py-3">
        <h2 className="text-base font-semibold">{t('3. Click `Rename` button to change names')}</h2>
      </div>
    </div>
  )
}

export default HelpDoc
