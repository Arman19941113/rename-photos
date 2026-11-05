// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { Language } from '@/const'
import { storageService } from './storage'

beforeEach(() => localStorage.clear())

it('retains settings and storage keys when the Zustand store is recreated', async () => {
  const store = await import('../store/useConfigStore')
  store.updateStrictMode(true)
  store.updateUseCreatedDate(true)
  store.updateVisible(true)
  storageService.setLanguage(Language.ZH)
  expect(JSON.parse(localStorage.getItem('STRICT_MODE')!)).toBe(true)
  expect(JSON.parse(localStorage.getItem('USE_CREATED_DATE')!)).toBe(true)
  expect(JSON.parse(localStorage.getItem('LANGUAGE')!)).toBe('zh')
  vi.resetModules()
  const restored = await import('../store/useConfigStore')
  expect(restored.useConfigStore.getState()).toEqual({ visible: false, strictMode: true, useCreatedDate: true })
  expect(storageService.getLanguage()).toBe(Language.ZH)
})
