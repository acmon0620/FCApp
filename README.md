# FC App — サッカーチーム管理アプリ

サッカーチームの試合記録・メンバー管理・ランキング集計を行うWebアプリです。

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| データベース / 認証 | Supabase (PostgreSQL + Auth + RLS) |
| スタイリング | Tailwind CSS v4 (CSS-first config) |
| テーマ管理 | next-themes |
| チャート | Recharts |

---

## 主な機能

### 認証・チーム管理
- メールアドレス＋パスワードによるサインアップ / ログイン
- チーム作成（サインアップ時に自動作成）またはチームコードで既存チームに参加
- ロール管理：`admin`（管理者）/ `member`（一般メンバー）

### ダッシュボード
- 全試合の勝利 / 引き分け / 敗北数を集計表示
- 直近5試合の結果一覧
- 得点ランキング TOP3（メダルアイコン付き）

### 試合管理

#### 試合一覧
- チームの全試合を日付降順で表示
- ステータス表示：予定 / 試合中 / 終了
- タグ（種別）バッジ表示
- 管理者は新規試合を追加可能

#### 試合作成 / 編集
- 対戦相手・試合日・種別（タグ）を設定
- タグは自由入力＋候補からの選択（リーグ戦・練習試合・カップ戦・大会・フレンドリー・その他）
- 管理者は試合情報の編集・削除が可能（削除時は関連するラインナップ・イベントも削除）

#### スターティングメンバー設定
- 先発（最大11人）/ サブの2タブ切り替えUI
- 先発タブ：各選手のポジション設定（GK / CB / LB / RB / DMF / CMF / LMF / RMF / CAM / LW / RW / CF / FW）
- サブタブ：選手をタップして先発に追加（11人上限に達すると追加不可）

#### 試合記録
- **試合開始 / 終了**：ステータス管理。試合終了時に出場中の全選手の出場終了時間を自動記録
- **イベント記録**：得点⚽ / 警告🟨 / 退場🟥（選手・アシスト・時間を記録）
- **相手得点記録**：得点者・アシストの背番号を記録
- **選手交代**：OUT選手の出場終了時間とIN選手の出場開始時間をセットで記録
- **イベント削除**：× ボタンでイベント個別削除（スコアも自動調整）
- 試合終了後もすべての記録を編集可能

#### 試合詳細
- スコア表示
- 出場メンバー一覧：先発バッジ / ポジション / 出場時間（例：0分〜45分）/ 計X分
- イベント一覧：時系列で得点・アシスト・カード・相手得点を表示

### ランキング
6カテゴリのランキングをタブ切り替えで表示：

| タブ | 内容 | アイコン |
|------|------|----------|
| 得点 | ゴール数 | ⚽ |
| アシスト | アシスト数 | 🎯 |
| 試合数 | 出場試合数 | 👟 |
| 出場時間 | 累計出場分数 | ⏱️ |
| 警告 | イエローカード枚数 | 🟨 |
| 退場 | レッドカード枚数 | 🟥 |

- 1〜3位にメダル（🥇🥈🥉）表示。警告・退場は不名誉アイコン（💀😤😒）
- **タグフィルター**：種別（リーグ戦のみ等）でランキングを絞り込み
- **期間フィルター**：開始日〜終了日でランキングを絞り込み

### メンバー管理（管理者のみ）
- チームメンバーの一覧表示
- 背番号・ロールの編集
- メンバー個人ページで試合別得点・アシストのバーチャートを表示（Recharts）

### ダークモード
- ライト / ダーク / システム設定の3モードをサイドバーのボタンで切り替え
- 選択はlocalStorageに保存され、ページをまたいで維持される
- チャート（Recharts）の軸色・ツールチップ背景もダークモードに対応

---

## アーキテクチャ

### Server / Client Component の役割分担

