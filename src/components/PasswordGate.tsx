"use client"

import { useState, useEffect, type ReactNode } from "react"

const GATE_KEY = "wsop-planner-gate"
const PASSCODE = "2026"

export function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(GATE_KEY) === "1") setAuthed(true)
  }, [])

  if (authed) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === PASSCODE) {
      sessionStorage.setItem(GATE_KEY, "1")
      setAuthed(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs text-center">
        <h1 className="text-lg font-bold text-[#8a7000]">WSOP 2026 Planner 🐥</h1>
        <p className="mt-2 text-xs text-[#5c5850]">Enter passcode to continue</p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Passcode"
          autoFocus
          className={`mt-4 w-full rounded-lg border px-4 py-3 text-center text-lg tracking-widest focus:outline-none ${
            error
              ? "border-red-400 bg-red-50 animate-shake"
              : "border-[#ddd9ce] bg-white focus:border-[#c9a020]"
          }`}
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-lg bg-[#c9a020]/20 py-2.5 text-sm font-medium text-[#8a7000] hover:bg-[#c9a020]/30"
        >
          Enter
        </button>
      </form>
    </div>
  )
}
