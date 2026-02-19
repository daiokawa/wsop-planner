// localStorage wrapper with type safety
import type { AppState, UserPreferences, PlanEntry, BuyInRecord, PrizeRecord } from "@/types"

const STORAGE_KEY = "wsop-planner-2026"
const SNAPSHOT_KEY = "wsop-planner-cloud-snapshot"

const defaultPreferences: UserPreferences = {
  total_budget: 10000,
  min_single_buyin: 0,
  max_single_buyin: 5000,
  policy_slider: 50,
  reentry_limit: 1,
  game_types: ["NLH", "PLO"],
  game_mix: 50,
}

const defaultState: AppState = {
  preferences: defaultPreferences,
  plan: [],
  buyins: [],
  prizes: [],
}

function read(): AppState {
  if (typeof window === "undefined") return defaultState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return {
      ...defaultState,
      ...parsed,
      preferences: { ...defaultPreferences, ...parsed.preferences },
    }
  } catch {
    return defaultState
  }
}

function write(state: AppState): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getState(): AppState {
  return read()
}

export function getPreferences(): UserPreferences {
  return read().preferences
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  const state = read()
  state.preferences = { ...state.preferences, ...prefs }
  write(state)
}

export function getPlan(): PlanEntry[] {
  return read().plan
}

export function addToPlan(tournamentId: number): void {
  const state = read()
  if (state.plan.some((p) => p.tournament_id === tournamentId)) return
  state.plan.push({ tournament_id: tournamentId, added_manually: true })
  write(state)
}

export function removeFromPlan(tournamentId: number): void {
  const state = read()
  state.plan = state.plan.filter((p) => p.tournament_id !== tournamentId)
  write(state)
}

export function setPlan(plan: PlanEntry[]): void {
  const state = read()
  state.plan = plan
  write(state)
}

export function getBuyins(): BuyInRecord[] {
  return read().buyins
}

export function addBuyin(record: Omit<BuyInRecord, "id" | "created_at">): void {
  const state = read()
  state.buyins.push({
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  })
  write(state)
}

export function getPrizes(): PrizeRecord[] {
  return read().prizes
}

export function addPrize(record: Omit<PrizeRecord, "id" | "created_at">): void {
  const state = read()
  state.prizes.push({
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  })
  write(state)
}

export function deleteBuyin(id: string): void {
  const state = read()
  state.buyins = state.buyins.filter((b) => b.id !== id)
  write(state)
}

export function deletePrize(id: string): void {
  const state = read()
  state.prizes = state.prizes.filter((p) => p.id !== id)
  write(state)
}

// Priorities — stored in separate localStorage key
export function getPriorities(): number[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("wsop-planner-priorities")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setPriorities(ids: number[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem("wsop-planner-priorities", JSON.stringify(ids))
}

// --- Cloud snapshot: tracks the last explicitly saved state ---

export function saveCloudSnapshot(): void {
  if (typeof window === "undefined") return
  const state = localStorage.getItem(STORAGE_KEY) ?? ""
  const priorities = localStorage.getItem("wsop-planner-priorities") ?? "[]"
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ state, priorities }))
}

export function hasCloudSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(SNAPSHOT_KEY)
}

export function isCloudDirty(): boolean {
  if (typeof window === "undefined") return false
  const snap = localStorage.getItem(SNAPSHOT_KEY)
  if (!snap) return false
  try {
    const { state, priorities } = JSON.parse(snap)
    const currentState = localStorage.getItem(STORAGE_KEY) ?? ""
    const currentPriorities = localStorage.getItem("wsop-planner-priorities") ?? "[]"
    return state !== currentState || priorities !== currentPriorities
  } catch {
    return false
  }
}

export function restoreCloudSnapshot(): void {
  if (typeof window === "undefined") return
  const snap = localStorage.getItem(SNAPSHOT_KEY)
  if (!snap) return
  try {
    const { state, priorities } = JSON.parse(snap)
    if (state) localStorage.setItem(STORAGE_KEY, state)
    if (priorities) localStorage.setItem("wsop-planner-priorities", priorities)
  } catch {}
}
