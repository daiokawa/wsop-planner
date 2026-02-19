"use client"

import type { Tournament } from "@/types"
import { useT } from "@/lib/i18n"

type Props = {
  alternatives: Tournament[]
  onSwap: (id: number) => void
}

export function AlternativeFlights({ alternatives, onSwap }: Props) {
  const { t, formatDate } = useT()
  if (alternatives.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-3">
      <span className="text-[10px] text-text-muted">{t("card.altFlights")}</span>
      {alternatives.map((alt) => (
        <button
          key={alt.id}
          onClick={() => onSwap(alt.id)}
          className="rounded bg-felt-card px-2 py-0.5 text-[10px] text-text-secondary hover:bg-gold-dim/20 hover:text-gold transition-colors"
        >
          {alt.flight_label && `1${alt.flight_label}`} {formatDate(alt.date, { month: "numeric", day: "numeric", weekday: "short" })}
        </button>
      ))}
    </div>
  )
}
