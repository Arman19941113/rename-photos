// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TauriCommand } from '@/const'
import type { IPCFile } from '@/types/file'
import { corpus } from '../../tests/support/media-corpus'
import { useFileOperations } from './useFiles'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  handleError: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  config: { strictMode: false, useCreatedDate: false },
  t: (key: string) => key,
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: mocks.open }))
vi.mock('./useError', () => ({ useError: () => ({ handleError: mocks.handleError }) }))
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, info: mocks.info } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }))
vi.mock('@/store/useConfigStore.ts', () => ({
  useConfigStore: (selector: (state: typeof mocks.config) => unknown) => selector(mocks.config),
}))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.config.strictMode = false
  mocks.config.useCreatedDate = false
  mocks.invoke.mockResolvedValue([])
  mocks.open.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useFileOperations', () => {
  it('loads a picked folder through the directory command', async () => {
    const file = mediaFile()
    mocks.open.mockResolvedValue('/photos')
    mocks.invoke.mockResolvedValue([file])
    const { result } = mount()

    await act(async () => result.current.handleOpenFolder())

    expect(mocks.open).toHaveBeenCalledWith({ multiple: false, directory: true, recursive: false })
    expect(mocks.invoke).toHaveBeenCalledWith(TauriCommand.GET_FILES_FROM_DIR, { dirPath: '/photos' })
    expect(result.current.files[0].pathname).toBe(file.pathname)
  })

  it('does not read files when the picker is cancelled', async () => {
    const { result } = mount()
    await act(async () => result.current.handleOpenFolder())
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.handleError).not.toHaveBeenCalled()
  })

  it.each([
    ['picker', 'errors.openFolder'],
    ['directory', 'errors.readFolder'],
  ])('reports %s failures', async (stage, title) => {
    const error = new Error('Cannot open folder')
    if (stage === 'picker') mocks.open.mockRejectedValue(error)
    else {
      mocks.open.mockResolvedValue('/photos')
      mocks.invoke.mockRejectedValue(error)
    }
    const { result } = mount()
    await act(async () => result.current.handleOpenFolder())
    expect(mocks.handleError).toHaveBeenCalledWith({ err: error, title })
    expect(result.current.files).toEqual([])
  })

  it('keeps the previous files if loading dropped paths fails', async () => {
    const { result } = mount()
    const file = mediaFile()
    await load(result, [file])
    const error = new Error('Missing file')
    mocks.invoke.mockRejectedValueOnce(error)

    await act(async () => result.current.handleDropFiles(['/missing.jpg']))

    expect(mocks.invoke).toHaveBeenLastCalledWith(TauriCommand.GET_FILES_FROM_PATHS, { paths: ['/missing.jpg'] })
    expect(mocks.handleError).toHaveBeenCalledWith({ err: error, title: 'errors.readFiles' })
    expect(result.current.files[0].pathname).toBe(file.pathname)
  })

  it('renames only eligible files, refreshes both sets, and preserves selection', async () => {
    mocks.config.strictMode = true
    vi.spyOn(Date, 'now').mockReturnValue(1715000000000)
    const { result, onRenamed } = mount(corpus.format)
    const file = mediaFile()
    const skipped: IPCFile = {
      fileType: 'other',
      filename: 'notes.txt',
      pathname: '/photos/notes.txt',
      created: 0,
      size: 5,
    }
    await load(result, [file, skipped])
    act(() => result.current.setSelectedKey(file.pathname))
    const target = result.current.files.find(item => item.pathname === file.pathname)!.newFilename
    const renamed = { ...file, pathname: `/photos/${target}`, filename: target }
    const pending = deferred<string[]>()
    mocks.invoke.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([skipped, renamed])

    act(() => result.current.handleClickRename())

    expect(result.current.isRenaming).toBe(true)
    expect(mocks.invoke).toHaveBeenLastCalledWith(TauriCommand.RENAME_FILES, {
      renamePathData: [{ oldPath: file.pathname, newFilename: target, tempFilename: `1715000000000_${file.filename}` }],
    })
    await act(async () => pending.resolve([renamed.pathname]))
    expect(mocks.invoke).toHaveBeenLastCalledWith(TauriCommand.GET_FILES_FROM_PATHS, {
      paths: [skipped.pathname, renamed.pathname],
    })
    expect(result.current.files.map(file => file.pathname)).toEqual(
      expect.arrayContaining([skipped.pathname, renamed.pathname]),
    )
    expect(result.current.selectedFile?.pathname).toBe(renamed.pathname)
    expect(result.current.isRenaming).toBe(false)
    expect(onRenamed).toHaveBeenCalledOnce()
    expect(mocks.success).toHaveBeenCalledWith('notifications.renameSuccess')
  })

  it('does not send a rename request when every file keeps its name', async () => {
    const { result, onRenamed } = mount('{Current}')
    await load(result, [mediaFile()])
    mocks.invoke.mockClear()
    act(() => result.current.handleClickRename())
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.info).toHaveBeenCalledWith('notifications.noRename')
    expect(onRenamed).not.toHaveBeenCalled()
  })

  it('reports rename failure, retains files and selection, and allows retry', async () => {
    const { result, onRenamed } = mount()
    const file = mediaFile()
    await load(result, [file])
    act(() => result.current.setSelectedKey(file.pathname))
    const error = new Error('Target already exists')
    mocks.invoke.mockRejectedValueOnce(error)

    await act(async () => result.current.handleClickRename())

    expect(mocks.handleError).toHaveBeenCalledWith({ err: error, title: 'errors.renameFiles' })
    expect(result.current.isRenaming).toBe(false)
    expect(result.current.selectedFile?.pathname).toBe(file.pathname)
    expect(result.current.files[0].pathname).toBe(file.pathname)
    expect(onRenamed).not.toHaveBeenCalled()
    expect(mocks.success).not.toHaveBeenCalled()
    mocks.invoke.mockResolvedValueOnce(['/photos/renamed.HEIC']).mockResolvedValueOnce([])
    await act(async () => result.current.handleClickRename())
    expect(onRenamed).toHaveBeenCalledOnce()
  })

  it('ignores repeated rename requests even before React commits the loading state', async () => {
    const { result } = mount()
    await load(result, [mediaFile()])
    const pending = deferred<string[]>()
    mocks.invoke.mockReturnValue(pending.promise)
    mocks.invoke.mockClear()

    act(() => {
      result.current.handleClickRename()
      result.current.handleClickRename()
    })
    expect(mocks.invoke).toHaveBeenCalledOnce()
    act(() => result.current.handleClickRename())
    expect(mocks.invoke).toHaveBeenCalledOnce()
    mocks.invoke.mockResolvedValue([])
    await act(async () => pending.resolve(['/photos/renamed.HEIC']))
    await waitFor(() => expect(result.current.isRenaming).toBe(false))
  })

  it('reports a refresh error separately after a successful rename', async () => {
    const { result, onRenamed } = mount()
    await load(result, [mediaFile()])
    const error = new Error('Reload failed')
    mocks.invoke.mockResolvedValueOnce(['/photos/renamed.HEIC']).mockRejectedValueOnce(error)
    await act(async () => result.current.handleClickRename())
    expect(mocks.handleError).toHaveBeenCalledWith({ err: error, title: 'errors.readFiles' })
    expect(onRenamed).toHaveBeenCalledOnce()
    expect(result.current.isRenaming).toBe(false)
  })
})

function mount(format = 'renamed') {
  const onRenamed = vi.fn()
  return { ...renderHook(() => useFileOperations({ format, onRenamed })), onRenamed }
}

function mediaFile(): IPCFile {
  const { input } = corpus.files[0]
  return { ...input, pathname: `/photos/${input.filename}` }
}

async function load(result: { current: ReturnType<typeof useFileOperations> }, files: IPCFile[]) {
  mocks.invoke.mockResolvedValueOnce(files)
  await act(async () => result.current.handleDropFiles(files.map(file => file.pathname)))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}
