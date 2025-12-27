import { storageService } from '@/services'
import { create } from 'zustand'

type State = {
  visible: boolean
  strictMode: boolean
  useCreatedDate: boolean
}

export const useConfigStore = create<State>(() => ({
  visible: false,
  strictMode: storageService.getStrictMode(),
  useCreatedDate: storageService.getUseCreatedDate(),
}))

export const updateVisible = (visible: boolean) => useConfigStore.setState(() => ({ visible }))
export const toggleVisible = () => useConfigStore.setState(state => ({ visible: !state.visible }))

export const updateStrictMode = (newVal: boolean) => {
  useConfigStore.setState(() => ({ strictMode: newVal }))
  storageService.setStrictMode(newVal)
}

export const updateUseCreatedDate = (newVal: boolean) => {
  useConfigStore.setState(() => ({ useCreatedDate: newVal }))
  storageService.setUseCreatedDate(newVal)
}
