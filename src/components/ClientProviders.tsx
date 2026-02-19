"use client"

import type { ReactNode } from "react"
import { I18nProvider } from "@/lib/i18n"
import { AuthProvider } from "@/lib/auth"
import { LangSwitch } from "@/components/LangSwitch"
import { UserMenu } from "@/components/UserMenu"


export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <div className="fixed top-12 right-3 z-50 flex items-center gap-2">
          <UserMenu />
          <LangSwitch />
        </div>
        {children}
      </AuthProvider>
    </I18nProvider>
  )
}
