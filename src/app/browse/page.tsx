"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { tournaments } from "@/data/tournaments"
import { TournamentCard } from "@/components/TournamentCard"
import { FilterPanel, defaultFilters, type Filters } from "@/components/FilterPanel"
import { addToPlan, removeFromPlan, getPlan } from "@/lib/storage"
import { useT } from "@/lib/i18n"
import type { PlanEntry } from "@/types"

export default function BrowsePage() {
  const { t, formatDate } = useT()
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [plan, setPlan] = useState<PlanEntry[]>([])

  useEffect(() => {
    setPlan(getPlan())
  }, [])
  const planIds = useMemo(() => new Set(plan.map((p) => p.tournament_id)), [plan])

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (t.date < filters.dateStart || t.date > filters.dateEnd) return false
      if (t.buy_in < filters.buyInMin || t.buy_in > filters.buyInMax) return false
      if (filters.gameTypes.length > 0 && !filters.gameTypes.includes(t.format)) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!t.name.toLowerCase().includes(q) && !t.game_type.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [filters])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const arr = map.get(t.date) || []
      arr.push(t)
      map.set(t.date, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const handleTogglePlan = useCallback((id: number) => {
    if (planIds.has(id)) {
      removeFromPlan(id)
    } else {
      addToPlan(id)
    }
    setPlan(getPlan())
  }, [planIds])

  const totalBuyIn = useMemo(() => {
    return tournaments
      .filter((t) => planIds.has(t.id))
      .reduce((sum, t) => sum + t.buy_in, 0)
  }, [planIds])

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gold">{t("browse.heading")}</h1>
        <p className="text-xs text-text-secondary">
          {t("browse.eventCount", { count: filtered.length })}
          {planIds.size > 0 && (
            <span className="ml-2 text-gold">
              {t("browse.planned", { count: planIds.size })} · ${totalBuyIn.toLocaleString()}
            </span>
          )}
        </p>
      </header>

      <FilterPanel filters={filters} onChange={setFilters} />

      <div className="mt-4 space-y-4 pb-4">
        {grouped.map(([date, events]) => (
          <div key={date}>
            <h2 className="sticky top-0 z-10 bg-felt/95 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted backdrop-blur-sm">
              {formatDate(date, { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <div className="mt-1 space-y-2">
              {events.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  inPlan={planIds.has(t.id)}
                  onTogglePlan={handleTogglePlan}
                />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="py-12 text-center text-sm text-text-muted">
            {t("browse.noMatch")}
          </p>
        )}
      </div>
    </div>
  )
}
