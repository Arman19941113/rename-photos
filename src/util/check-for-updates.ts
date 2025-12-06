import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { TFunction } from 'i18next'
import { toast } from 'react-toastify'

function downloadAndInstall(update: Update) {
  console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`)
  let downloaded = 0
  let contentLength = 0
  update
    .downloadAndInstall(event => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? 0
          console.log(`started downloading ${event.data.contentLength} bytes`)
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          console.log(`downloaded ${downloaded} from ${contentLength}`)
          break
        case 'Finished':
          console.log('download finished')
          break
      }
    })
    .then(() => {
      console.log('update installed')
      relaunch()
    })
}

export async function checkForUpdates({ t }: { t: TFunction }) {
  const update = await check()
  if (update) {
    downloadAndInstall(update)
    toast.info(
      t('updates.newVersion', { version: update.version }),
      {
        position: 'bottom-right',
        isLoading: true,
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: false,
      },
    )
    return true
  }

  toast.info(t('updates.noUpdates'), {
    position: 'bottom-right',
  })
  return false
}
