// Cloud sync — Supabase CRUD, silent on error
// All functions are async and never throw to the caller.

import { getSupabase } from "@/lib/supabase"
import type { UserPreferences, PlanEntry, BuyInRecord, PrizeRecord } from "@/types"

// ─── Helpers ───

export function getCurrentUserId(): string | null {
  const sb = getSupabase()
  if (!sb) return null
  // Session is stored in localStorage by supabase-js; synchronous access via internal cache
  const raw = typeof window !== "undefined"
    ? localStorage.getItem(`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`)
    : null
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.user?.id ?? null
  } catch {
    return null
  }
}

async function getUserId(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data.user?.id ?? null
}

// ─── Individual sync functions ───

export async function syncPreferences(userId?: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return
    const uid = userId ?? await getUserId()
    if (!uid) return

    const raw = localStorage.getItem("wsop-planner-2026")
    if (!raw) return
    const state = JSON.parse(raw)
    const p: UserPreferences = state.preferences
    if (!p) return

    await sb.from("preferences").upsert({
      user_id: uid,
      total_budget: p.total_budget,
      min_single_buyin: p.min_single_buyin,
      max_single_buyin: p.max_single_buyin,
      policy_slider: p.policy_slider,
      reentry_limit: p.reentry_limit,
      game_types: p.game_types,
      date_start: p.date_start || null,
      date_end: p.date_end || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
  } catch (e) {
    console.warn("[sync] syncPreferences error:", e)
  }
}

export async function syncPlan(userId?: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return
    const uid = userId ?? await getUserId()
    if (!uid) return

    const raw = localStorage.getItem("wsop-planner-2026")
    if (!raw) return
    const plan: PlanEntry[] = JSON.parse(raw).plan ?? []

    // Replace all: delete then insert
    await sb.from("plan_entries").delete().eq("user_id", uid)
    if (plan.length > 0) {
      await sb.from("plan_entries").insert(
        plan.map((e) => ({
          user_id: uid,
          tournament_id: e.tournament_id,
          added_manually: e.added_manually,
          score: e.score ?? null,
        }))
      )
    }
  } catch (e) {
    console.warn("[sync] syncPlan error:", e)
  }
}

export async function syncBuyins(userId?: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return
    const uid = userId ?? await getUserId()
    if (!uid) return

    const raw = localStorage.getItem("wsop-planner-2026")
    if (!raw) return
    const buyins: BuyInRecord[] = JSON.parse(raw).buyins ?? []

    await sb.from("buy_ins").delete().eq("user_id", uid)
    if (buyins.length > 0) {
      await sb.from("buy_ins").insert(
        buyins.map((b) => ({
          user_id: uid,
          tournament_id: b.tournament_id,
          amount: b.amount,
          is_reentry: b.is_reentry,
          created_at: b.created_at,
        }))
      )
    }
  } catch (e) {
    console.warn("[sync] syncBuyins error:", e)
  }
}

export async function syncPrizes(userId?: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return
    const uid = userId ?? await getUserId()
    if (!uid) return

    const raw = localStorage.getItem("wsop-planner-2026")
    if (!raw) return
    const prizes: PrizeRecord[] = JSON.parse(raw).prizes ?? []

    await sb.from("prizes").delete().eq("user_id", uid)
    if (prizes.length > 0) {
      await sb.from("prizes").insert(
        prizes.map((p) => ({
          user_id: uid,
          tournament_id: p.tournament_id,
          amount: p.amount,
          finish_position: p.finish_position ?? null,
          created_at: p.created_at,
        }))
      )
    }
  } catch (e) {
    console.warn("[sync] syncPrizes error:", e)
  }
}

export async function syncPriorities(userId?: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return
    const uid = userId ?? await getUserId()
    if (!uid) return

    const raw = localStorage.getItem("wsop-planner-priorities")
    const ids: number[] = raw ? JSON.parse(raw) : []

    await sb.from("priorities").delete().eq("user_id", uid)
    if (ids.length > 0) {
      await sb.from("priorities").insert(
        ids.map((tid) => ({ user_id: uid, tournament_id: tid }))
      )
    }
  } catch (e) {
    console.warn("[sync] syncPriorities error:", e)
  }
}

