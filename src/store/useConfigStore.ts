import { StorageKey } from '@/const'
import { create } from 'zustand'

type State = {
  visible: boolean
  mode: {
    exif: boolean
  }
  useCreatedDate: boolean
}

export const useConfigStore = create<State>(() => ({
  visible: false,
  mode: {
    exif: !!localStorage.getItem(StorageKey.MODE_EXIF),
  },
  useCreatedDate: !!localStorage.getItem(StorageKey.MODE_USE_CREATED_DATE),
}))

export const updateVisible = (visible: boolean) => useConfigStore.setState(() => ({ visible }))
export const toggleVisible = () => useConfigStore.setState(state => ({ visible: !state.visible }))

export const updateExifMode = (newVal: boolean) => {
  useConfigStore.setState(state => ({
    mode: {
      ...state.mode,
      exif: newVal,
    },
  }))
  if (newVal) {
    localStorage.setItem(StorageKey.MODE_EXIF, '1')
  } else {
    localStorage.removeItem(StorageKey.MODE_EXIF)
  }
}

export const updateUseCreatedDate = (newVal: boolean) => {
  useConfigStore.setState(() => ({ useCreatedDate: newVal }))
  if (newVal) {
    localStorage.setItem(StorageKey.MODE_USE_CREATED_DATE, '1')
  } else {
    localStorage.removeItem(StorageKey.MODE_USE_CREATED_DATE)
  }
}
