"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

// --- Locale type ---
export type Locale = "en" | "ja" | "ko" | "zh"

const STORAGE_KEY = "wsop-planner-locale"

// --- Translation dictionary ---
const dict: Record<string, Record<Locale, string>> = {
  // Plan page
  "plan.heading":       { en: "WSOP 2026 Planner 🐥", ja: "WSOP 2026 プランナー🐥", ko: "WSOP 2026 플래너🐥", zh: "WSOP 2026 计划器🐥" },
  "plan.budget":        { en: "Budget", ja: "バイイン予算を選んでください。", ko: "바이인 예산을 선택하세요.", zh: "请选择买入预算。" },
  "plan.customBudget":  { en: "Custom budget", ja: "カスタム予算", ko: "맞춤 예산", zh: "自定义预算" },
  "plan.dates":         { en: "Dates in Vegas", ja: "ラスベガス滞在期間", ko: "라스베가스 일정", zh: "拉斯维加斯日期" },
  "plan.moreOptions":   { en: "More options", ja: "詳細設定", ko: "추가 설정", zh: "更多选项" },
  "plan.gameTypes":     { en: "Game Types", ja: "ゲームタイプ", ko: "게임 유형", zh: "游戏类型" },
  "plan.minBuyin":      { en: "Min Buy-in ($)", ja: "最小バイイン ($)", ko: "최소 바이인 ($)", zh: "最低买入 ($)" },
  "plan.maxBuyin":      { en: "Max Buy-in ($)", ja: "最大バイイン ($)", ko: "최대 바이인 ($)", zh: "最高买入 ($)" },
  "plan.yourPlan":      { en: "Your Plan: {count} event{s}", ja: "プラン: {count}イベント", ko: "플랜: {count}개 이벤트", zh: "计划: {count}个赛事" },
  "plan.conflicts":     { en: "Advancing in a tournament? Red ones overlap! 🐥", ja: "勝ち進むと出られないイベントは赤くなってるよ！🐥", ko: "승리하면 못 나가는 이벤트가 빨간색이야! 🐥", zh: "晋级后冲突的赛事标红啦！🐥" },
  "plan.noEvents":      { en: "No matching events found", ja: "該当するイベントがありません", ko: "일치하는 이벤트 없음", zh: "未找到匹配的赛事" },
  "plan.adjustHint":    { en: "Try adjusting your budget, dates, or game types", ja: "予算・日程・ゲームタイプを調整してみてください", ko: "예산, 일정, 게임 유형을 조정해 보세요", zh: "请尝试调整预算、日期或游戏类型" },
  "plan.browseAll":     { en: "Browse All {count} Events", ja: "全{count}イベントを見る", ko: "전체 {count}개 이벤트 보기", zh: "浏览全部{count}个赛事" },

  // Browse page
  "browse.heading":     { en: "WSOP 2026", ja: "WSOP 2026", ko: "WSOP 2026", zh: "WSOP 2026" },
  "browse.eventCount":  { en: "{count} events", ja: "{count}イベント", ko: "{count}개 이벤트", zh: "{count}个赛事" },
  "browse.planned":     { en: "{count} planned", ja: "{count}件選択中", ko: "{count}개 선택됨", zh: "已选{count}个" },
  "browse.noMatch":     { en: "No events match your filters", ja: "フィルタに一致するイベントがありません", ko: "필터에 일치하는 이벤트 없음", zh: "没有匹配过滤条件的赛事" },

  // Tracker page
  "tracker.heading":    { en: "Tracker", ja: "トラッカー", ko: "트래커", zh: "追踪器" },
  "tracker.spent":      { en: "Spent", ja: "支出", ko: "지출", zh: "支出" },
  "tracker.won":        { en: "Won", ja: "獲得", ko: "획득", zh: "奖金" },
  "tracker.net":        { en: "Net", ja: "損益", ko: "순이익", zh: "净额" },
  "tracker.noEvents":   { en: "No planned events yet", ja: "イベントが未登録です", ko: "등록된 이벤트 없음", zh: "尚未添加赛事" },
  "tracker.addHint":    { en: "Add events from Browse or Plan", ja: "BrowseまたはPlanから追加", ko: "Browse 또는 Plan에서 추가하세요", zh: "从Browse或Plan添加赛事" },
  "tracker.buyIn":      { en: "Buy In", ja: "バイイン", ko: "바이인", zh: "买入" },
  "tracker.cashed":     { en: "Cashed", ja: "入賞", ko: "캐시", zh: "兑奖" },

  // Stats page
  "stats.heading":      { en: "Stats", ja: "統計", ko: "통계", zh: "统计" },
  "stats.spent":        { en: "Spent", ja: "支出", ko: "지출", zh: "支出" },
  "stats.won":          { en: "Won", ja: "獲得", ko: "획득", zh: "奖金" },
  "stats.net":          { en: "Net", ja: "損益", ko: "순이익", zh: "净额" },
  "stats.events":       { en: "Events", ja: "参加数", ko: "이벤트", zh: "赛事数" },
  "stats.cashed":       { en: "Cashed", ja: "入賞", ko: "입상", zh: "兑奖" },
  "stats.itm":          { en: "ITM", ja: "ITM", ko: "ITM", zh: "ITM" },
  "stats.runningPnl":   { en: "Running P&L", ja: "累計損益", ko: "누적 손익", zh: "累计盈亏" },
  "stats.byGameType":   { en: "By Game Type", ja: "ゲームタイプ別", ko: "게임 유형별", zh: "按游戏类型" },
  "stats.detail":       { en: "Tournament Detail", ja: "トーナメント詳細", ko: "토너먼트 상세", zh: "锦标赛详情" },
  "stats.noData":       { en: "No data recorded yet", ja: "まだデータがありません", ko: "기록된 데이터 없음", zh: "尚无记录数据" },
  "stats.useTracker":   { en: "Use the Tracker to record buy-ins and prizes", ja: "トラッカーでバイインと賞金を記録", ko: "트래커에서 바이인과 상금을 기록하세요", zh: "使用追踪器记录买入和奖金" },

  // Nav
  "nav.plan":           { en: "Plan", ja: "計画する", ko: "플랜", zh: "计划" },
  "nav.browse":         { en: "Browse", ja: "全試合", ko: "전체", zh: "全部赛事" },
  "nav.track":          { en: "Track", ja: "収支記録", ko: "수지기록", zh: "收支记录" },
  "nav.stats":          { en: "Stats", ja: "戦績", ko: "전적", zh: "战绩" },

  // TournamentCard
  "card.remove":        { en: "Remove", ja: "候補から外す", ko: "제외", zh: "移除" },
  "card.addPlan":       { en: "+ Plan", ja: "+ 追加", ko: "+ 추가", zh: "+ 添加" },
  "card.prioritize":    { en: "Priority", ja: "優先したい", ko: "우선", zh: "优先" },
  "card.prioritized":   { en: "Priority ★", ja: "優先中 ★", ko: "우선 중 ★", zh: "已优先 ★" },
  "card.day2":          { en: "Day 2: {date}", ja: "Day 2: {date}", ko: "Day 2: {date}", zh: "Day 2: {date}" },
  "card.final":         { en: "Final: {date}", ja: "最終日: {date}", ko: "파이널: {date}", zh: "决赛日: {date}" },
  "card.day2Conflict":  { en: "Day 2 conflict detected", ja: "Day 2 スケジュール競合", ko: "Day 2 일정 충돌 감지", zh: "Day 2 日程冲突" },
  "card.entries":       { en: "{count} entries (2025)", ja: "{count}エントリー (2025)", ko: "{count}명 참가 (2025)", zh: "{count}人参赛 (2025)" },
  "card.gtd":           { en: "GTD ${amount}M", ja: "GTD ${amount}M", ko: "GTD ${amount}M", zh: "GTD ${amount}M" },

  // PolicySlider
  "policy.title":       { en: "Investment Policy", ja: "投資方針", ko: "투자 방침", zh: "投资策略" },
  "policy.conservative":{ en: "Conservative", ja: "保守的", ko: "보수적", zh: "保守" },
  "policy.balanced":    { en: "Balanced", ja: "バランス型", ko: "균형형", zh: "均衡" },
  "policy.aggressive":  { en: "Aggressive", ja: "積極的", ko: "적극적", zh: "激进" },
  "policy.safe":        { en: "Play more events!", ja: "できるだけたくさん出たい！", ko: "최대한 많이 참가!", zh: "尽量多参赛！" },
  "policy.risky":       { en: "Go big or go home!", ja: "高額トーナメントに絞る！", ko: "고액 토너먼트에 집중!", zh: "专攻高额赛事！" },

  // Game Mix
  "gamemix.title":      { en: "Game Mix", ja: "ゲームミックス", ko: "게임 믹스", zh: "游戏组合" },
  "gamemix.nlh":        { en: "NLH focus", ja: "NLH重視", ko: "NLH 중심", zh: "NLH为主" },
  "gamemix.mixed":      { en: "Mixed games!", ja: "色んなゲーム出たい！", ko: "다양한 게임!", zh: "多种游戏！" },

  // FilterPanel
  "filter.search":      { en: "Search events...", ja: "イベントを検索...", ko: "이벤트 검색...", zh: "搜索赛事..." },
  "filter.gameTypes":   { en: "Game Types", ja: "ゲームタイプ", ko: "게임 유형", zh: "游戏类型" },
  "filter.clear":       { en: "Clear", ja: "クリア", ko: "초기화", zh: "清除" },
  "filter.all":         { en: "All", ja: "すべて", ko: "전체", zh: "全部" },

  // BuyInModal
  "buyin.title":        { en: "Record Buy-In", ja: "バイインを記録", ko: "바이인 기록", zh: "记录买入" },
  "buyin.amount":       { en: "Amount ($)", ja: "金額 ($)", ko: "금액 ($)", zh: "金额 ($)" },
  "buyin.reentry":      { en: "Re-entry", ja: "リエントリー", ko: "리엔트리", zh: "重新买入" },
  "buyin.submit":       { en: "Buy In", ja: "バイイン", ko: "바이인", zh: "买入" },

  // PrizeModal
  "prize.title":        { en: "Cashed!", ja: "入賞！", ko: "캐시!", zh: "兑奖!" },
  "prize.amount":       { en: "Prize Amount ($)", ja: "賞金額 ($)", ko: "상금 ($)", zh: "奖金金额 ($)" },
  "prize.position":     { en: "Finish Position (optional)", ja: "順位（任意）", ko: "순위 (선택)", zh: "最终名次（可选）" },
  "prize.submit":       { en: "Record", ja: "記録", ko: "기록", zh: "记录" },

  // ShareModal
  "share.title":        { en: "Share Your Plan", ja: "プランをシェア", ko: "플랜 공유", zh: "分享计划" },
  "share.copyUrl":      { en: "Copy", ja: "コピー", ko: "복사", zh: "复制" },
  "share.copied":       { en: "Copied!", ja: "コピーしました", ko: "복사됨!", zh: "已复制!" },
  "share.tweet":        { en: "Post to X", ja: "Xに投稿", ko: "X에 게시", zh: "发布到X" },
  "plan.share":         { en: "Share Plan", ja: "プランをシェア", ko: "플랜 공유", zh: "分享计划" },
  "plan.featureReq":    { en: "Feature requests:", ja: "機能追加リクエストは", ko: "기능 요청:", zh: "功能建议:" },

  // Disclaimer
  "disclaimer.unofficial": {
    en: "This is an unofficial fan-made tool and is not affiliated with, endorsed by, or connected to the World Series of Poker (WSOP) or Caesars Entertainment in any way.",
    ja: "本ツールはファンが個人的に制作した非公式ツールであり、World Series of Poker (WSOP) および Caesars Entertainment とは一切関係ありません。",
    ko: "본 도구는 팬이 개인적으로 제작한 비공식 도구이며, World Series of Poker (WSOP) 및 Caesars Entertainment와 일체 관련이 없습니다.",
    zh: "本工具为粉丝个人制作的非官方工具，与 World Series of Poker (WSOP) 及 Caesars Entertainment 无任何关联。",
  },
  "disclaimer.noLiability": {
    en: "The developer assumes no responsibility for any losses, damages, or disadvantages arising from the use of this tool. All tournament information is based on publicly available data and may contain errors. Always verify with official WSOP sources before making decisions.",
    ja: "本ツールの利用により生じたいかなる損失・損害・不利益についても、開発者は一切の責任を負いません。トーナメント情報は公開情報に基づいており、誤りを含む場合があります。意思決定の際は必ずWSOP公式情報をご確認ください。",
    ko: "본 도구의 사용으로 인해 발생하는 어떠한 손실, 손해, 불이익에 대해서도 개발자는 일체의 책임을 지지 않습니다. 토너먼트 정보는 공개 데이터에 기반하며 오류가 포함될 수 있습니다. 결정 시 반드시 WSOP 공식 정보를 확인하세요.",
    zh: "因使用本工具而产生的任何损失、损害或不利后果，开发者概不承担任何责任。赛事信息基于公开数据，可能存在误差。做出决定前请务必核实 WSOP 官方信息。",
  },
  "disclaimer.gambling": {
    en: "Gambling involves risk and can be addictive. Please play responsibly and within your means. If you or someone you know has a gambling problem, contact the National Council on Problem Gambling (1-800-522-4700) or visit www.ncpgambling.org.",
    ja: "ギャンブルにはリスクが伴い、依存症になる可能性があります。責任を持って、無理のない範囲でプレーしてください。",
    ko: "도박에는 위험이 따르며 중독될 수 있습니다. 책임감 있게, 감당할 수 있는 범위 내에서 플레이하세요. 도박 문제 상담: 한국도박문제관리센터 (1336).",
    zh: "赌博存在风险且可能导致成瘾。请理性参与，量力而行。如果您或您认识的人有赌博问题，请联系当地相关帮助热线寻求援助。",
  },

  // Auth
  "auth.signOut":       { en: "Sign out", ja: "ログアウト", ko: "로그아웃", zh: "退出登录" },
  "auth.synced":        { en: "Synced to cloud", ja: "クラウド同期中", ko: "클라우드 동기화됨", zh: "已同步到云端" },
  "auth.savePlan":      { en: "Save Plan", ja: "プランを保存", ko: "플랜 저장", zh: "保存计划" },
  "auth.savePlanHint":  { en: "Sign in to save across devices", ja: "ログインで他のデバイスでも使えます", ko: "로그인하면 다른 기기에서도 사용 가능", zh: "登录后可跨设备使用" },
  "auth.saved":         { en: "Saved", ja: "保存済み", ko: "저장됨", zh: "已保存" },
  "auth.loadSaved":     { en: "Load saved plan", ja: "保存済みプランを呼び出し", ko: "저장된 플랜 불러오기", zh: "加载已保存计划" },
  "auth.confirmOverwrite": { en: "Overwrite previously saved data? 🐥", ja: "以前保存したデータを上書きしていい？🐥", ko: "이전에 저장한 데이터를 덮어쓸까요? 🐥", zh: "覆盖之前保存的数据？🐥" },

  // Days mode
  "plan.daysMode":      { en: "Not sure about dates?", ja: "日程が未定の方はこちら", ko: "날짜가 미정이신가요?", zh: "日期还没确定？" },
  "plan.datesMode":     { en: "Back to date range", ja: "期間指定にもどる", ko: "기간 지정으로 돌아가기", zh: "返回日期范围" },
  "plan.stayDays":      { en: "Days in Vegas", ja: "ラスベガス滞在日数", ko: "라스베가스 체류일수", zh: "拉斯维加斯停留天数" },
  "plan.bestWindow":    { en: "Best: {start}–{end} ({count} events)", ja: "おすすめ: {start}〜{end}（{count}イベント）", ko: "추천: {start}–{end} ({count}개 이벤트)", zh: "推荐: {start}–{end}（{count}个赛事）" },

  // Ladies/Seniors filter
  "plan.includeLadies": { en: "Include Ladies events", ja: "Ladies イベントを含む", ko: "Ladies 이벤트 포함", zh: "包含 Ladies 赛事" },
  "plan.includeSeniors":{ en: "Include Seniors events", ja: "Seniors イベントを含む", ko: "Seniors 이벤트 포함", zh: "包含 Seniors 赛事" },

  // Auto days
  "plan.autoDays":      { en: "Auto", ja: "自動", ko: "자동", zh: "自动" },

  // Alternative flights
  "card.altFlights":    { en: "Other flights:", ja: "他のフライト:", ko: "다른 플라이트:", zh: "其他场次:" },

  // Calendar
  "plan.calendar":      { en: "Calendar", ja: "カレンダー", ko: "캘린더", zh: "日历" },
  "calendar.june":      { en: "June", ja: "6月", ko: "6월", zh: "6月" },
  "calendar.july":      { en: "July", ja: "7月", ko: "7월", zh: "7月" },
  "calendar.google":    { en: "Google Calendar", ja: "Google カレンダー", ko: "Google 캘린더", zh: "Google 日历" },
  "calendar.apple":     { en: "Apple Calendar", ja: "Apple カレンダー", ko: "Apple 캘린더", zh: "Apple 日历" },
  "calendar.close":     { en: "Close", ja: "閉じる", ko: "닫기", zh: "关闭" },

  // Common
  "common.cancel":      { en: "Cancel", ja: "キャンセル", ko: "취소", zh: "取消" },
}

