import { tournaments } from "@/data/tournaments"

function toIcsDate(dateStr: string, timeStr: string): string {
  return dateStr.replace(/-/g, "") + "T" + timeStr.replace(/:/g, "") + "00"
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get("ids")

  if (!idsParam) {
    return new Response("Missing ids parameter", { status: 400 })
  }

  const ids = idsParam.split(",").map(Number).filter((n) => !isNaN(n))
  const planned = tournaments.filter((t) => ids.includes(t.id))

  if (planned.length === 0) {
    return new Response("No matching tournaments", { status: 404 })
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WSOP Planner//wsop.ahillchan.com//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:WSOP 2026 Plan",
    "X-WR-TIMEZONE:America/Los_Angeles",
    // VTIMEZONE for proper timezone handling
    "BEGIN:VTIMEZONE",
    "TZID:America/Los_Angeles",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0800",
    "TZOFFSETTO:-0700",
    "TZNAME:PDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0700",
    "TZOFFSETTO:-0800",
    "TZNAME:PST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ]

  for (const t of planned) {
    const start = toIcsDate(t.date, t.time)
    const startH = parseInt(t.time.split(":")[0], 10)
    const endH = Math.min(startH + 12, 23)
    const endTime = `${String(endH).padStart(2, "0")}:${t.time.split(":")[1]}`
    const end = toIcsDate(t.date, endTime)

    const summary = `#${t.event_number} ${t.name} ($${t.buy_in.toLocaleString()})`
    const desc = [
      `Buy-in: $${t.buy_in.toLocaleString()}`,
      `Format: ${t.format} / ${t.tournament_format}`,
      `Event #${t.event_number}`,
      t.day2_date ? `Day 2: ${t.day2_date}` : "",
      t.event_end_date ? `Final Day: ${t.event_end_date}` : "",
      "",
      "wsop.ahillchan.com",
    ].filter(Boolean).join("\\n")

    lines.push(
      "BEGIN:VEVENT",
      `UID:wsop2026-${t.id}@ahillchan.com`,
      `DTSTART;TZID=America/Los_Angeles:${start}`,
      `DTEND;TZID=America/Los_Angeles:${end}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${desc}`,
      "LOCATION:Paris Las Vegas / Horseshoe Las Vegas",
      "END:VEVENT",
    )

    if (t.day2_date) {
      const d2Start = toIcsDate(t.day2_date, "12:00")
      const d2End = toIcsDate(t.day2_date, "23:00")
      const d2Name = t.name.replace(/- Flight [A-Z]/, "").trim()
      lines.push(
        "BEGIN:VEVENT",
        `UID:wsop2026-${t.id}-d2@ahillchan.com`,
        `DTSTART;TZID=America/Los_Angeles:${d2Start}`,
        `DTEND;TZID=America/Los_Angeles:${d2End}`,
        `SUMMARY:${escapeIcs(`Day 2: #${t.event_number} ${d2Name}`)}`,
        `DESCRIPTION:Day 2 of Event #${t.event_number}`,
        "LOCATION:Paris Las Vegas / Horseshoe Las Vegas",
        "END:VEVENT",
      )
    }
  }

  lines.push("END:VCALENDAR")
  const ics = lines.join("\r\n")

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=wsop-2026-plan.ics",
      "Cache-Control": "no-cache",
    },
  })
}
