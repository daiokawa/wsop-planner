import { NextResponse } from "next/server"
import { tournaments } from "@/data/tournaments"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  let result = [...tournaments]

  const format = searchParams.get("format")
  if (format) {
    result = result.filter((t) => t.format === format)
  }

  const minBuyin = searchParams.get("min_buyin")
  if (minBuyin) {
    result = result.filter((t) => t.buy_in >= Number(minBuyin))
  }

  const maxBuyin = searchParams.get("max_buyin")
  if (maxBuyin) {
    result = result.filter((t) => t.buy_in <= Number(maxBuyin))
  }

  const dateStart = searchParams.get("date_start")
  if (dateStart) {
    result = result.filter((t) => t.date >= dateStart)
  }

  const dateEnd = searchParams.get("date_end")
  if (dateEnd) {
    result = result.filter((t) => t.date <= dateEnd)
  }

  return NextResponse.json({
    count: result.length,
    tournaments: result,
  })
}
