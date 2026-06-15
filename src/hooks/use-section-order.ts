"use client"

import { useCallback, useState } from "react"

/**
 * Persiste a ordem de seções de um painel em localStorage.
 * Garante que novas seções adicionadas ao `defaultOrder` sejam incluídas
 * mesmo que o usuário já tenha um layout salvo.
 */
export function useSectionOrder<T extends string>(
  storageKey: string,
  defaultOrder: T[],
): [T[], (fromIndex: number, toIndex: number) => void] {
  const [order, setOrder] = useState<T[]>(() => {
    if (typeof window === "undefined") return defaultOrder
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return defaultOrder
      const parsed: T[] = JSON.parse(raw)
      // Mantém itens salvos e adiciona qualquer nova seção ao final
      const savedSet = new Set(parsed)
      const merged = [
        ...parsed.filter((id) => (defaultOrder as string[]).includes(id)),
        ...defaultOrder.filter((id) => !savedSet.has(id)),
      ] as T[]
      return merged
    } catch {
      return defaultOrder
    }
  })

  const reorder = useCallback(
    (from: number, to: number) => {
      setOrder((prev) => {
        const next = [...prev]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // silencioso
        }
        return next
      })
    },
    [storageKey],
  )

  return [order, reorder]
}
