# FootBoard — サッカーチーム管理アプリ

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

#### チーム登録
- `/register` ページから新規チームを作成
- 登録と同時に管理者アカウントと共有チームアカウントを自動生成（`register_team` RPC）
- 登録完了後 `/login?registered=1` にリダイレクトし、緑のバナーで完了を通知

#### チームへの参加（メンバー登録）
- 管理者が「チーム設定」画面でチーム招待コード（チームUUID）を確認・コピー
- メンバーは `/join` ページで招待コード・名前・メール・パスワードを入力してチームに参加
- 参加完了後 `/login?joined=1` にリダイレクトし、緑のバナーで完了を通知
- `join_team` RPC（SECURITY DEFINER）で未認証状態でもメンバー登録を安全に実行

#### ログイン（`/login`）
2つのタブを切り替えてログイン：

| タブ | 対象 | 方法 |
|------|------|------|
| 個人アカウント | 管理者・個人アカウント登録済メンバー | メール＋パスワード |
| チームメンバーログイン | 共有アカウントのメンバー | チーム名＋チームパスワード |

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
- フォーメーション表示（各トークンの下に常時名前を表示）
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

### 管理（管理者のみ）
サイドバー / ボトムナビの「管理」タブから、内部タブで2セクションを切り替え：

#### メンバー管理タブ
- チームメンバーの一覧表示
- 背番号・ロールの編集
- メンバー個人ページで試合別得点・アシストのバーチャートを表示（Recharts）

#### チーム設定タブ
- チーム名の変更・保存
- チーム招待コード（UUID）の表示とコピーボタン

### ダークモード
- ライト / ダーク / システム設定の3モードをサイドバーのボタンで切り替え
- 選択はlocalStorageに保存され、ページをまたいで維持される
- チャート（Recharts）の軸色・ツールチップ背景もダークモードに対応

---

## スマホ対応

### ボトムナビバー（モバイル専用）
- 画面下部に固定のタブバーを表示（`md:hidden` でデスクトップでは非表示）
- 管理者には「管理」タブを追加表示（5タブ）、一般メンバーは4タブ

| タブ | 遷移先 |
|------|--------|
| ホーム | `/dashboard` |
| 試合 | `/matches` |
| メンバー | `/members` |
| ランキング | `/rankings` |
| 管理（管理者のみ） | `/admin/members` |

### サイドバー（デスクトップ専用）
- `hidden md:flex` によりモバイルでは非表示
- 左上にアプリアイコン＋「FootBoard」を表示し、その下にチーム名を表示
- 「管理」は1つのナビ項目に統合（`/admin/*` 配下全体でアクティブ状態）

### レスポンシブグリッド
- ダッシュボードの統計カード：モバイル1列 → デスクトップ2列
- メンバー詳細の統計グリッド：モバイル2列 → デスクトップ3列
- 試合詳細のヘッダー：モバイル縦並び → デスクトップ横並び

---

## アーキテクチャ

### Server / Client Component の役割分担

| ファイル | 種別 | 役割 |
|----------|------|------|
| `(app)/layout.tsx` | Server | 認証チェック・サイドバー・BottomNav描画 |
| `admin/layout.tsx` | Server | 管理セクション共通レイアウト・タブバー |
| `matches/[id]/edit/page.tsx` | Server | データ取得・権限チェック |
| `matches/[id]/edit/EditForm.tsx` | Client | フォーム状態管理・保存/削除操作 |
| `matches/[id]/lineup/page.tsx` | Server | 試合・メンバー・ラインナップ並列取得 |
| `matches/[id]/lineup/LineupClient.tsx` | Client | タブ切り替え・ドラッグ・保存操作 |
| `rankings/page.tsx` | Server | 初期データ取得 |
| `rankings/RankingsClient.tsx` | Client | タブ・フィルター操作 |
| `members/[id]/MemberStats.tsx` | Client | Rechartsチャート描画 |
| `login/LoginBanner.tsx` | Client | `useSearchParams()` を Suspense 内で使用 |

