import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { tournaments } from "@/data/tournaments"

export const runtime = "edge"

const FORMAT_COLORS: Record<string, string> = {
  NLH: "#2d6a9f",
  PLO: "#2d8a5e",
  "PLO Hi-Lo": "#2d8a7a",
  "5-Card PLO": "#2d8a6a",
  "Big O": "#2d7a8a",
  Mixed: "#9a7b2d",
  HORSE: "#9a7b2d",
  Stud: "#9a5e2d",
  "Stud Hi-Lo": "#9a5e2d",
  Razz: "#9a3d3d",
  "Dealers Choice": "#8a7530",
  Other: "#6a6a6a",
}

type ShareData = {
  b: number
  mn: number
  mx: number
  s: number
  g: string[]
  ds?: string
  de?: string
  t: number[]
  pr: number[]
}

function decodeParam(str: string): ShareData | null {
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) b64 += "="
    const json = decodeURIComponent(escape(atob(b64)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p")
  const data = p ? decodeParam(p) : null

  const eventCount = data ? data.t.length : 0
  const planIds = data?.t ?? []
  const totalBuyIn = planIds.reduce((sum, id) => {
    const t = tournaments.find((tt) => tt.id === id)
    return sum + (t?.buy_in ?? 0)
  }, 0)

  const planTournaments = planIds
    .map((id) => tournaments.find((tt) => tt.id === id))
    .filter(Boolean) as typeof tournaments
  const dates = planTournaments.map((t) => t.date).sort()
  const dateStart = data?.ds || dates[0] || "2026-05-26"
  const dateEnd = data?.de || dates[dates.length - 1] || "2026-07-15"

  const gtCounts = new Map<string, number>()
  for (const t of planTournaments) {
    gtCounts.set(t.format, (gtCounts.get(t.format) || 0) + 1)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "504px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #f7f3ec 0%, #efe9de 40%, #f2ede4 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "32px 120px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "3px",
            background: "linear-gradient(90deg, transparent 0%, #b8962e 30%, #d4b85a 50%, #b8962e 70%, transparent 100%)",
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "32px", fontWeight: "bold", color: "#8a6d1b", letterSpacing: "2px" }}>
            WSOP 2026 PLAN
          </span>
          <span style={{ fontSize: "16px", color: "#b5aa94", letterSpacing: "1px" }}>
            wsop.ahillchan.com
          </span>
        </div>

        {/* Main stats */}
        <div
          style={{
            display: "flex",
            padding: "28px 0 20px",
            gap: "48px",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "72px", fontWeight: "bold", color: "#2a2520", lineHeight: "1" }}>
              {eventCount}
            </span>
            <span style={{ fontSize: "16px", color: "#8a8072", marginTop: "4px", letterSpacing: "2px" }}>
              EVENTS
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "72px", fontWeight: "bold", color: "#8a6d1b", lineHeight: "1" }}>
              ${totalBuyIn.toLocaleString()}
            </span>
            <span style={{ fontSize: "16px", color: "#8a8072", marginTop: "4px", letterSpacing: "2px" }}>
              TOTAL BUY-IN
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: "6px" }}>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#2a2520", lineHeight: "1" }}>
              {dateStart.slice(5).replace("-", "/")} — {dateEnd.slice(5).replace("-", "/")}
            </span>
            <span style={{ fontSize: "16px", color: "#8a8072", marginTop: "4px", letterSpacing: "2px" }}>
              LAS VEGAS
            </span>
          </div>
        </div>

        {/* Game type pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {[...gtCounts.entries()].map(([gt, count]) => (
            <div
              key={gt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: `${FORMAT_COLORS[gt] || "#6a6a6a"}12`,
                border: `1px solid ${FORMAT_COLORS[gt] || "#6a6a6a"}55`,
                borderRadius: "16px",
                padding: "5px 14px",
              }}
            >
              <span style={{ fontSize: "17px", fontWeight: "600", color: FORMAT_COLORS[gt] || "#6a6a6a" }}>
                {gt}
              </span>
              <span style={{ fontSize: "14px", color: "#8a8072" }}>
                ×{count}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
          }}
        >
          <span style={{ fontSize: "14px", color: "#b5aa94", letterSpacing: "0.5px" }}>
            Tap the link to see the full plan & customize your own
          </span>
          <span style={{ fontSize: "24px" }}>🐥</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 504,
    },
  )
}
