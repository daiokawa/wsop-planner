"use client"

import { useState, useMemo, useRef } from "react"
import { useT } from "@/lib/i18n"
import { encodeShareData } from "@/lib/share"
import type { UserPreferences } from "@/types"

type Props = {
  planIds: number[]
  priorityIds: number[]
  prefs: UserPreferences
  totalBuyIn: number
  eventCount: number
  onClose: () => void
}

export function ShareModal({ planIds, priorityIds, prefs, totalBuyIn, eventCount, onClose }: Props) {
  const { t, locale } = useT()
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const shareUrl = useMemo(() => {
    const encoded = encodeShareData(prefs, planIds, priorityIds)
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    return `${origin}/?p=${encoded}`
  }, [prefs, planIds, priorityIds])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Fallback: select + copy
      inputRef.current?.select()
      document.execCommand("copy")
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTweet = () => {
    const tweetText = locale === "ja"
      ? `今年のWSOPはこんな感じで参戦する予定です。\n${eventCount}イベント合計$${totalBuyIn.toLocaleString()}\n#WSOP2026 #poker @daiokawa\n${shareUrl}`
      : locale === "ko"
      ? `올해 WSOP는 이렇게 참전할 예정입니다.\n${eventCount}개 이벤트 합계 $${totalBuyIn.toLocaleString()}\n#WSOP2026 #poker @daiokawa\n${shareUrl}`
      : locale === "zh"
      ? `今年的WSOP打算这样参赛。\n${eventCount}个赛事 合计$${totalBuyIn.toLocaleString()}\n#WSOP2026 #poker @daiokawa\n${shareUrl}`
      : `Here's my WSOP plan for this year.\n${eventCount} events, $${totalBuyIn.toLocaleString()} total\n#WSOP2026 #poker @daiokawa\n${shareUrl}`

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    window.open(url, "_blank", "width=550,height=420")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-felt-border bg-felt-light p-5 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-gold">{t("share.title")}</h2>

        {/* URL field + copy */}
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={inputRef}
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 rounded-lg border border-felt-border bg-felt px-3 py-2 text-xs text-text-primary select-all truncate focus:border-gold-dim focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-gold-dim/30 px-3 py-2 text-xs font-medium text-gold hover:bg-gold-dim/40 transition-colors"
          >
            {copied ? t("share.copied") : t("share.copyUrl")}
          </button>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleTweet}
            className="flex-1 rounded-lg bg-[#1d9bf0]/20 py-2.5 text-sm font-medium text-[#1d9bf0] hover:bg-[#1d9bf0]/30"
          >
            {t("share.tweet")}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-lg bg-felt-card py-2 text-sm text-text-muted hover:bg-felt-hover"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  )
}
