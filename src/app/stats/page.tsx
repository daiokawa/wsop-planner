"use client"

import { useState, useMemo, useEffect } from "react"
import { tournaments } from "@/data/tournaments"
import { getBuyins, getPrizes } from "@/lib/storage"
import { useT } from "@/lib/i18n"
import type { BuyInRecord, PrizeRecord } from "@/types"

export default function StatsPage() {
  const { t } = useT()
  const [buyins, setBuyins] = useState<BuyInRecord[]>([])
  const [prizes, setPrizes] = useState<PrizeRecord[]>([])

  useEffect(() => {
    setBuyins(getBuyins())
    setPrizes(getPrizes())
  }, [])

  const totalSpent = buyins.reduce((s, b) => s + b.amount, 0)
  const totalWon = prizes.reduce((s, p) => s + p.amount, 0)
  const net = totalWon - totalSpent

  // Unique tournament IDs where we have a buy-in
  const playedIds = useMemo(
    () => [...new Set(buyins.map((b) => b.tournament_id))],
    [buyins]
  )
  const cashedIds = useMemo(
    () => [...new Set(prizes.map((p) => p.tournament_id))],
    [prizes]
  )
  const itm = playedIds.length > 0 ? (cashedIds.length / playedIds.length) * 100 : 0

  // Per-tournament P&L
  const tournamentPnL = useMemo(() => {
    const map = new Map<number, { spent: number; won: number }>()
    for (const b of buyins) {
      const cur = map.get(b.tournament_id) || { spent: 0, won: 0 }
      cur.spent += b.amount
      map.set(b.tournament_id, cur)
    }
    for (const p of prizes) {
      const cur = map.get(p.tournament_id) || { spent: 0, won: 0 }
      cur.won += p.amount
      map.set(p.tournament_id, cur)
    }
    return Array.from(map.entries())
      .map(([tid, pnl]) => ({
        tournament: tournaments.find((t) => t.id === tid),
        ...pnl,
        net: pnl.won - pnl.spent,
      }))
      .filter((x) => x.tournament)
      .sort((a, b) => a.tournament!.date.localeCompare(b.tournament!.date))
  }, [buyins, prizes])

  // Game type breakdown
  const byGameType = useMemo(() => {
    const map = new Map<string, { spent: number; won: number; count: number }>()
    for (const item of tournamentPnL) {
      const gt = item.tournament?.format || "Other"
      const cur = map.get(gt) || { spent: 0, won: 0, count: 0 }
      cur.spent += item.spent
      cur.won += item.won
      cur.count += 1
      map.set(gt, cur)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count)
  }, [tournamentPnL])

  // Daily running total for chart
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, number>()
    for (const b of buyins) {
      const t = tournaments.find((tt) => tt.id === b.tournament_id)
      if (!t) continue
      dayMap.set(t.date, (dayMap.get(t.date) || 0) - b.amount)
    }
    for (const p of prizes) {
      const t = tournaments.find((tt) => tt.id === p.tournament_id)
      if (!t) continue
      dayMap.set(t.date, (dayMap.get(t.date) || 0) + p.amount)
    }
    const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b))
    let running = 0
    return sorted.map(([date, delta]) => {
      running += delta
      return { date, delta, running }
    })
  }, [buyins, prizes])

  const maxAbs = Math.max(1, ...dailyData.map((d) => Math.abs(d.running)))

  if (buyins.length === 0 && prizes.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-4">
        <h1 className="text-lg font-bold text-gold">{t("stats.heading")}</h1>
        <div className="py-12 text-center">
          <p className="text-sm text-text-muted">{t("stats.noData")}</p>
          <p className="mt-1 text-xs text-text-muted">
            {t("stats.useTracker")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
      <h1 className="mb-4 text-lg font-bold text-gold">{t("stats.heading")}</h1>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-felt-border bg-felt-card p-3 text-center">
          <p className="text-[10px] uppercase text-text-muted">{t("stats.spent")}</p>
          <p className="text-lg font-bold text-danger">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-felt-border bg-felt-card p-3 text-center">
          <p className="text-[10px] uppercase text-text-muted">{t("stats.won")}</p>
          <p className="text-lg font-bold text-success">${totalWon.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-felt-border bg-felt-card p-3 text-center">
          <p className="text-[10px] uppercase text-text-muted">{t("stats.net")}</p>
          <p className={`text-lg font-bold ${net >= 0 ? "text-success" : "text-danger"}`}>
            {net >= 0 ? "+" : ""}${net.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ITM & Events */}
      <div className="mb-6 flex gap-4 text-sm">
        <span className="text-text-secondary">
          {t("stats.events")}: <span className="text-text-primary">{playedIds.length}</span>
        </span>
        <span className="text-text-secondary">
          {t("stats.cashed")}: <span className="text-text-primary">{cashedIds.length}</span>
        </span>
        <span className="text-text-secondary">
          {t("stats.itm")}: <span className="text-gold">{itm.toFixed(1)}%</span>
        </span>
      </div>

      {/* Running P&L chart (SVG bars) */}
      {dailyData.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t("stats.runningPnl")}
          </h2>
          <svg viewBox={`0 0 ${dailyData.length * 24} 100`} className="h-24 w-full" preserveAspectRatio="none">
            {dailyData.map((d, i) => {
              const h = (Math.abs(d.running) / maxAbs) * 45
              const y = d.running >= 0 ? 50 - h : 50
              return (
                <rect
                  key={d.date}
                  x={i * 24 + 2}
                  y={y}
                  width={20}
                  height={Math.max(h, 1)}
                  fill={d.running >= 0 ? "#4caf50" : "#dc4545"}
                  rx={2}
                  opacity={0.8}
                />
              )
            })}
            <line x1={0} y1={50} x2={dailyData.length * 24} y2={50} stroke="#ccc8bc" strokeWidth={0.5} />
          </svg>
        </div>
      )}

      {/* Game type breakdown */}
      {byGameType.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t("stats.byGameType")}
          </h2>
          <div className="space-y-1.5">
            {byGameType.map(([gt, data]) => {
              const gtNet = data.won - data.spent
              return (
                <div key={gt} className="flex items-center justify-between rounded bg-felt-card px-3 py-2 text-sm">
                  <span className="text-text-secondary">
                    {gt} <span className="text-text-muted">({data.count})</span>
                  </span>
                  <span className={gtNet >= 0 ? "text-success" : "text-danger"}>
                    {gtNet >= 0 ? "+" : ""}${gtNet.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tournament detail list */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          {t("stats.detail")}
        </h2>
        <div className="space-y-1">
          {tournamentPnL.map(({ tournament: tp, spent, won, net: tNet }) => (
            <div key={tp!.id} className="flex items-center justify-between rounded bg-felt-card px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-text-primary">
                  #{tp!.event_number} {tp!.name}
                </p>
                <p className="text-[10px] text-text-muted">
                  -{" "}${spent.toLocaleString()}{won > 0 && ` / + $${won.toLocaleString()}`}
                </p>
              </div>
              <span className={`ml-2 text-sm font-medium ${tNet >= 0 ? "text-success" : "text-danger"}`}>
                {tNet >= 0 ? "+" : ""}${tNet.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
