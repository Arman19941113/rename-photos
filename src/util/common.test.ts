// Unit tests for shared date, size, and path helper functions.
import { describe, expect, it } from 'vitest'
import { formatDate, formatFileSize, getDirFromFilePath, getValidPath } from './common'

describe('formatDate', () => {
  it('formats a valid Date with the default pattern', () => {
    expect(formatDate(new Date(2024, 3, 22, 23, 17, 54))).toBe('2024-04-22 23:17:54')
  })

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('invalid')).toBe('')
  })
})

describe('formatFileSize', () => {
  it('formats zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 Byte')
  })

  it('formats byte, KB, and MB values', () => {
    expect(formatFileSize(999)).toBe('999 bytes')
    expect(formatFileSize(1000)).toBe('1 KB')
    expect(formatFileSize(1_250_000)).toBe('1.3 MB')
  })
})

describe('getDirFromFilePath', () => {
  it('extracts a directory from Unix paths', () => {
    expect(getDirFromFilePath('/a/b/c.jpg')).toBe('/a/b')
  })

  it('extracts a directory from Windows paths', () => {
    expect(getDirFromFilePath('C:\\a\\b\\c.jpg')).toBe('C:\\a\\b')
  })

  it('returns an empty string when a path has no directory', () => {
    expect(getDirFromFilePath('c.jpg')).toBe('')
  })
})

describe('getValidPath', () => {
  it('removes filename-forbidden characters', () => {
    expect(getValidPath('a:b/c*d?e"f<g>h|i')).toBe('abcdefghi')
  })
})
