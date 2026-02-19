"use client"

import { useState, useMemo } from "react"
import type { Tournament } from "@/types"
import { useT } from "@/lib/i18n"

type Props = {
  tournaments: Tournament[]
  budget: number
  onClose: () => void
}

// Determine format color class
function fmtClass(t: Tournament): string {
  if (/main.event/i.test(t.name)) return "main"
  switch (t.format) {
    case "NLH": return "nlh"
    case "PLO": case "PLO Hi-Lo": case "5-Card PLO": case "Big O": case "6-Card PLO": return "plo"
    case "Mixed": case "HORSE": case "Dealers Choice": return "mixed"
    case "Stud": case "Stud Hi-Lo": case "Razz": return "stud"
    default: return "other"
  }
}

// Short event label for calendar cell
function shortLabel(t: Tournament): string {
  const num = `#${t.event_number}`
  const n = t.name
    .replace(/NLHE?/g, "")
    .replace(/No-Limit Hold'em/g, "")
    .replace(/- Flight [A-Z]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const short = n.length > 22 ? n.slice(0, 20) + ".." : n
  const fl = t.flight_label ? ` 1${t.flight_label}` : ""
  return `${num} ${short}${fl}`
}

// Build grid cells for a given month
function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells: { day: number; inMonth: boolean; date: string; dow: number }[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, inMonth: false, date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dow: cells.length % 7 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dow: cells.length % 7 })
  }
  while (cells.length < 35) {
    const d = cells.length - startDow - daysInMonth + 1
    const m = month + 2 > 12 ? 1 : month + 2
    const y = month + 2 > 12 ? year + 1 : year
    cells.push({ day: d, inMonth: false, date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dow: cells.length % 7 })
  }
  return cells.slice(0, 35)
}

const evtColors: Record<string, { bg: string; color: string; border?: string }> = {
  nlh:   { bg: "#dbeafe", color: "#1e40af" },
  plo:   { bg: "#dcfce7", color: "#166534" },
  mixed: { bg: "#fef3c7", color: "#92400e" },
  stud:  { bg: "#ffedd5", color: "#9a3412" },
  other: { bg: "#f3f4f6", color: "#374151" },
  main:  { bg: "#fef9c3", color: "#854d0e", border: "1px solid #ca8a04" },
}

