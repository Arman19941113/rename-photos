export function getLocalStorage<T = unknown>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    return JSON.parse(value)
  } catch (error) {
    console.error(error)
    return null
  }
}

export function setLocalStorage(key: string, value: unknown): void {
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

export function getSessionStorage<T = unknown>(key: string): T | null {
  try {
    const value = sessionStorage.getItem(key)
    if (!value) return null
    return JSON.parse(value)
  } catch (error) {
    console.error(error)
    return null
  }
}

export function setSessionStorage(key: string, value: unknown): void {
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
