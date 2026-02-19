"use client"

import { useState, useRef, useEffect } from "react"
import { useT, type Locale } from "@/lib/i18n"

const options: { locale: Locale; label: string; short: string }[] = [
  { locale: "en", label: "English", short: "En" },
  { locale: "ja", label: "日本語", short: "日本語" },
  { locale: "ko", label: "한국어", short: "한국어" },
  { locale: "zh", label: "中文", short: "中文" },
]

export function LangSwitch() {
  const { locale, setLocale } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const current = options.find((o) => o.locale === locale) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md border border-felt-border bg-felt-card px-2 py-1 text-xs font-medium text-text-secondary hover:bg-felt-hover transition-colors"
      >
        {current.short}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[120px] rounded-lg border border-felt-border bg-felt-card shadow-lg overflow-hidden z-50">
          {options.map((opt) => (
            <button
              key={opt.locale}
              onClick={() => { setLocale(opt.locale); setOpen(false) }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                opt.locale === locale
                  ? "bg-gold-dim/20 text-gold"
                  : "text-text-secondary hover:bg-felt-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
