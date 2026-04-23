"use client"

import * as React from "react"

function dispatchLocalStorageEvent() {
  window.dispatchEvent(new Event("local-storage"))
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const onStorage = () => callback()
  window.addEventListener("storage", onStorage)
  window.addEventListener("local-storage", onStorage)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("local-storage", onStorage)
  }
}

export function useLocalStorageString(key: string, defaultValue: string) {
  const getSnapshot = React.useCallback(() => {
    try {
      return localStorage.getItem(key) ?? defaultValue
    } catch {
      return defaultValue
    }
  }, [defaultValue, key])

  const getServerSnapshot = React.useCallback(() => defaultValue, [defaultValue])

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = React.useCallback(
    (next: string) => {
      try {
        if (!next) localStorage.removeItem(key)
        else localStorage.setItem(key, next)
        dispatchLocalStorageEvent()
      } catch {}
    },
    [key]
  )

  return [value, setValue] as const
}

export function useLocalStorageJson<T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T
) {
  const cacheRef = React.useRef<{ raw: string | null; value: T } | null>(null)

  const getSnapshot = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(key)

      if (cacheRef.current && cacheRef.current.raw === raw) {
        return cacheRef.current.value
      }

      if (!raw) {
        cacheRef.current = { raw: null, value: defaultValue }
        return defaultValue
      }

      const parsed: unknown = JSON.parse(raw)
      const value = validate(parsed) ? (parsed as T) : defaultValue
      cacheRef.current = { raw, value }
      return value
    } catch {
      cacheRef.current = { raw: null, value: defaultValue }
      return defaultValue
    }
  }, [defaultValue, key, validate])

  const getServerSnapshot = React.useCallback(() => defaultValue, [defaultValue])
  const value = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = React.useCallback(
    (next: T) => {
      try {
        const raw = JSON.stringify(next)
        localStorage.setItem(key, raw)
        cacheRef.current = { raw, value: next }
        dispatchLocalStorageEvent()
      } catch {}
    },
    [key]
  )

  return [value, setValue] as const
}