export function CalendarModal({ tournaments: planned, budget, onClose }: Props) {
  const { t } = useT()
  const [month, setMonth] = useState<"june" | "july">("june")

  const year = 2026
  const cells = month === "june" ? buildMonth(year, 5) : buildMonth(year, 6)

  // Build day-to-events map
  const dayEvents = new Map<string, Tournament[]>()
  const dayDay2 = new Map<string, string[]>()

  for (const t of planned) {
    const arr = dayEvents.get(t.date) || []
    arr.push(t)
    dayEvents.set(t.date, arr)
    if (t.day2_date) {
      const d2arr = dayDay2.get(t.day2_date) || []
      const label = t.name.replace(/- Flight [A-Z]/, "").replace(/NLHE?/, "").trim()
      const short = label.length > 15 ? label.slice(0, 13) + ".." : label
      if (!d2arr.includes(`Day2: ${short}`)) d2arr.push(`Day2: ${short}`)
      dayDay2.set(t.day2_date, d2arr)
    }
  }

  const totalBuyIn = planned.reduce((s, t) => s + t.buy_in, 0)

  // Calendar URLs based on API endpoint
  const idsParam = planned.map((t) => t.id).join(",")
  const icsUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/api/v1/calendar?ids=${idsParam}`
  }, [idsParam])
  const webcalUrl = icsUrl.replace(/^https?:\/\//, "webcal://")
  const googleCalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`

  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2" onClick={onClose}>
      <div
        className="relative w-full max-w-[880px] max-h-[95vh] overflow-auto rounded-lg bg-[#f8f7f4]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#f8f7f4] px-3 py-2 border-b border-[#e8e5db]">
          <div className="flex gap-2">
            <button
              onClick={() => setMonth("june")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                month === "june" ? "bg-[#8a7000]/20 text-[#8a7000]" : "text-[#5c5850] hover:bg-[#e8e5db]"
              }`}
            >
              {t("calendar.june")}
            </button>
            <button
              onClick={() => setMonth("july")}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                month === "july" ? "bg-[#8a7000]/20 text-[#8a7000]" : "text-[#5c5850] hover:bg-[#e8e5db]"
              }`}
            >
              {t("calendar.july")}
            </button>
          </div>
          <div className="flex gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-[#8a7000]/20 px-3 py-1 text-xs font-medium text-[#8a7000] hover:bg-[#8a7000]/30 transition-colors"
            >
              {t("calendar.google")}
            </a>
            <a
              href={webcalUrl}
              className="rounded bg-[#e8e5db] px-3 py-1 text-xs font-medium text-[#5c5850] hover:bg-[#ddd8cc] transition-colors"
            >
              {t("calendar.apple")}
            </a>
            <button
              onClick={onClose}
              className="rounded bg-[#e8e5db] px-3 py-1 text-xs font-medium text-[#5c5850] hover:bg-[#ddd8cc] transition-colors"
            >
              {t("calendar.close")}
            </button>
          </div>
        </div>

        {/* Visual calendar preview */}
        <div className="p-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-1.5">
            <h2 className="text-sm font-bold text-[#8a7000]">
              WSOP 2026 — {month === "june" ? "June" : "July"}
            </h2>
            <span className="text-[9px] text-[#9c9688]">
              Budget ${budget.toLocaleString()} · Total ${totalBuyIn.toLocaleString()} · {planned.length} events
            </span>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {weekdays.map((wd, i) => (
              <span key={wd} className={`text-center text-[8px] font-semibold py-0.5 ${
                i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-[#5c5850]"
              }`}>
                {wd}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              const events = dayEvents.get(cell.date) || []
              const d2Labels = dayDay2.get(cell.date) || []
              const isSun = cell.dow === 0
              const isSat = cell.dow === 6

              return (
                <div key={idx} className={`rounded border border-[#e8e5db] p-0.5 min-h-[56px] overflow-hidden ${
                  cell.inMonth ? "bg-white" : "bg-[#f3f2ed]"
                }`}>
                  <div className={`text-[9px] font-semibold mb-0.5 ${
                    !cell.inMonth ? "text-[#9c9688]" : isSun ? "text-red-600" : isSat ? "text-blue-600" : "text-[#5c5850]"
                  }`}>
                    {cell.day}
                  </div>
                  {d2Labels.map((label, li) => (
                    <div key={li} className="text-[7px] text-[#8a7000]/60 px-0.5 leading-tight">
                      {label}
                    </div>
                  ))}
                  {events.slice(0, 3).map((evt) => {
                    const cls = fmtClass(evt)
                    const colors = evtColors[cls] || evtColors.other
                    return (
                      <div key={evt.id} className="text-[8px] leading-tight rounded px-1 py-0.5 mb-0.5 truncate" style={{
                        background: colors.bg, color: colors.color,
                        border: colors.border || "none",
                        fontWeight: cls === "main" ? 700 : 400,
                      }}>
                        {shortLabel(evt)}
                      </div>
                    )
                  })}
                  {events.length > 3 && (
                    <div className="text-[7px] text-[#9c9688] px-0.5">
                      +{events.length - 3} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-end gap-3 mt-1.5 pr-1">
            {(["NLH", "PLO", "Mixed", "Stud"] as const).map((label) => {
              const key = label.toLowerCase() as keyof typeof evtColors
              const c = evtColors[key]
              return (
                <span key={label} className="flex items-center gap-1 text-[7px] text-[#5c5850]">
                  <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: c.bg, border: `1px solid ${c.color}40` }} />
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
