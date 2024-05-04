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

export function getDirPath(filePath: string) {
  const pathParts = filePath.split('/')
  return pathParts.slice(0, -1).join('/')
}
