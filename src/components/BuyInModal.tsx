"use client"

import { useState } from "react"
import { useT } from "@/lib/i18n"
import type { Tournament } from "@/types"

type Props = {
  tournament: Tournament
  onSubmit: (amount: number, isReentry: boolean) => void
  onClose: () => void
}

export function BuyInModal({ tournament, onSubmit, onClose }: Props) {
  const { t } = useT()
  const [amount, setAmount] = useState(tournament.buy_in)
  const [isReentry, setIsReentry] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-felt-border bg-felt-light p-5 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-gold">{t("buyin.title")}</h2>
        <p className="mt-1 text-xs text-text-secondary">
          #{tournament.event_number} {tournament.name}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-text-secondary">{t("buyin.amount")}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-felt-border bg-felt-card px-3 py-2 text-lg font-bold text-gold focus:border-gold-dim focus:outline-none"
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isReentry}
              onChange={(e) => setIsReentry(e.target.checked)}
              className="accent-gold"
            />
            {t("buyin.reentry")}
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onSubmit(amount, isReentry)}
            className="flex-1 rounded-lg bg-gold-dim/30 py-2.5 text-sm font-medium text-gold hover:bg-gold-dim/40"
          >
            {t("buyin.submit")} · ${amount.toLocaleString()}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-felt-card px-4 py-2.5 text-sm text-text-muted hover:bg-felt-hover"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  )
}
