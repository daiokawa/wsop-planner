"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { tournaments } from "@/data/tournaments"
import { TournamentCard, type ConflictInfo } from "@/components/TournamentCard"
import { PolicySlider } from "@/components/PolicySlider"
import { recommend } from "@/lib/recommend"
import { detectConflicts, hasConflict } from "@/lib/conflicts"
import {
  getPreferences, setPreferences, setPlan, removeFromPlan, getPlan, setPriorities,
  restoreCloudSnapshot,
} from "@/lib/storage"
import { AlternativeFlights } from "@/components/AlternativeFlights"
import { CalendarModal } from "@/components/CalendarModal"
import { ShareModal } from "@/components/ShareModal"
import { decodeShareData } from "@/lib/share"
import { useT } from "@/lib/i18n"
import { useAuth } from "@/lib/auth"
import { isSupabaseConfigured } from "@/lib/supabase"
import type { UserPreferences, PlanEntry, GameFormat } from "@/types"

const BUDGET_PRESETS = [5000, 10000, 20000, 50000, 100000, 200000, 300000]
const GAME_OPTS: GameFormat[] = [
  "NLH", "PLO", "PLO Hi-Lo", "5-Card PLO", "Big O", "Mixed",
  "HORSE", "Stud", "Stud Hi-Lo", "Razz", "Dealers Choice", "Other",
]

const SSR_DEFAULTS: UserPreferences = {
  total_budget: 10000,
  min_single_buyin: 0,
  max_single_buyin: 5000,
  policy_slider: 50,
  reentry_limit: 1,
  game_types: ["NLH", "PLO"],
  game_mix: 50,
  include_ladies: false,
  include_seniors: false,
}

function formatMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `$${n}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function HomeClient() {
  const { t, formatDate } = useT()
  const { user, signIn, saveToCloud } = useAuth()
  const [prefs, setPrefs] = useState<UserPreferences>(SSR_DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [cloudDirty, setCloudDirty] = useState(false)
  const [manualRemovals, setManualRemovals] = useState<Set<number>>(new Set())
  const [prioritizedIds, setPrioritizedIds] = useState<Set<number>>(new Set())
  const [showOptions, setShowOptions] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sharedPlanIds, setSharedPlanIds] = useState<number[] | null>(null)
  const [swappedFlights, setSwappedFlights] = useState<Map<number, number>>(new Map())
  const [dateMode, setDateMode] = useState<"dates" | "days">("dates")
  const [stayDays, setStayDays] = useState(10)
  const [manualAdditions, setManualAdditions] = useState<Set<number>>(new Set())

  // Group tournaments by flight_group
  const flightGroupMap = useMemo(() => {
    const map = new Map<number, typeof tournaments>()
    for (const t of tournaments) {
      if (t.flight_group) {
        const arr = map.get(t.flight_group) || []
        arr.push(t)
        map.set(t.flight_group, arr)
      }
    }
    return map
  }, [])

  // Hydrate from localStorage (or shared URL) after mount
  useEffect(() => {
    // Check for shared plan in URL
    const params = new URLSearchParams(window.location.search)
    const shareParam = params.get("p")
    if (shareParam) {
      const decoded = decodeShareData(shareParam)
      if (decoded) {
        const shared: UserPreferences = {
          ...SSR_DEFAULTS,
          ...decoded.prefs,
        }
        setPrefs(shared)
        setPreferences(shared)
        setPrioritizedIds(new Set(decoded.priorityIds))
        setPriorities(decoded.priorityIds)
        setSharedPlanIds(decoded.planIds)
        setManualRemovals(new Set())
        // Remove ?p= from URL without reload
        window.history.replaceState({}, "", window.location.pathname)
        setMounted(true)
        return
      }
    }
    // Normal: load from localStorage
    setPrefs(getPreferences())
    try {
      const raw = localStorage.getItem("wsop-planner-priorities")
      if (raw) setPrioritizedIds(new Set(JSON.parse(raw)))
    } catch {}
    // Load manually added events from Browse page
    const existing = getPlan()
    const manualIds = existing.filter((e) => e.added_manually).map((e) => e.tournament_id)
    if (manualIds.length > 0) setManualAdditions(new Set(manualIds))
    setMounted(true)
  }, [])

  // Persist preferences
  const updatePref = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      setPreferences(next)
      return next
    })
    // Reset manual removals when prefs change — fresh recommendation
    setManualRemovals(new Set())
    setSwappedFlights(new Map())
    // Clear shared plan so recommend() takes over
    setSharedPlanIds(null)
    if (user) setCloudDirty(true)
  }, [user])

  const toggleGameType = useCallback((gt: GameFormat) => {
    setPrefs((p) => {
      const types = p.game_types.includes(gt)
        ? p.game_types.filter((g) => g !== gt)
        : [...p.game_types, gt]
      const next = { ...p, game_types: types }
      setPreferences(next)
      return next
    })
    setManualRemovals(new Set())
    setSwappedFlights(new Map())
    setSharedPlanIds(null)
    if (user) setCloudDirty(true)
  }, [user])

  // Sliding window: find the best N-day window within WSOP period
  const bestWindow = useMemo(() => {
    if (dateMode !== "days") return null
    const WSOP_START = "2026-05-26"
    const WSOP_END = "2026-07-15"
    const startMs = new Date(WSOP_START + "T00:00:00").getTime()
    const endMs = new Date(WSOP_END + "T00:00:00").getTime()
    const totalDays = Math.round((endMs - startMs) / 86400000) + 1
    const days = Math.max(1, Math.min(stayDays, totalDays))
    const windowCount = totalDays - days + 1

    let best = { start: WSOP_START, end: addDays(WSOP_START, days - 1), count: 0, totalScore: 0 }

    for (let i = 0; i < windowCount; i++) {
      const wStart = addDays(WSOP_START, i)
      const wEnd = addDays(WSOP_START, i + days - 1)
      const result = recommend(tournaments, { ...prefs, date_start: wStart, date_end: wEnd })
      const totalScore = result.reduce((s, e) => s + (e.score || 0), 0)
      if (result.length > best.count || (result.length === best.count && totalScore > best.totalScore)) {
        best = { start: wStart, end: wEnd, count: result.length, totalScore }
      }
    }

    return best
  }, [dateMode, stayDays, prefs])

  // Auto-recommend: recalculate whenever prefs, removals, priorities, or swaps change
  const plan = useMemo(() => {
    // If shared plan is active, use it directly instead of recommend()
    if (sharedPlanIds) {
      return sharedPlanIds.map((id) => ({ tournament_id: id, added_manually: false }))
    }
    const effectivePrefs = bestWindow
      ? { ...prefs, date_start: bestWindow.start, date_end: bestWindow.end }
      : prefs
    const all = recommend(tournaments, effectivePrefs)
    let filtered = all.filter((e) => !manualRemovals.has(e.tournament_id))

    // Apply flight swaps: replace recommended flight with user-chosen one
    if (swappedFlights.size > 0) {
      filtered = filtered.map((entry) => {
        const t = tournaments.find((tt) => tt.id === entry.tournament_id)
        if (!t?.flight_group) return entry
        const swapId = swappedFlights.get(t.flight_group)
        if (swapId && swapId !== entry.tournament_id) {
          return { ...entry, tournament_id: swapId }
        }
        return entry
      })
    }

    // Resolve conflicts: prioritized tournaments win over non-prioritized ones
    const plannedTs = filtered
      .map((e) => tournaments.find((tt) => tt.id === e.tournament_id)!)
      .filter(Boolean)
    const rawConflicts = detectConflicts(plannedTs, tournaments)

    const toRemove = new Set<number>()
    for (const c of rawConflicts) {
      const isPrioA = prioritizedIds.has(c.tournament_id)
      const isPrioB = prioritizedIds.has(c.conflicting_with)
      if (isPrioA && !isPrioB) toRemove.add(c.conflicting_with)
      else if (isPrioB && !isPrioA) toRemove.add(c.tournament_id)
    }

    if (toRemove.size > 0) {
      filtered = filtered.filter((e) => !toRemove.has(e.tournament_id))
    }

    // Append manually added events from Browse page
    const recommendedIds = new Set(filtered.map((e) => e.tournament_id))
    const manualEntries = [...manualAdditions]
      .filter((id) => !recommendedIds.has(id) && !manualRemovals.has(id))
      .map((id) => ({ tournament_id: id, added_manually: true }))

    return [...filtered, ...manualEntries]
  }, [prefs, manualRemovals, prioritizedIds, sharedPlanIds, swappedFlights, bestWindow, manualAdditions])

  // Persist plan to storage only after client hydration
  useEffect(() => {
    if (mounted) setPlan(plan)
  }, [plan, mounted])

  // Resolved tournament objects
  const plannedTournaments = useMemo(
    () => plan.map((e) => tournaments.find((t) => t.id === e.tournament_id)!).filter(Boolean),
    [plan]
  )

  const conflicts = useMemo(
    () => detectConflicts(plannedTournaments, tournaments),
    [plannedTournaments]
  )

  // Build per-tournament conflict info for navigation
  const conflictMap = useMemo(() => {
    const map = new Map<number, ConflictInfo[]>()
    for (const c of conflicts) {
      const from = tournaments.find((t) => t.id === c.tournament_id)
      const to = tournaments.find((t) => t.id === c.conflicting_with)
      if (!from || !to) continue
      // tournament_id's Day2+ conflicts with conflicting_with's Day1
      const addInfo = (tid: number, other: typeof from) => {
        const arr = map.get(tid) || []
        if (!arr.some((x) => x.withId === other.id)) {
          arr.push({ withId: other.id, withEventNumber: other.event_number, withName: other.name })
        }
        map.set(tid, arr)
      }
      addInfo(c.tournament_id, to)
      addInfo(c.conflicting_with, from)
    }
    return map
  }, [conflicts])

  const totalBuyIn = useMemo(
    () => plannedTournaments.reduce((s, t) => s + t.buy_in, 0),
    [plannedTournaments]
  )

  const sorted = useMemo(
    () => [...plannedTournaments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [plannedTournaments]
  )

  const handleSwapFlight = useCallback((altId: number) => {
    const alt = tournaments.find((t) => t.id === altId)
    if (!alt?.flight_group) return
    setSwappedFlights((prev) => {
      const next = new Map(prev)
      next.set(alt.flight_group!, altId)
      return next
    })
    if (user) setCloudDirty(true)
  }, [user])

  const handleTogglePriority = useCallback((id: number) => {
    setPrioritizedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setPriorities([...next])
      return next
    })
    if (user) setCloudDirty(true)
  }, [user])

  const handleRemove = useCallback((id: number) => {
    // If viewing a shared plan, convert to local mode first
    setSharedPlanIds((prev) => {
      if (!prev) return null
      const next = prev.filter((tid) => tid !== id)
      return next.length > 0 ? next : null
    })
    setManualRemovals((prev) => new Set(prev).add(id))
    // Also clear priority for the removed tournament
    setPrioritizedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      setPriorities([...next])
      return next
    })
    if (user) setCloudDirty(true)
  }, [user])

  const budgetPct = prefs.total_budget > 0 ? (totalBuyIn / prefs.total_budget) * 100 : 0

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-24">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold text-gold">{t("plan.heading")}</h1>
        <a
          href="https://x.com/daiokawa"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-text-muted hover:text-gold transition-colors leading-tight text-right"
        >
          {t("plan.featureReq")}<br />
          <span className="underline">@daiokawa</span>
        </a>
      </div>

      {/* Budget */}
      <section className="mt-4">
        <label className="text-xs font-medium text-text-secondary">{t("plan.budget")}</label>
        <div className="mt-1.5 flex gap-2">
          {BUDGET_PRESETS.map((b) => (
            <button
              key={b}
              onClick={() => updatePref({ total_budget: b })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                prefs.total_budget === b
                  ? "bg-gold-dim/30 text-gold"
                  : "bg-felt-card text-text-muted hover:text-text-secondary"
              }`}
            >
              {formatMoney(b)}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={prefs.total_budget}
          onChange={(e) => updatePref({ total_budget: Number(e.target.value) || 0 })}
          className="mt-2 w-full rounded border border-felt-border bg-felt px-3 py-2 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
          placeholder={t("plan.customBudget")}
        />
      </section>

      {/* Dates */}
      <section className="mt-4">
        <label className="text-xs font-medium text-text-secondary">{t("plan.dates")}</label>
        {dateMode === "dates" ? (
          <>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="date"
                value={prefs.date_start || "2026-05-26"}
                onChange={(e) => updatePref({ date_start: e.target.value })}
                className="flex-1 rounded border border-felt-border bg-felt px-2 py-1.5 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
              />
              <span className="text-xs text-text-muted">&rarr;</span>
              <input
                type="date"
                value={prefs.date_end || "2026-07-15"}
                onChange={(e) => updatePref({ date_end: e.target.value })}
                className="flex-1 rounded border border-felt-border bg-felt px-2 py-1.5 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
              />
            </div>
            <button
              onClick={() => { setDateMode("days"); setManualRemovals(new Set()); setSwappedFlights(new Map()); setSharedPlanIds(null) }}
              className="mt-2 rounded-md bg-felt-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors"
            >
              {t("plan.daysMode")}
            </button>
          </>
        ) : (
          <>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-xs text-text-muted">{t("plan.stayDays")}</span>
              <input
                type="number"
                min={1}
                max={51}
                value={stayDays}
                onChange={(e) => {
                  setStayDays(Math.max(1, Math.min(51, Number(e.target.value) || 1)))
                  setManualRemovals(new Set())
                  setSwappedFlights(new Map())
                  setSharedPlanIds(null)
                }}
                className="w-20 rounded border border-felt-border bg-felt px-2 py-1.5 text-sm text-text-primary text-center focus:border-gold-dim focus:outline-none"
              />
              <button
                onClick={() => {
                  const WSOP_START = "2026-05-26"
                  const WSOP_END = "2026-07-15"
                  const startMs = new Date(WSOP_START + "T00:00:00").getTime()
                  const endMs = new Date(WSOP_END + "T00:00:00").getTime()
                  const totalDays = Math.round((endMs - startMs) / 86400000) + 1
                  const candidates = [3, 5, 7, 10, 14, 21, 30].filter((d) => d <= totalDays)
                  let bestDays = candidates[0]
                  let bestDensity = 0
                  for (const days of candidates) {
                    const windowCount = totalDays - days + 1
                    let maxCount = 0
                    for (let i = 0; i < windowCount; i++) {
                      const wStart = addDays(WSOP_START, i)
                      const wEnd = addDays(WSOP_START, i + days - 1)
                      const result = recommend(tournaments, { ...prefs, date_start: wStart, date_end: wEnd })
                      if (result.length > maxCount) maxCount = result.length
                    }
                    const density = maxCount / days
                    if (density > bestDensity) {
                      bestDensity = density
                      bestDays = days
                    }
                  }
                  setStayDays(bestDays)
                  setManualRemovals(new Set())
                  setSwappedFlights(new Map())
                  setSharedPlanIds(null)
                }}
                className="rounded-md bg-gold-dim/30 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold-dim/40 transition-colors"
              >
                {t("plan.autoDays")}
              </button>
            </div>
            {bestWindow && bestWindow.count > 0 && (
              <p className="mt-1.5 text-xs text-success">
                {t("plan.bestWindow", {
                  start: formatDate(bestWindow.start, { month: "short", day: "numeric" }),
                  end: formatDate(bestWindow.end, { month: "short", day: "numeric" }),
                  count: bestWindow.count,
                })}
              </p>
            )}
            <button
              onClick={() => { setDateMode("dates"); setManualRemovals(new Set()); setSwappedFlights(new Map()); setSharedPlanIds(null) }}
              className="mt-2 rounded-md bg-felt-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors"
            >
              {t("plan.datesMode")}
            </button>
          </>
        )}
      </section>

      {/* Game types */}
      <section className="mt-4">
        <label className="text-xs font-medium text-text-secondary">{t("plan.gameTypes")}</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {GAME_OPTS.map((gt) => (
            <button
              key={gt}
              onClick={() => toggleGameType(gt)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                prefs.game_types.includes(gt)
                  ? "bg-gold-dim/30 text-gold"
                  : "bg-felt text-text-muted hover:text-text-secondary"
              }`}
            >
              {gt}
            </button>
          ))}
        </div>
      </section>

      {/* Ladies / Seniors filter */}
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!prefs.include_ladies}
            onChange={(e) => updatePref({ include_ladies: e.target.checked })}
            className="accent-gold"
          />
          {t("plan.includeLadies")}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={!!prefs.include_seniors}
            onChange={(e) => updatePref({ include_seniors: e.target.checked })}
            className="accent-gold"
          />
          {t("plan.includeSeniors")}
        </label>
      </div>

      {/* More options toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="mt-4 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <span className={`transition-transform ${showOptions ? "rotate-90" : ""}`}>&#9654;</span>
        {t("plan.moreOptions")}
      </button>

      {showOptions && (
        <div className="mt-2 space-y-4 rounded-lg border border-felt-border bg-felt-card p-4">
          {/* Policy slider */}
          <PolicySlider
            value={prefs.policy_slider}
            onChange={(v) => updatePref({ policy_slider: v })}
          />

          {/* Game Mix slider — only show when NLH + at least one other type selected */}
          {prefs.game_types.includes("NLH") && prefs.game_types.length > 1 && (
            <div>
              <label className="text-xs font-medium text-text-secondary">{t("gamemix.title")}</label>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[10px] text-text-muted whitespace-nowrap">{t("gamemix.nlh")}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={prefs.game_mix}
                  onChange={(e) => updatePref({ game_mix: Number(e.target.value) })}
                  className="flex-1 accent-gold"
                />
                <span className="text-[10px] text-text-muted whitespace-nowrap">{t("gamemix.mixed")}</span>
              </div>
            </div>
          )}

          {/* Buy-in range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-secondary">{t("plan.minBuyin")}</label>
              <input
                type="number"
                step={100}
                min={0}
                value={prefs.min_single_buyin}
                onChange={(e) => updatePref({ min_single_buyin: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded border border-felt-border bg-felt px-2 py-1.5 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-secondary">{t("plan.maxBuyin")}</label>
              <input
                type="number"
                step={100}
                min={0}
                value={prefs.max_single_buyin}
                onChange={(e) => updatePref({ max_single_buyin: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded border border-felt-border bg-felt px-2 py-1.5 text-sm text-text-primary focus:border-gold-dim focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <div className="mt-6 border-t border-felt-border pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-text-primary">
            {t("plan.yourPlan", { count: plan.length, s: plan.length !== 1 ? "s" : "" })}
          </h2>
          <span className="text-xs text-text-secondary">
            ${totalBuyIn.toLocaleString()} / ${prefs.total_budget.toLocaleString()}
          </span>
        </div>

        {/* Budget bar */}
        <div className="mt-2 h-2 rounded-full bg-felt-card">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPct > 100 ? "bg-danger" : budgetPct > 80 ? "bg-gold" : "bg-success"
            }`}
            style={{ width: `${Math.min(budgetPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger-dim/10 px-3 py-2">
          <p className="text-xs text-danger">
            {t("plan.conflicts")}
          </p>
        </div>
      )}

      {/* Tournament cards */}
      <div className="mt-3 space-y-2">
        {sorted.map((t) => {
          const alts = t.flight_group
            ? (flightGroupMap.get(t.flight_group) || []).filter((a) => a.id !== t.id)
            : []
          return (
            <div key={t.id}>
              <TournamentCard
                tournament={t}
                inPlan
                onTogglePlan={handleRemove}
                onTogglePriority={handleTogglePriority}
                isPrioritized={prioritizedIds.has(t.id)}
                conflict={hasConflict(t.id, conflicts)}
                conflictInfo={conflictMap.get(t.id)}
              />
              {alts.length > 0 && (
                <AlternativeFlights alternatives={alts} onSwap={handleSwapFlight} />
              )}
            </div>
          )
        })}
        {plan.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">{t("plan.noEvents")}</p>
            <p className="mt-1 text-xs text-text-muted">
              {t("plan.adjustHint")}
            </p>
          </div>
        )}
      </div>

      {/* Share + Save + Browse */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {plan.length > 0 && (
          <>
            <button
              onClick={() => setShowShare(true)}
              className="rounded-md bg-gold-dim/30 px-4 py-2 text-xs font-medium text-gold hover:bg-gold-dim/40 transition-colors whitespace-nowrap"
            >
              {t("plan.share")}
            </button>
            <button
              onClick={() => setShowCalendar(true)}
              className="rounded-md bg-gold-dim/30 px-4 py-2 text-xs font-medium text-gold hover:bg-gold-dim/40 transition-colors whitespace-nowrap"
            >
              {t("plan.calendar")}
            </button>
          </>
        )}
        {plan.length > 0 && isSupabaseConfigured() && (
          user ? (
            cloudDirty ? (
              <>
                <button
                  onClick={async () => {
                    if (!window.confirm(t("auth.confirmOverwrite"))) return
                    setSaving(true)
                    await saveToCloud()
                    setSaving(false)
                    setCloudDirty(false)
                  }}
                  disabled={saving}
                  className="rounded-md bg-gold-dim/30 px-3 py-2 text-xs font-medium text-gold hover:bg-gold-dim/40 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {saving ? "..." : t("auth.savePlan")}
                </button>
                <button
                  onClick={() => {
                    restoreCloudSnapshot()
                    window.location.reload()
                  }}
                  className="rounded-md bg-felt-card px-3 py-2 text-xs font-medium text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  {t("auth.loadSaved")}
                </button>
              </>
            ) : (
              <span className="rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success whitespace-nowrap">
                {t("auth.saved")} &#10003;
              </span>
            )
          ) : (
            <button
              onClick={signIn}
              className="rounded-md bg-felt-card px-3 py-2 text-xs font-medium text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors whitespace-nowrap"
              title={t("auth.savePlanHint")}
            >
              {t("auth.savePlan")}
            </button>
          )
        )}
        <Link
          href="/browse"
          className="inline-block rounded-md bg-felt-card px-4 py-2 text-xs font-medium text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors whitespace-nowrap"
        >
          {t("plan.browseAll", { count: tournaments.length })} &rarr;
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 border-t border-felt-border pt-4 pb-2 space-y-2">
        <p className="text-[10px] leading-relaxed text-text-muted">{t("disclaimer.unofficial")}</p>
        <p className="text-[10px] leading-relaxed text-text-muted">{t("disclaimer.noLiability")}</p>
        <p className="text-[10px] leading-relaxed text-text-muted">{t("disclaimer.gambling")}</p>
      </div>

      {/* Calendar modal */}
      {showCalendar && (
        <CalendarModal
          tournaments={plannedTournaments}
          budget={prefs.total_budget}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          planIds={plan.map((e) => e.tournament_id)}
          priorityIds={[...prioritizedIds]}
          prefs={prefs}
          totalBuyIn={totalBuyIn}
          eventCount={plan.length}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
