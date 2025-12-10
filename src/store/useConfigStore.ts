import { storageService } from '@/services'
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
    exif: storageService.getExifMode(),
  },
  useCreatedDate: storageService.getUseCreatedDate(),
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
  storageService.setExifMode(newVal)
}

export const updateUseCreatedDate = (newVal: boolean) => {
  useConfigStore.setState(() => ({ useCreatedDate: newVal }))
  storageService.setUseCreatedDate(newVal)
}
