export const enum TauriCommand {
  GET_FILES_FROM_DIR = 'get_files_from_dir',
  GET_FILES_FROM_PATHS = 'get_files_from_paths',
}

export const enum ExifStatus {
  SUCCESS = 1,
  WARNING,
  ERROR,
}

export const enum StorageKey {
  FORMAT = 'FORMAT',
}

export function getInitialFormat() {
  const defaultVal = '{Make}_{YYYY}-{MM}-{DD}_{hh}.{mm}.{ss}'
  return localStorage.getItem(StorageKey.FORMAT) || defaultVal
}
