"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useT } from "@/lib/i18n"
import { isSupabaseConfigured } from "@/lib/supabase"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Hide entirely if Supabase not configured or user not signed in
  if (!isSupabaseConfigured() || !user) return null

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ""
  const initial = name.charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-felt-border bg-felt-card hover:border-gold-dim transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-xs font-bold text-text-secondary">{initial}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-felt-border bg-felt-card shadow-lg">
          <div className="border-b border-felt-border px-3 py-2">
            <p className="truncate text-xs text-text-primary">{user.email}</p>
            <p className="mt-0.5 text-[10px] text-success">{t("auth.synced")}</p>
          </div>
          <button
            onClick={async () => {
              setOpen(false)
              await signOut()
            }}
            className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-felt-hover hover:text-text-primary transition-colors"
          >
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  )
}
