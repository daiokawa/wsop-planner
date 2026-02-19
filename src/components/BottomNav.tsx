"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useT } from "@/lib/i18n"

const tabs = [
  { href: "/", labelKey: "nav.plan", icon: "📋" },
  { href: "/tracker", labelKey: "nav.track", icon: "💰" },
  { href: "/stats", labelKey: "nav.stats", icon: "📊" },
  { href: "/browse", labelKey: "nav.browse", icon: "🃏" },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useT()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-felt-border bg-felt-light/95 backdrop-blur-sm safe-bottom">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active
                  ? "text-gold"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{t(tab.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
