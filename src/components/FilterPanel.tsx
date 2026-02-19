"use client"

import { useState } from "react"
import { useT } from "@/lib/i18n"
import type { GameFormat, TournamentFormat } from "@/types"

export type Filters = {
  dateStart: string
  dateEnd: string
  buyInMin: number
  buyInMax: number
  gameTypes: GameFormat[]
  tournamentFormats: TournamentFormat[]
  search: string
}

type Props = {
  filters: Filters
  onChange: (filters: Filters) => void
}

const GAME_TYPES: GameFormat[] = [
  "NLH", "PLO", "PLO Hi-Lo", "5-Card PLO", "Big O", "Mixed", "Stud", "Stud Hi-Lo",
  "Razz", "HORSE", "Dealers Choice", "Other",
]

const BUYIN_PRESETS = [
  { labelKey: "filter.all", min: 0, max: 300000 },
  { labelKey: null, label: "< $1K", min: 0, max: 999 },
  { labelKey: null, label: "$1K-$5K", min: 1000, max: 5000 },
  { labelKey: null, label: "$5K-$25K", min: 5000, max: 25000 },
  { labelKey: null, label: "$25K+", min: 25000, max: 300000 },
]

export const defaultFilters: Filters = {
  dateStart: "2026-05-26",
  dateEnd: "2026-07-15",
  buyInMin: 0,
  buyInMax: 300000,
  gameTypes: [],
  tournamentFormats: [],
  search: "",
}

export function FilterPanel({ filters, onChange }: Props) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)

  const toggleGameType = (gt: GameFormat) => {
    const current = filters.gameTypes
    const next = current.includes(gt)
      ? current.filter((g) => g !== gt)
      : [...current, gt]
    onChange({ ...filters, gameTypes: next })
  }

  const activeFilterCount =
    (filters.gameTypes.length > 0 ? 1 : 0) +
    (filters.buyInMin > 0 || filters.buyInMax < 300000 ? 1 : 0) +
    (filters.search ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        placeholder={t("filter.search")}
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-full rounded-lg border border-felt-border bg-felt-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-dim focus:outline-none"
      />

      {/* Buy-in presets */}
      <div className="flex flex-wrap gap-1.5">
        {BUYIN_PRESETS.map((p) => {
          const active = filters.buyInMin === p.min && filters.buyInMax === p.max
          const display = p.labelKey ? t(p.labelKey) : p.label!
          return (
            <button
              key={display}
              onClick={() => onChange({ ...filters, buyInMin: p.min, buyInMax: p.max })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-gold-dim/30 text-gold"
                  : "bg-felt-card text-text-secondary hover:bg-felt-hover"
              }`}
            >
              {display}
            </button>
          )
        })}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
      >
        <span>{expanded ? "▾" : "▸"} {t("filter.gameTypes")}</span>
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-gold-dim/30 px-1.5 text-[10px] text-gold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Game type filters */}
      {expanded && (
        <div className="flex flex-wrap gap-1.5">
          {GAME_TYPES.map((gt) => {
            const active = filters.gameTypes.includes(gt)
            return (
              <button
                key={gt}
                onClick={() => toggleGameType(gt)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "bg-gold-dim/30 text-gold"
                    : "bg-felt-card text-text-secondary hover:bg-felt-hover"
                }`}
              >
                {gt}
              </button>
            )
          })}
          {filters.gameTypes.length > 0 && (
            <button
              onClick={() => onChange({ ...filters, gameTypes: [] })}
              className="rounded-full px-2.5 py-1 text-xs text-text-muted hover:text-danger"
            >
              {t("filter.clear")}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
