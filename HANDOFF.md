# WSOP Planner 引継書

## プロジェクト概要
WSOP 2026（ポーカーの世界大会）の参戦プランナー。予算・滞在日程・ゲームタイプを設定すると、自動でトーナメントスケジュールを提案するWebアプリ。

- **本番URL**: https://wsop.ahillchan.com
- **技術スタック**: Next.js 16 (App Router) + Tailwind CSS v4 + Vercel Pro
- **パス**: `/Users/KoichiOkawa/wsop-planner`
- **デプロイ**: `vercel --prod`（カスタムドメイン設定済み）

## データソース
- `src/data/tournaments.ts` — 全100イベント
- 2026年2月16日に公式発表されたスケジュールを反映済み（PokerNews / WSOP.com照合済み）
- 日程: 2026/05/26〜07/15、Main Event: 7/2, $10,000

## 2025-02-17 の作業内容

### 実装・デプロイ済み

1. **OG画像の左右パディング拡大** (`src/app/api/og/route.tsx`)
   - X（Twitter）カードプレビューで左端が切れる問題を修正
   - padding: `48px` → `120px`

2. **Main Event最優先表示** (`src/lib/recommend.ts`)
   - `isMainEvent()` 判定関数を追加（名前に"Main Event"を含むもの）
   - スコア +100（他の最大50程度に対して圧倒的優先）
   - `max_single_buyin` フィルターを免除（$5K上限でも$10K Main Eventが候補に出る）
   - duration penalty免除（12日間の-18ペナルティを回避）
   - 対象: MINI Main Event (#72, $1,000) と MAIN EVENT (#82, $10,000)

3. **ギャンブル依存症相談窓口の削除** (`src/lib/i18n.tsx`)
   - 日本語の `disclaimer.gambling` から相談窓口の電話番号を削除

4. **Xシェアに @daiokawa メンション追加** (`src/components/ShareModal.tsx`)
   - 全言語のツイートテキストに `@daiokawa` を追加
   - ハッシュタグ `#WSOP2026 #poker` と並列

5. **favicon を🐥に変更** (`src/app/layout.tsx`)
   - SVG data URI でインラインfavicon
   - 旧 `src/app/favicon.ico` は削除済み

### 取り消し（ロールバック済み）

- **🐥ステップバイステップ・オンボーディングガイド** — 実装→デプロイ→テスト→取り消し
  - 理由: 既存のラベル文言と重複してくどくなる（森山さんフィードバック起点だったが不採用）
  - `GuideChick.tsx` 削除済み、globals.css / HomeClient.tsx / i18n.tsx も全て元に戻し済み

## ファイル構成（主要）

```
src/
├── app/
│   ├── layout.tsx          — ルートレイアウト（favicon、PWA設定）
│   ├── page.tsx            — トップ（OGメタタグ生成）
│   ├── globals.css         — テーマ変数、スクロールバー
│   └── api/og/route.tsx    — OG画像生成（Edge Runtime）
├── components/
│   ├── HomeClient.tsx      — メインページ（486行、最大ファイル）
│   ├── ShareModal.tsx      — Xシェア機能
│   ├── TournamentCard.tsx  — カード表示
│   └── ...
├── lib/
│   ├── recommend.ts        — レコメンドエンジン（スコアリング+貪欲選択）
│   ├── i18n.tsx            — 4言語対応（en/ja/ko/zh、ブラウザ自動判定）
│   ├── storage.ts          — localStorage管理
│   └── ...
├── data/
│   └── tournaments.ts      — 全100イベントデータ
└── types/
    └── index.ts            — 型定義
```

## 注意事項

- **High Rollerは意図的にフィルター対象** — Main Eventと違い、ユーザーが自分で `max_single_buyin` を上げて表示する設計
- **Main Event Day1フライト** — 公式はまだ1エントリー（7/2）のみ。複数フライト（1A〜1D）の日程が公表され次第、データ追加が必要
- **X OG画像キャッシュ** — Xはカードプレビューをキャッシュするため、OG画像変更後は反映に時間がかかる。URLにダミーパラメータ付与で回避可能
- **Vercel環境変数** — 改行コードを絶対に入れない（CLAUDE.md参照）
- **配色** — 紫系は使用禁止（CLAUDE.md参照）