// ─── Full migration: localStorage → cloud (first sign-in) ───

export async function migrateLocalToCloud(userId: string): Promise<void> {
  try {
    await Promise.all([
      syncPreferences(userId),
      syncPlan(userId),
      syncBuyins(userId),
      syncPrizes(userId),
      syncPriorities(userId),
    ])
    console.log("[sync] migrateLocalToCloud complete")
  } catch (e) {
    console.warn("[sync] migrateLocalToCloud error:", e)
  }
}

// ─── Pull cloud → localStorage (subsequent sign-in, cloud wins) ───

export async function pullCloudToLocal(userId: string): Promise<void> {
  try {
    const sb = getSupabase()
    if (!sb) return

    const STORAGE_KEY = "wsop-planner-2026"
    const raw = localStorage.getItem(STORAGE_KEY)
    const state = raw ? JSON.parse(raw) : { preferences: {}, plan: [], buyins: [], prizes: [] }

    // Preferences
    const { data: prefRow } = await sb
      .from("preferences")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (prefRow) {
      state.preferences = {
        ...state.preferences,
        total_budget: prefRow.total_budget ?? state.preferences.total_budget,
        min_single_buyin: prefRow.min_single_buyin ?? state.preferences.min_single_buyin,
        max_single_buyin: prefRow.max_single_buyin ?? state.preferences.max_single_buyin,
        policy_slider: prefRow.policy_slider ?? state.preferences.policy_slider,
        reentry_limit: prefRow.reentry_limit ?? state.preferences.reentry_limit,
        game_types: prefRow.game_types ?? state.preferences.game_types,
        date_start: prefRow.date_start ?? state.preferences.date_start,
        date_end: prefRow.date_end ?? state.preferences.date_end,
      }
    }

    // Plan
    const { data: planRows } = await sb
      .from("plan_entries")
      .select("tournament_id, added_manually, score")
      .eq("user_id", userId)

    if (planRows && planRows.length > 0) {
      state.plan = planRows.map((r: { tournament_id: number; added_manually: boolean; score: number | null }) => ({
        tournament_id: r.tournament_id,
        added_manually: r.added_manually,
        score: r.score ?? undefined,
      }))
    }

    // Buyins
    const { data: buyinRows } = await sb
      .from("buy_ins")
      .select("tournament_id, amount, is_reentry, created_at")
      .eq("user_id", userId)

    if (buyinRows && buyinRows.length > 0) {
      state.buyins = buyinRows.map((r: { tournament_id: number; amount: number; is_reentry: boolean; created_at: string }) => ({
        id: crypto.randomUUID(),
        tournament_id: r.tournament_id,
        amount: r.amount,
        is_reentry: r.is_reentry,
        created_at: r.created_at,
      }))
    }

    // Prizes
    const { data: prizeRows } = await sb
      .from("prizes")
      .select("tournament_id, amount, finish_position, created_at")
      .eq("user_id", userId)

    if (prizeRows && prizeRows.length > 0) {
      state.prizes = prizeRows.map((r: { tournament_id: number; amount: number; finish_position: number | null; created_at: string }) => ({
        id: crypto.randomUUID(),
        tournament_id: r.tournament_id,
        amount: r.amount,
        finish_position: r.finish_position ?? undefined,
        created_at: r.created_at,
      }))
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    // Priorities
    const { data: prioRows } = await sb
      .from("priorities")
      .select("tournament_id")
      .eq("user_id", userId)

    if (prioRows && prioRows.length > 0) {
      localStorage.setItem(
        "wsop-planner-priorities",
        JSON.stringify(prioRows.map((r: { tournament_id: number }) => r.tournament_id))
      )
    }

    console.log("[sync] pullCloudToLocal complete")
  } catch (e) {
    console.warn("[sync] pullCloudToLocal error:", e)
  }
}
