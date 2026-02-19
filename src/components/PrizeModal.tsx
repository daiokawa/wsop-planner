"use client"

import { useState } from "react"
import { useT } from "@/lib/i18n"
import type { Tournament } from "@/types"

type Props = {
  tournament: Tournament
  onSubmit: (amount: number, position?: number) => void
  onClose: () => void
}

export function PrizeModal({ tournament, onSubmit, onClose }: Props) {
  const { t } = useT()
  const [amount, setAmount] = useState(0)
  const [position, setPosition] = useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-felt-border bg-felt-light p-5 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-success">{t("prize.title")}</h2>
        <p className="mt-1 text-xs text-text-secondary">
          #{tournament.event_number} {tournament.name}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-text-secondary">{t("prize.amount")}</label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-felt-border bg-felt-card px-3 py-2 text-lg font-bold text-success focus:border-success focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary">{t("prize.position")}</label>
            <input
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. 42"
              className="mt-1 w-32 rounded-lg border border-felt-border bg-felt-card px-3 py-2 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onSubmit(amount, position ? Number(position) : undefined)}
            disabled={amount <= 0}
            className="flex-1 rounded-lg bg-success/20 py-2.5 text-sm font-medium text-success hover:bg-success/30 disabled:opacity-40"
          >
            {t("prize.submit")} ${amount.toLocaleString()}
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
