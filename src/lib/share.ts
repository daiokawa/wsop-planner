// Share data encode/decode — JSON → base64url
import type { UserPreferences, GameFormat } from "@/types"

type ShareData = {
  b: number              // total_budget
  mn: number             // min_single_buyin
  mx: number             // max_single_buyin
  s: number              // policy_slider
  g: GameFormat[]        // game_types
  ds?: string            // date_start
  de?: string            // date_end
  t: number[]            // tournament IDs (plan)
  pr: number[]           // priority IDs
}

export type DecodedShare = {
  prefs: Partial<UserPreferences>
  planIds: number[]
  priorityIds: number[]
}

export function encodeShareData(
  prefs: UserPreferences,
  planIds: number[],
  priorityIds: number[],
): string {
  const data: ShareData = {
    b: prefs.total_budget,
    mn: prefs.min_single_buyin,
    mx: prefs.max_single_buyin,
    s: prefs.policy_slider,
    g: prefs.game_types,
    ...(prefs.date_start ? { ds: prefs.date_start } : {}),
    ...(prefs.date_end ? { de: prefs.date_end } : {}),
    t: planIds,
    pr: priorityIds,
  }
  const json = JSON.stringify(data)
  // base64url: standard base64 with +→- /→_ and no padding
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeShareData(str: string): DecodedShare | null {
  try {
    // Restore standard base64
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) b64 += "="
    const json = decodeURIComponent(escape(atob(b64)))
    const data: ShareData = JSON.parse(json)

    return {
      prefs: {
        total_budget: data.b,
        min_single_buyin: data.mn,
        max_single_buyin: data.mx,
        policy_slider: data.s,
        game_types: data.g,
        ...(data.ds ? { date_start: data.ds } : {}),
        ...(data.de ? { date_end: data.de } : {}),
      },
      planIds: data.t ?? [],
      priorityIds: data.pr ?? [],
    }
  } catch {
    return null
  }
}
