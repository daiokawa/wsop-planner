"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase"
import { migrateLocalToCloud, pullCloudToLocal } from "@/lib/sync"
import { saveCloudSnapshot } from "@/lib/storage"
import type { User } from "@supabase/supabase-js"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  saveToCloud: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  saveToCloud: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const sb = getSupabase()
    if (!sb) {
      setIsLoading(false)
      return
    }

    // Initial session check
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        // Pull cloud data on app startup, then snapshot
        await pullCloudToLocal(session.user.id)
        saveCloudSnapshot()
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      if (event === "SIGNED_IN" && newUser) {
        // Check if user has cloud data already
        const { data: existing } = await sb
          .from("preferences")
          .select("user_id")
          .eq("user_id", newUser.id)
          .maybeSingle()

        if (existing) {
          // Returning user: pull cloud → local
          await pullCloudToLocal(newUser.id)
        } else {
          // First sign-in: push local → cloud
          await migrateLocalToCloud(newUser.id)
        }
        saveCloudSnapshot()
        window.location.reload()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signOut()
    setUser(null)
  }, [])

  // Explicit save: push local → cloud, then update snapshot
  const saveToCloud = useCallback(async () => {
    const sb = getSupabase()
    if (!sb || !user) return
    await migrateLocalToCloud(user.id)
    saveCloudSnapshot()
  }, [user])

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, saveToCloud }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
