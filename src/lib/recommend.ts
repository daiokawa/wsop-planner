// Recommendation engine — all calculations client-side
import type { Tournament, UserPreferences, PlanEntry } from "@/types"

type ScoredTournament = {
  tournament: Tournament
  score: number
  reasons: string[]
}

// Main Events always get priority placement
function isMainEvent(t: Tournament): boolean {
  return /main.event/i.test(t.name)
}

// Score a tournament based on user preferences
function scoreTournament(t: Tournament, prefs: UserPreferences): ScoredTournament {
  const reasons: string[] = []
  let score = 0

  // Base score from game type preference
  if (prefs.game_types.includes(t.format)) {
    score += 30
    reasons.push(`Preferred game: ${t.format}`)
  }

  // ROI expectation score (higher entries relative to buy-in = better value)
  if (t.prev_entries && t.buy_in > 0) {
    const entryValue = (t.prev_entries * t.buy_in) / t.buy_in
    const normalized = Math.min(entryValue / 1000, 1) * 20
    score += normalized
    if (normalized > 10) reasons.push("High expected field")
  }

  // Policy slider influence (0=conservative, 100=aggressive)
  const aggression = prefs.policy_slider / 100

  // Conservative: prefer low buy-in, high entries
  // Aggressive: prefer high buy-in, high guarantees
  if (aggression < 0.4) {
    // Conservative
    if (t.buy_in <= 1500) {
      score += 20
      reasons.push("Low buy-in (conservative)")
    }
    if (t.prev_entries && t.prev_entries > 2000) {
      score += 15
      reasons.push("Large field (better value)")
    }
  } else if (aggression > 0.6) {
    // Aggressive
    if (t.buy_in >= 5000) {
      score += 15
      reasons.push("High stakes")
    }
    if (t.guaranteed && t.guaranteed >= 1_000_000) {
      score += 20
      reasons.push("Large guarantee")
    }
    if (t.buy_in >= 25000) {
      score += 10
      reasons.push("High roller")
    }
  } else {
    // Balanced
    if (t.buy_in >= 1000 && t.buy_in <= 10000) {
      score += 15
      reasons.push("Mid-range buy-in")
    }
  }

  // Freezeout bonus (can't lose more than one buy-in)
  if (t.tournament_format === "Freezeout") {
    score += 5
    reasons.push("Freezeout (capped risk)")
  }

  // Main Event bonus — always prioritize
  if (isMainEvent(t)) {
    score += 100
    reasons.push("Main Event")
  }

  // Duration penalty — longer events tie up schedule (Main Events exempt)
  if (t.duration_days > 3 && !isMainEvent(t)) {
    score -= (t.duration_days - 3) * 2
  }

  // Game mix bonus: boost non-NLH when user wants variety
  if (t.format !== "NLH" && prefs.game_types.includes(t.format) && prefs.game_types.includes("NLH")) {
    const mixBonus = (prefs.game_mix / 100) * 30
    if (mixBonus > 0) {
      score += mixBonus
      reasons.push("Game mix boost")
    }
  }

  // Slight preference for earlier flights (Flight A > B > C > D)
  if (t.flight_label) {
    score -= (t.flight_label.charCodeAt(0) - 65) * 0.5
  }

  return { tournament: t, score, reasons }
}

// Greedy selection: pick highest-scoring events within budget, no date conflicts
export function recommend(
  allTournaments: Tournament[],
  prefs: UserPreferences,
  existingPlan: PlanEntry[] = []
): PlanEntry[] {
  // Hard filter
  const eligible = allTournaments.filter((t) => {
    if (prefs.min_single_buyin && t.buy_in < prefs.min_single_buyin) return false
    if (t.buy_in > prefs.max_single_buyin) return false
    if (prefs.game_types.length > 0 && !prefs.game_types.includes(t.format)) return false
    if (prefs.date_start && t.date < prefs.date_start) return false
    if (prefs.date_end && t.date > prefs.date_end) return false
    return true
  })

  // Score and sort
  const scored = eligible
    .map((t) => scoreTournament(t, prefs))
    .sort((a, b) => b.score - a.score)

  // Greedy selection
  const selected: PlanEntry[] = []
  let budget = prefs.total_budget
  const occupiedDates = new Set<string>()
  const selectedGroups = new Set<number>() // One flight per event

  // Budget distribution: slider controls how much one event can consume
  // Slider 0 ("play more events") → max 60% of budget per event
  // Slider 100 ("go big") → max 100% of budget per event
  const aggression = prefs.policy_slider / 100
  const maxBudgetRatio = 0.6 + aggression * 0.4
  const maxSingleSpend = prefs.total_budget * maxBudgetRatio

  // Pre-fill existing plan Day 1 dates only
  for (const entry of existingPlan) {
    const t = allTournaments.find((tt) => tt.id === entry.tournament_id)
    if (t) {
      occupiedDates.add(t.date)
      if (t.flight_group) selectedGroups.add(t.flight_group)
    }
  }

  for (const { tournament: t, score } of scored) {
    if (budget < t.buy_in) continue
    if (t.buy_in > maxSingleSpend) continue
    if (existingPlan.some((e) => e.tournament_id === t.id)) continue

    // Only auto-select one flight per event
    if (t.flight_group && selectedGroups.has(t.flight_group)) continue

    // Only block if Day 1 dates collide
    if (occupiedDates.has(t.date)) continue

    selected.push({
      tournament_id: t.id,
      added_manually: false,
      score,
    })

    budget -= t.buy_in
    occupiedDates.add(t.date)
    if (t.flight_group) selectedGroups.add(t.flight_group)
  }

  return selected
}
