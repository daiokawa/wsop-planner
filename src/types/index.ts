// WSOP Planner 2026 — Type definitions

export type GameFormat = "NLH" | "PLO" | "PLO Hi-Lo" | "5-Card PLO" | "Big O" | "6-Card PLO" | "Mixed" | "Stud" | "Stud Hi-Lo" | "Razz" | "HORSE" | "Dealers Choice" | "Other"

export type TournamentFormat = "Freezeout" | "Re-entry" | "Turbo" | "Super Turbo" | "Bounty" | "Mystery Bounty" | "Shootout" | "Tag Team" | "Other"

export type Tournament = {
  id: number
  event_number: number
  name: string
  date: string          // "2026-05-26"
  time: string          // "10:00"
  buy_in: number        // USD
  chips: number
  clock_minutes: number
  late_reg_levels: number
  format: GameFormat
  game_type: string     // detailed game type
  tournament_format: TournamentFormat
  duration_days: number
  day2_date?: string
  flight_label?: string   // "A", "B", "C", "D" etc.
  flight_group?: number   // event_number — links flights of the same event
  event_end_date?: string // shared end date for all flights of an event
  guaranteed?: number
  prev_entries?: number
  prev_prize_pool?: number
}

export type UserPreferences = {
  total_budget: number
  min_single_buyin: number
  max_single_buyin: number
  policy_slider: number     // 0=conservative, 100=aggressive
  reentry_limit: number
  game_types: GameFormat[]
  game_mix: number          // 0=NLH heavy, 50=balanced, 100=non-NLH heavy
  date_start?: string
  date_end?: string
  include_ladies?: boolean   // default false
  include_seniors?: boolean  // default false
  exclude_main_event?: boolean  // default false
}

export type BuyInRecord = {
  id: string
  tournament_id: number
  amount: number
  is_reentry: boolean
  created_at: string
}

export type PrizeRecord = {
  id: string
  tournament_id: number
  amount: number
  finish_position?: number
  created_at: string
}

export type PlanEntry = {
  tournament_id: number
  added_manually: boolean
  score?: number
}

export type AppState = {
  preferences: UserPreferences
  plan: PlanEntry[]
  buyins: BuyInRecord[]
  prizes: PrizeRecord[]
}