// --- Translate function ---
function translate(key: string, locale: Locale, vars?: Record<string, string | number>): string {
  const entry = dict[key]
  let text = entry?.[locale] ?? entry?.en ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}

// --- Detect locale from navigator ---
function detectLocale(): Locale {
  if (typeof window === "undefined") return "en"
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && ["en", "ja", "ko", "zh"].includes(saved)) return saved as Locale
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith("ja")) return "ja"
  if (lang.startsWith("ko")) return "ko"
  if (lang.startsWith("zh")) return "zh"
  return "en"
}

// --- Format date per locale ---
function createFormatDate(locale: Locale) {
  const localeMap: Record<Locale, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
  }
  return (dateStr: string, opts?: Intl.DateTimeFormatOptions) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString(localeMap[locale], opts ?? { month: "short", day: "numeric", weekday: "short" })
  }
}

// --- Context ---
type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  formatDate: (dateStr: string, opts?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  formatDate: (d) => d,
})

// --- Provider ---
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const detected = detectLocale()
    setLocaleState(detected)
    document.documentElement.lang = detected
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars),
    [locale]
  )

  const formatDate = useCallback(
    (dateStr: string, opts?: Intl.DateTimeFormatOptions) => createFormatDate(locale)(dateStr, opts),
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatDate }}>
      {children}
    </I18nContext.Provider>
  )
}

// --- Hook ---
export function useT() {
  return useContext(I18nContext)
}
