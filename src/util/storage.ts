export function getLocalStorage(key: string): any {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    return JSON.parse(value)
  } catch (error) {
    console.error(error)
    return null
  }
}

export function setLocalStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(error)
  }
}

export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(error)
  }
}

export function getSessionStorage(key: string): any {
  try {
    const value = sessionStorage.getItem(key)
    if (!value) return null
    return JSON.parse(value)
  } catch (error) {
    console.error(error)
    return null
  }
}

export function setSessionStorage(key: string, value: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(error)
  }
}

export function removeSessionStorage(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    console.error(error)
  }
}
