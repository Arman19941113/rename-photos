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
