// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { storageService } from '@/services/storage'
import { useInputFormat } from './useInputFormat'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

it('loads saved history and persists a deduplicated five-entry history after renaming', () => {
  storageService.setFormatOptions(['one', 'two', 'three', 'four', 'five'])
  const { result, unmount } = renderHook(useInputFormat)
  expect(result.current.inputValue).toBe('one')
  expect(result.current.format).toBe('one')
  act(() => result.current.updateLatestFormat('two'))
  expect(storageService.getFormatOptions()).toEqual(['two', 'one', 'three', 'four', 'five'])
  act(() => result.current.updateLatestFormat('six'))
  expect(storageService.getFormatOptions()).toEqual(['six', 'two', 'one', 'three', 'four'])
  unmount()
  const restored = renderHook(useInputFormat)
  expect(restored.result.current.format).toBe('six')
})
