import { StorageKey } from '@/const'
import { create } from 'zustand'

type State = {
  visible: boolean
  mode: {
    exif: boolean
  }
}

export const useConfigStore = create<State>(() => ({
  visible: false,
  mode: {
    exif: !!localStorage.getItem(StorageKey.MODE_EXIF),
  },
}))

export const updateVisible = (visible: boolean) => useConfigStore.setState(() => ({ visible }))
export const toggleVisible = () => useConfigStore.setState(state => ({ visible: !state.visible }))

export const updateExifMode = (exifMode: boolean) => {
  useConfigStore.setState(state => ({
    mode: {
      ...state.mode,
      exif: exifMode,
    },
  }))
  exifMode ? localStorage.setItem(StorageKey.MODE_EXIF, '1') : localStorage.removeItem(StorageKey.MODE_EXIF)
}
