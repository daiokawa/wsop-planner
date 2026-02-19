import { NextResponse } from "next/server"
import { tournaments } from "@/data/tournaments"

export async function GET() {
  const total = tournaments.length
  const totalBuyInAll = tournaments.reduce((s, t) => s + t.buy_in, 0)

  const byFormat = new Map<string, { count: number; avg_buyin: number; total_buyin: number }>()
  for (const t of tournaments) {
    const cur = byFormat.get(t.format) || { count: 0, avg_buyin: 0, total_buyin: 0 }
    cur.count += 1
    cur.total_buyin += t.buy_in
    cur.avg_buyin = Math.round(cur.total_buyin / cur.count)
    byFormat.set(t.format, cur)
  }

  const byBuyinRange = {
    under_1000: tournaments.filter((t) => t.buy_in < 1000).length,
    "1000_to_5000": tournaments.filter((t) => t.buy_in >= 1000 && t.buy_in <= 5000).length,
    "5001_to_25000": tournaments.filter((t) => t.buy_in > 5000 && t.buy_in <= 25000).length,
    "over_25000": tournaments.filter((t) => t.buy_in > 25000).length,
  }

  const dateRange = {
    start: tournaments[0]?.date,
    end: tournaments[tournaments.length - 1]?.date,
  }

  return NextResponse.json({
    total_events: total,
    total_buyin_all_events: totalBuyInAll,
    date_range: dateRange,
    by_format: Object.fromEntries(byFormat),
    by_buyin_range: byBuyinRange,
  })
}
