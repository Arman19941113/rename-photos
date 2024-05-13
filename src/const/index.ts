export const enum TauriCommand {
  GET_FILES_FROM_DIR = 'get_files_from_dir',
  GET_FILES_FROM_PATHS = 'get_files_from_paths',
  RENAME_FILES = 'rename_files',
}

export const enum ExifStatus {
  SUCCESS = 1,
  WARNING,
  ERROR,
}

export const enum StorageKey {
  LANGUAGE = 'LANGUAGE',
  FORMAT = 'FORMAT',
}

export const enum Language {
  EN = 'EN',
  ZH = 'ZH',
}

type DateVar = '{YYYY}' | '{MM}' | '{DD}' | '{hh}' | '{mm}' | '{ss}'
type ExifVar = '{Date}' | '{Make}' | '{Camera}' | '{Lens}' | '{FocalLength}' | '{Aperture}' | '{Shutter}' | '{ISO}'
export type FormatVar = ExifVar | DateVar
export const formatVars: FormatVar[] = [
  '{YYYY}',
  '{MM}',
  '{DD}',
  '{hh}',
  '{mm}',
  '{ss}',
  '{Date}',
  '{Make}',
  '{Camera}',
  '{Lens}',
  '{FocalLength}',
  '{Aperture}',
  '{Shutter}',
  '{ISO}',
]

export function getInitialFormat() {
  const defaultVal = '{Make} {YYYY}.{MM}.{DD} {hh}.{mm}.{ss}'
  return localStorage.getItem(StorageKey.FORMAT) || defaultVal
}
