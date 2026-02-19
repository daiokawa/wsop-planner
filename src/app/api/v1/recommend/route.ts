import { NextResponse } from "next/server"
import { tournaments } from "@/data/tournaments"
import { recommend } from "@/lib/recommend"
import type { UserPreferences } from "@/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const prefs: UserPreferences = {
      total_budget: body.total_budget ?? 10000,
      min_single_buyin: body.min_single_buyin ?? 0,
      max_single_buyin: body.max_single_buyin ?? 5000,
      policy_slider: body.policy_slider ?? 50,
      reentry_limit: body.reentry_limit ?? 1,
      game_types: body.game_types ?? ["NLH", "PLO"],
      game_mix: body.game_mix ?? 50,
      date_start: body.date_start,
      date_end: body.date_end,
    }

    const plan = recommend(tournaments, prefs)

    const result = plan.map((entry) => {
      const t = tournaments.find((tt) => tt.id === entry.tournament_id)
      return { ...entry, tournament: t }
    })

    const totalBuyin = result.reduce((s, r) => s + (r.tournament?.buy_in ?? 0), 0)

    return NextResponse.json({
      count: result.length,
      total_buyin: totalBuyin,
      remaining_budget: prefs.total_budget - totalBuyin,
      recommendations: result,
    })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
