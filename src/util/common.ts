export function formatDate(val: Date | string | number, fmt = 'YYYY-mm-dd HH:MM:SS'): string {
  const date = val instanceof Date ? val : new Date(val)

  if (isNaN(date.getTime())) {
    return ''
  }

  const opt: Record<string, string> = {
    'Y+': date.getFullYear().toString(),
    'm+': (date.getMonth() + 1).toString(),
    'd+': date.getDate().toString(),
    'H+': date.getHours().toString(),
    'M+': date.getMinutes().toString(),
    'S+': date.getSeconds().toString(),
    's+': date.getMilliseconds().toString(),
  }
  for (const k in opt) {
    const ret = new RegExp('(' + k + ')').exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], ret[1].length === 1 ? opt[k] : opt[k].padStart(ret[1].length, '0'))
    }
  }
  return fmt
}

export function formatFileSize(bytes: number, decimalPlaces = 1): string {
  if (!bytes) {
    return '0 Byte'
  }

  const base = 1000
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB']
  const maxLogarithm = units.length - 1
  let logarithm = Math.floor(Math.log(bytes) / Math.log(base))
  if (logarithm > maxLogarithm) {
    logarithm = maxLogarithm
  }

  const value = parseFloat((bytes / Math.pow(base, logarithm)).toFixed(decimalPlaces))
  const unit = units[logarithm]
  return `${value} ${unit}`
}

export function getDirFromFilePath(filePath: string) {
  const pathParts = filePath.split('/')
  return pathParts.slice(0, -1).join('/')
}

// filter the symbols are not allowed in the filename
export function getValidPath(path: string): string {
  if (!path) return ''
  return path.replace(/[\\/:*?<>|]/g, ' ')
}
