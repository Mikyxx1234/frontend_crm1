"use client"

import { createContext, useContext } from "react"
import type { LogsTarget } from "./logs-modal"

type LogsContextValue = {
  openLogs: (target: LogsTarget) => void
}

export const LogsContext = createContext<LogsContextValue | null>(null)

export function useLogs() {
  return useContext(LogsContext)
}
