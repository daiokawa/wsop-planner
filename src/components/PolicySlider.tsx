"use client"

import { useT } from "@/lib/i18n"

type Props = {
  value: number
  onChange: (v: number) => void
}

export function PolicySlider({ value, onChange }: Props) {
  const { t } = useT()

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-medium text-text-primary">
        <span>{t("policy.safe")}</span>
        <span>{t("policy.risky")}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </div>
  )
}
