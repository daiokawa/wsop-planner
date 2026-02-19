"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { tournaments } from "@/data/tournaments"
import { BuyInModal } from "@/components/BuyInModal"
import { PrizeModal } from "@/components/PrizeModal"
import { getPlan, getBuyins, addBuyin, getPrizes, addPrize } from "@/lib/storage"
import { useT } from "@/lib/i18n"
import type { Tournament, BuyInRecord, PrizeRecord } from "@/types"

export default function TrackerPage() {
  const { t, formatDate } = useT()
  const [buyins, setBuyins] = useState<BuyInRecord[]>([])
  const [prizes, setPrizes] = useState<PrizeRecord[]>([])
  const [plan, setPlan] = useState<number[]>([])
  const [buyinTarget, setBuyinTarget] = useState<Tournament | null>(null)
  const [prizeTarget, setPrizeTarget] = useState<Tournament | null>(null)

  useEffect(() => {
    setBuyins(getBuyins())
    setPrizes(getPrizes())
    setPlan(getPlan().map((p) => p.tournament_id))
  }, [])

  const plannedTournaments = useMemo(
    () => tournaments.filter((t) => plan.includes(t.id)).sort((a, b) => a.date.localeCompare(b.date)),
    [plan]
  )

  const handleBuyIn = useCallback((amount: number, isReentry: boolean) => {
    if (!buyinTarget) return
    addBuyin({ tournament_id: buyinTarget.id, amount, is_reentry: isReentry })
    setBuyins(getBuyins())
    setBuyinTarget(null)
  }, [buyinTarget])

  const handlePrize = useCallback((amount: number, position?: number) => {
    if (!prizeTarget) return
    addPrize({ tournament_id: prizeTarget.id, amount, finish_position: position })
    setPrizes(getPrizes())
    setPrizeTarget(null)
  }, [prizeTarget])

  const getTournamentBuyins = (tid: number) => buyins.filter((b) => b.tournament_id === tid)
  const getTournamentPrizes = (tid: number) => prizes.filter((p) => p.tournament_id === tid)

  const totalSpent = buyins.reduce((s, b) => s + b.amount, 0)
  const totalWon = prizes.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gold">{t("tracker.heading")}</h1>
        <div className="mt-1 flex gap-4 text-xs">
          <span className="text-danger">{t("tracker.spent")}: ${totalSpent.toLocaleString()}</span>
          <span className="text-success">{t("tracker.won")}: ${totalWon.toLocaleString()}</span>
          <span className={totalWon - totalSpent >= 0 ? "text-success" : "text-danger"}>
            {t("tracker.net")}: {totalWon - totalSpent >= 0 ? "+" : ""}${(totalWon - totalSpent).toLocaleString()}
          </span>
        </div>
      </header>

      {plannedTournaments.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-muted">{t("tracker.noEvents")}</p>
          <p className="mt-1 text-xs text-text-muted">{t("tracker.addHint")}</p>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {plannedTournaments.map((tt) => {
            const tBuyins = getTournamentBuyins(tt.id)
            const tPrizes = getTournamentPrizes(tt.id)
            const spent = tBuyins.reduce((s, b) => s + b.amount, 0)
            const won = tPrizes.reduce((s, p) => s + p.amount, 0)
            const hasAction = tBuyins.length > 0 || tPrizes.length > 0

            return (
              <div
                key={tt.id}
                className={`rounded-lg border p-3 ${
                  hasAction
                    ? "border-gold-dim/30 bg-felt-card"
                    : "border-felt-border bg-felt-card"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>#{tt.event_number}</span>
                      <span>{formatDate(tt.date, { month: "short", day: "numeric" })}</span>
                      <span className="text-gold">${tt.buy_in.toLocaleString()}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm font-medium text-text-primary">{tt.name}</h3>
                    {hasAction && (
                      <div className="mt-1.5 flex gap-3 text-[11px]">
                        {spent > 0 && (
                          <span className="text-danger">
                            -{" "}${spent.toLocaleString()}
                            {tBuyins.length > 1 && ` (${tBuyins.length}x)`}
                          </span>
                        )}
                        {won > 0 && (
                          <span className="text-success">+ ${won.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBuyinTarget(tt)}
                      className="rounded-md bg-danger-dim/20 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-dim/30"
                    >
                      {t("tracker.buyIn")}
                    </button>
                    <button
                      onClick={() => setPrizeTarget(tt)}
                      className="rounded-md bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success/20"
                    >
                      {t("tracker.cashed")}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {buyinTarget && (
        <BuyInModal
          tournament={buyinTarget}
          onSubmit={handleBuyIn}
          onClose={() => setBuyinTarget(null)}
        />
      )}
      {prizeTarget && (
        <PrizeModal
          tournament={prizeTarget}
          onSubmit={handlePrize}
          onClose={() => setPrizeTarget(null)}
        />
      )}
    </div>
  )
}
