"use client"

import type { Tournament } from "@/types"
import { useT } from "@/lib/i18n"

export type ConflictInfo = {
  withId: number
  withEventNumber: number
  withName: string
}

type Props = {
  tournament: Tournament
  inPlan?: boolean
  onTogglePlan?: (id: number) => void
  onTogglePriority?: (id: number) => void
  isPrioritized?: boolean
  conflict?: boolean
  conflictInfo?: ConflictInfo[]
}

function formatBuyIn(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`
  return `$${amount}`
}

const formatColors: Record<string, string> = {
  NLH: "bg-blue-100 text-blue-800",
  PLO: "bg-green-100 text-green-800",
  "PLO Hi-Lo": "bg-teal-100 text-teal-800",
  "5-Card PLO": "bg-emerald-100 text-emerald-800",
  "Big O": "bg-cyan-100 text-cyan-800",
  Mixed: "bg-amber-100 text-amber-800",
  Stud: "bg-orange-100 text-orange-800",
  "Stud Hi-Lo": "bg-orange-100 text-orange-800",
  Razz: "bg-red-100 text-red-800",
  HORSE: "bg-amber-100 text-amber-800",
  "Dealers Choice": "bg-yellow-100 text-yellow-800",
  Other: "bg-gray-100 text-gray-700",
}

function scrollToTournament(id: number) {
  const el = document.getElementById(`tournament-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.classList.add("ring-2", "ring-danger")
    setTimeout(() => el.classList.remove("ring-2", "ring-danger"), 1500)
  }
}

export function TournamentCard({ tournament: t, inPlan, onTogglePlan, onTogglePriority, isPrioritized, conflict, conflictInfo }: Props) {
  const { t: tr, formatDate } = useT()

  return (
    <div
      id={`tournament-${t.id}`}
      className={`rounded-lg border p-3 transition-all ${
        conflict
          ? "border-danger/50 bg-danger-dim/20"
          : inPlan
          ? "border-gold-dim/50 bg-gold-dim/10"
          : "border-felt-border bg-felt-card hover:bg-felt-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-text-muted">#{t.event_number}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${formatColors[t.format] || formatColors.Other}`}>
              {t.format}
            </span>
            {t.tournament_format !== "Re-entry" && (
              <span className="rounded bg-felt-light px-1.5 py-0.5 text-[10px] text-text-secondary">
                {t.tournament_format}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-medium leading-tight text-text-primary">
            {t.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
            <span>{formatDate(t.date)}</span>
            {t.flight_label && (
              <span className="rounded bg-felt-light px-1 py-0.5 text-[10px] text-text-muted">
                1{t.flight_label}
              </span>
            )}
            {t.duration_days > 1 && (
              <span className="text-text-muted">{t.duration_days}d</span>
            )}
          </div>
          {t.day2_date && (
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-text-muted">
              <span>{tr("card.day2", { date: formatDate(t.day2_date, { month: "short", day: "numeric", weekday: "short" }) })}</span>
              {t.event_end_date && t.event_end_date !== t.day2_date && (
                <span>{tr("card.final", { date: formatDate(t.event_end_date, { month: "short", day: "numeric", weekday: "short" }) })}</span>
              )}
            </div>
          )}
          {(t.prev_entries || t.guaranteed) && (
            <div className="mt-1 flex gap-3 text-[11px] text-text-muted">
              {t.prev_entries && <span>{tr("card.entries", { count: t.prev_entries.toLocaleString() })}</span>}
              {t.guaranteed && <span>{tr("card.gtd", { amount: (t.guaranteed / 1_000_000).toFixed(1) })}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-bold text-gold">{formatBuyIn(t.buy_in)}</span>
          {onTogglePlan && (
            inPlan ? (
              <div className="flex gap-1">
                {onTogglePriority && (
                  <button
                    onClick={() => onTogglePriority(t.id)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      isPrioritized
                        ? "bg-gold-dim/40 text-gold"
                        : "bg-gold-dim/30 text-gold hover:bg-gold-dim/40"
                    }`}
                  >
                    {isPrioritized ? tr("card.prioritized") : tr("card.prioritize")}
                  </button>
                )}
                <button
                  onClick={() => onTogglePlan(t.id)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors bg-felt-border/50 text-text-muted hover:bg-danger-dim/40 hover:text-danger"
                >
                  {tr("card.remove")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => onTogglePlan(t.id)}
                className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors bg-felt-border text-text-secondary hover:bg-gold-dim/30 hover:text-gold"
              >
                {tr("card.addPlan")}
              </button>
            )
          )}
        </div>
      </div>
      {conflict && conflictInfo && conflictInfo.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {conflictInfo.map((ci) => (
            <button
              key={ci.withId}
              onClick={() => scrollToTournament(ci.withId)}
              className="rounded bg-danger-dim/30 px-2 py-1 text-[11px] text-danger hover:bg-danger-dim/50 transition-colors"
            >
              {tr("card.day2Conflict")} → #{ci.withEventNumber}
            </button>
          ))}
        </div>
      )}
      {conflict && (!conflictInfo || conflictInfo.length === 0) && (
        <div className="mt-2 rounded bg-danger-dim/30 px-2 py-1 text-[11px] text-danger">
          {tr("card.day2Conflict")}
        </div>
      )}
    </div>
  )
}