| ファイル | 種別 | 役割 |
|----------|------|------|
| `(app)/layout.tsx` | Server | 認証チェック・サイドバー描画 |
| `matches/[id]/edit/page.tsx` | Server | データ取得・権限チェック |
| `matches/[id]/edit/EditForm.tsx` | Client | フォーム状態管理・保存/削除操作 |
| `matches/[id]/lineup/page.tsx` | Server | 試合・メンバー・ラインナップ並列取得 |
| `matches/[id]/lineup/LineupClient.tsx` | Client | タブ切り替え・ドラッグ・保存操作 |
| `rankings/page.tsx` | Server | 初期データ取得 |
| `rankings/RankingsClient.tsx` | Client | タブ・フィルター操作 |
| `members/[id]/MemberStats.tsx` | Client | Rechartsチャート描画 |

### 認証ヘルパー（`src/lib/auth.ts`）

React `cache()` でラップした `getCurrentMember()` を各サーバーコンポーネントから呼ぶことで、**同一リクエスト内でのSupabase認証クエリを1回に集約**しています。レイアウトとページの両方から呼んでも実際のDBアクセスは1度だけです。

```typescript
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('members')
    .select('team_id, role, teams(id, name)')
    .eq('id', user.id)
    .single()
  return (data as unknown as CurrentMember) ?? null
})
```

### スケルトンローダー

各ルートセグメントに `loading.tsx` を配置し、サーバーサイドのデータ取得中にスケルトンUIを即時表示します。Next.js が自動的に Suspense バウンダリとして扱います。

対象ページ：`dashboard` / `matches` / `matches/[id]` / `matches/[id]/edit` / `matches/[id]/lineup` / `rankings` / `members`

### ダークモードの実装

Tailwind CSS v4 は `tailwind.config.ts` を使わず CSS-first で設定します。`globals.css` に以下を追加することでクラスベースのダークモードを有効化しています：

```css
@custom-variant dark (&:where(.dark, .dark *));
```

`next-themes` の `ThemeProvider`（`attribute="class"`）が `<html>` タグに `.dark` クラスを付与することでTailwindのダークバリアントが動作します。

---

## データベース構成（主要テーブル）

| テーブル | 主な役割 |
|----------|----------|
| `teams` | チーム情報 |
| `members` | ユーザーとチームの紐付け、ロール管理 |
| `matches` | 試合情報（対戦相手・日付・スコア・ステータス・タグ） |
| `lineups` | 出場記録（選手・ポジション・開始/終了時間） |
| `events` | イベント記録（得点・アシスト・カード・相手得点） |

### PostgreSQL関数（SECURITY DEFINER）
- `get_top_scorers(p_team_id, p_limit)` — 得点ランキング取得（ダッシュボード用）
- `get_team_rankings(p_team_id, p_tag, p_date_from, p_date_to)` — 全カテゴリランキング取得（フィルター対応）
- `register_team(p_team_name, p_member_name, p_member_id, p_shared_member_id, p_shared_member_email)` — チーム登録（管理者・共有アカウントを一括作成）

---

## ディレクトリ構成

```
src/
├── app/
│   ├── (app)/                  # 認証必須ルートグループ
│   │   ├── layout.tsx          # サイドバー・認証ガード
│   │   ├── dashboard/
│   │   ├── matches/
│   │   │   ├── [id]/
│   │   │   │   ├── edit/       # EditForm.tsx (Client)
│   │   │   │   ├── lineup/     # LineupClient.tsx (Client)
│   │   │   │   └── record/
│   │   │   └── new/
│   │   ├── members/
│   │   │   └── [id]/           # MemberStats.tsx (Client, Recharts)
│   │   ├── rankings/           # RankingsClient.tsx (Client)
│   │   └── admin/
│   ├── login/
│   ├── register/
│   ├── globals.css
│   └── layout.tsx              # ThemeProvider・suppressHydrationWarning
├── components/
│   ├── Sidebar.tsx
│   ├── ThemeProvider.tsx       # next-themes ラッパー
│   └── ThemeToggle.tsx         # 🌙/☀️ トグルボタン
└── lib/
    ├── auth.ts                 # getCurrentMember() with React cache()
    ├── matchTags.ts
    └── supabase/
        ├── client.ts
        └── server.ts
```

---

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、Supabaseプロジェクトの情報を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

---

## デプロイ

[Vercel](https://vercel.com) へのデプロイを推奨します。環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してください。
