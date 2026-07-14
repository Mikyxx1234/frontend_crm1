import { useCallback, useEffect, useState } from "react"

export type AsideViewMode = "focus" | "compact"

const STORAGE_KEY = "crm:aside-view-mode"

export function useAsideViewMode(): [AsideViewMode, (m: AsideViewMode) => void] {
  const [mode, setModeState] = useState<AsideViewMode>(() => {
    if (typeof window === "undefined") return "focus"
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "compact" ? "compact" : "focus"
  })

  const setMode = useCallback((m: AsideViewMode) => {
    setModeState(m)
    try { window.localStorage.setItem(STORAGE_KEY, m) } catch { /* ignore */ }
  }, [])

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setModeState(e.newValue === "compact" ? "compact" : "focus")
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return [mode, setMode]
}