### 認証ヘルパー（`src/lib/auth.ts`）

React `cache()` でラップした `getCurrentMember()` を各サーバーコンポーネントから呼ぶことで、**同一リクエスト内でのSupabase認証クエリを1回に集約**しています。

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

### ミドルウェア（`src/proxy.ts`）

未認証ユーザーを `/login` にリダイレクトします。以下のパスは認証不要（パブリック）：

```typescript
const publicPaths = ['/login', '/register', '/join']
```

### スケルトンローダー

各ルートセグメントに `loading.tsx` を配置し、サーバーサイドのデータ取得中にスケルトンUIを即時表示します。

対象ページ：`dashboard` / `matches` / `matches/[id]` / `matches/[id]/edit` / `matches/[id]/lineup` / `rankings` / `members`

### ダークモードの実装

Tailwind CSS v4 は CSS-first で設定します。`globals.css` に以下を追加することでクラスベースのダークモードを有効化：

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

| 関数 | 用途 |
|------|------|
| `register_team(p_team_name, p_member_name, p_member_id, p_shared_member_id, p_shared_member_email)` | チーム登録（管理者・共有アカウントを一括作成） |
| `join_team(p_team_id, p_member_name, p_member_id)` | 招待コードでのメンバー参加（未認証から実行可） |
| `get_team_member_auth(p_team_name)` | チームメンバーログイン用のメール取得 |
| `get_top_scorers(p_team_id, p_limit)` | 得点ランキング取得（ダッシュボード用） |
| `get_team_rankings(p_team_id, p_tag, p_date_from, p_date_to)` | 全カテゴリランキング取得（フィルター対応） |

---

## ディレクトリ構成

```
src/
├── app/
│   ├── (app)/                  # 認証必須ルートグループ
│   │   ├── layout.tsx          # サイドバー・BottomNav・認証ガード
│   │   ├── admin/
│   │   │   ├── layout.tsx      # 管理セクション共通レイアウト（タブバー）
│   │   │   ├── AdminTabs.tsx   # メンバー管理 / チーム設定 タブ (Client)
│   │   │   ├── members/        # AdminMembersClient.tsx (Client)
│   │   │   └── settings/       # TeamSettingsClient.tsx (Client)
│   │   ├── dashboard/
│   │   ├── matches/
│   │   │   ├── [id]/
│   │   │   │   ├── edit/       # EditForm.tsx (Client)
│   │   │   │   ├── lineup/     # LineupClient.tsx (Client)
│   │   │   │   └── record/
│   │   │   └── new/
│   │   ├── members/
│   │   │   └── [id]/           # MemberStats.tsx (Client, Recharts)
│   │   └── rankings/           # RankingsClient.tsx (Client)
│   ├── join/                   # 招待コードでのメンバー参加ページ
│   ├── login/
│   │   └── LoginBanner.tsx     # 参加/登録完了バナー (Client, Suspense対応)
│   ├── register/
│   ├── icon.png                # アプリアイコン（ファビコン・サイドバー共用）
│   ├── globals.css
│   └── layout.tsx              # ThemeProvider・メタデータ ("FootBoard")
├── components/
│   ├── BottomNav.tsx           # モバイル専用ボトムナビバー (Client)
│   ├── FormationEditor.tsx     # 編集可能フォーメーション (Client)
│   ├── FormationField.tsx      # 表示専用フォーメーション（名前常時表示）
│   ├── Sidebar.tsx             # デスクトップ専用サイドバー (Client)
│   ├── ThemeProvider.tsx       # next-themes ラッパー
│   └── ThemeToggle.tsx         # 🌙/☀️ トグルボタン
├── lib/
│   ├── auth.ts                 # getCurrentMember() with React cache()
│   ├── matchTags.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
└── proxy.ts                    # 認証ミドルウェア（publicPaths管理）
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
