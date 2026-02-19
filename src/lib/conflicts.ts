// Day 2 conflict detection
import type { Tournament } from "@/types"

export type Conflict = {
  tournament_id: number
  conflicting_with: number
  reason: string
}

// Get Day 2+ dates for a tournament
// For flight-based events: use day2_date → event_end_date (gap between flight and Day 2 is free)
// For normal events: use day2_date or date+1 → date+duration-1
function getDay2Dates(t: Tournament): string[] {
  if (t.duration_days <= 1 && !t.day2_date) return []

  const dates: string[] = []

  if (t.event_end_date && t.day2_date) {
    // Flight-based event: Day 2+ runs from day2_date to event_end_date
    const end = new Date(t.event_end_date + "T00:00:00")
    const current = new Date(t.day2_date + "T00:00:00")
    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10))
      current.setDate(current.getDate() + 1)
    }
  } else {
    // Normal event: Day 2+ runs from date+1 to date+duration-1
    const start = new Date(t.date + "T00:00:00")
    for (let i = 1; i < t.duration_days; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    if (t.day2_date && !dates.includes(t.day2_date)) {
      dates.push(t.day2_date)
    }
  }

  return dates
}

export function detectConflicts(
  planned: Tournament[],
  allTournaments: Tournament[]
): Conflict[] {
  const conflicts: Conflict[] = []

  for (const t of planned) {
    const day2Dates = getDay2Dates(t)
    if (day2Dates.length === 0) continue

    for (const other of planned) {
      if (other.id === t.id) continue
      // Check if other tournament's Day 1 falls on one of t's Day 2+ dates
      if (day2Dates.includes(other.date)) {
        conflicts.push({
          tournament_id: t.id,
          conflicting_with: other.id,
          reason: `Day 2+ of #${t.event_number} (${t.name}) overlaps with Day 1 of #${other.event_number} (${other.name})`,
        })
      }
    }
  }

  return conflicts
}

export function hasConflict(
  tournamentId: number,
  conflicts: Conflict[]
): boolean {
  return conflicts.some(
    (c) => c.tournament_id === tournamentId || c.conflicting_with === tournamentId
  )
}
