export const enum TauriCommand {
  GET_FILES_FROM_DIR = 'get_files_from_dir',
  GET_FILES_FROM_PATHS = 'get_files_from_paths',
  RENAME_FILES = 'rename_files',
}

export const enum MetadataStatus {
  SUCCESS = 1, // contains full metadata
  WARNING, // contains partial metadata
  ERROR, // no metadata
}

export const enum Language {
  EN = 'en',
  ZH = 'zh',
}

type DateVar = '{YYYY}' | '{MM}' | '{DD}' | '{hh}' | '{mm}' | '{ss}'
type ExifVar = '{Date}' | '{Make}' | '{Camera}' | '{Lens}' | '{FocalLength}' | '{Aperture}' | '{Shutter}' | '{ISO}'
type CustomVar = '{Current}' | '{current}'
export type FormatVar = ExifVar | DateVar | CustomVar
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
  '{Current}',
  '{current}',
]
