import type { Metadata } from "next"
import { HomeClient } from "@/components/HomeClient"
import { tournaments } from "@/data/tournaments"

type ShareData = {
  b: number; t: number[]; g: string[]
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

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const p = typeof params.p === "string" ? params.p : undefined

  if (!p) {
    return {
      title: "WSOP Planner 2026",
      description: "WSOP 2026 Tournament Planner & Tracker",
    }
  }

  const data = decodeParam(p)
  if (!data) {
    return {
      title: "WSOP Planner 2026",
      description: "WSOP 2026 Tournament Planner & Tracker",
    }
  }

  const eventCount = data.t.length
  const totalBuyIn = data.t.reduce((sum, id) => {
    const t = tournaments.find((tt) => tt.id === id)
    return sum + (t?.buy_in ?? 0)
  }, 0)

  const title = `WSOP 2026 — ${eventCount} events · $${totalBuyIn.toLocaleString()}`
  const description = `${eventCount} events, $${totalBuyIn.toLocaleString()} total buy-in. Game types: ${data.g.join(", ")}. Open the link to see the full plan and create your own!`
  const ogImageUrl = `https://wsop.ahillchan.com/api/og?p=${p}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 504 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function Home() {
  return <HomeClient />
}
