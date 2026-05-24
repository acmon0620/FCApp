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

#### チームへの参加（新規メンバー）
- 管理者が「チーム設定」画面でチーム招待コード（チームUUID）を確認・コピー
- メンバーは `/join` ページで招待コード・名前・メール・パスワードを入力してチームに参加
- 参加完了後 `/login?joined=1` にリダイレクトし、緑のバナーで完了を通知
- `join_team` RPC（SECURITY DEFINER）で未認証状態でもメンバー登録を安全に実行

#### 既存メンバーへのログイン権限付与（招待リンク）
管理者が一括登録などでメンバーレコードを作成したあと、そのメンバーに個別のログイン情報を設定させる招待フロー：

1. 管理画面 → メンバー一覧で `未登録` バッジのメンバーの「招待リンクを発行」をクリック
2. 生成された招待URL（有効期限7日）をコピーしてLINEなどで送付
3. メンバーは `/invite/[code]` にアクセスし、自分の名前を確認のうえメールアドレスとパスワードを入力
4. 登録完了後、Supabaseの認証アカウントが作成され、既存の出場記録・イベント等はすべて新アカウントに引き継がれる

- `has_login` フラグ（`members` テーブル）で未登録状態を管理
- 同一メンバーへの有効な招待が既にある場合は再利用（重複発行防止）
- この操作は `SUPABASE_SERVICE_ROLE_KEY`（Admin API）を使用するため、環境変数への設定が必要

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
- 終了した試合はスコアと **勝（緑）/ 分（グレー）/ 負（赤）** バッジを表示
- タグ（種別）バッジ表示
- 管理者は新規試合を追加可能

#### 試合作成 / 編集
- 対戦相手・試合日・種別（タグ）・試合時間（分）を設定
- タグは自由入力＋候補からの選択（リーグ戦・練習試合・カップ戦・大会・フレンドリー・その他）
- 試合時間は60分・80分・90分の候補付き自由入力（例：45分ハーフ → 90）
- **ユニフォームカラー**：白 / 青 / 赤 の3色からTシャツ画像で選択（フォーメーション表示に反映）
- 管理者は試合情報の編集・削除が可能（削除時は関連するラインナップ・イベントも削除）

#### スターティングメンバー設定
4タブで構成。管理者のみアクセス可。

| タブ | 内容 |
|------|------|
| 参加者 | 全メンバーから当日参加するメンバーをタップして選択 |
| 先発 | 参加者の中から先発（最大11人）を設定。各選手のポジションをボタンまたは自由入力で指定 |
| ベンチ | 参加者のうち先発以外。タップして先発に昇格（11人上限に達すると不可） |
| 配置 | 先発選手をフィールド上にドラッグして配置を調整 |

- 保存時：先発は `lineups.start_minute=0`、ベンチは `lineups.start_minute=null` として登録
- ベンチ登録された選手が試合記録で交代出場した場合、既存エントリを更新して出場時間を設定

#### 試合記録
- **試合開始 / 終了**：ステータス管理。試合終了時に出場中（`start_minute` が設定済み）の選手の出場終了時間を自動記録。ベンチのまま終わった選手は出場扱いにならない
- **試合時間表示**：スコア横に設定済みの`duration`（試合時間）を静的表示
- **イベント記録**：得点⚽ / 警告🟨 / 退場🟥（選手・アシスト・時間を記録）。選手選択は参加メンバー（先発＋ベンチ）に限定
- **相手得点記録**：得点者・アシストの背番号を記録
- **選手交代**：IN候補はベンチ登録済みの選手のみ表示。OUT選手の出場終了時間とIN選手の出場開始時間をセットで記録
- **イベント削除**：× ボタンでイベント個別削除（スコアも自動調整）
- 試合終了後もすべての記録を編集可能（交代・イベント追加可）
- 試合終了後の選手リストは実際に出場した全員を表示（出場時間付き）
- 記録操作後に即時UI反映（`loadData()` を各ミューテーション後に呼び出し）

#### 試合詳細
- スコア表示
- 試合時間（`duration`）を設定済みの場合はヘッダーに表示
- フォーメーション表示：Tシャツ形のトークン（試合ごとのユニフォームカラーを反映）＋選手名
- 出場メンバー一覧：先発バッジ / ポジション / 出場時間（例：0分〜45分）/ 計X分
- イベント一覧：時系列で得点・アシスト・カード・相手得点を表示
- 選手名・アシスト名は記録時点のスナップショットを表示（名前変更後も正確に表示）

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
- チームメンバーの一覧表示（`未登録` バッジで未ログイン設定のメンバーを識別）
- **1人追加**：名前・背番号・ポジション・生年月日・利き足を入力。メールアドレスを入力した場合は認証アカウントも同時作成
- **一括入力**：テーブル形式で複数メンバーを一括登録
- **編集**：メンバー情報のインライン編集
- **ロール変更**：管理者 ↔ メンバーのロールをワンクリックで切り替え
- **招待リンクを発行**：`has_login = false` のメンバーに対して表示。クリックで招待URL生成（有効期限7日）
- **削除**：ソフトデリート（`deleted_at` を記録）。メンバーレコードはDBに残るためランキング・試合記録は削除後も維持される。UI（選手選択・メンバー一覧）からは非表示になる。`has_login=true` のメンバーは Admin API で Supabase Auth アカウントも同時削除するため、削除後に同じメールアドレスで別チームを新規作成できる
- メンバー個人ページで試合別得点・アシストのバーチャートを表示（Recharts）

#### チーム設定タブ
- チーム名の変更・保存

### ダークモード
- ライト / ダーク の切り替えボタンを表示（デスクトップはサイドバー、モバイルはヘッダー右上）
- 選択はlocalStorageに保存され、ページをまたいで維持される
- チャート（Recharts）の軸色・ツールチップ背景もダークモードに対応

---

## スマホ対応

### トップヘッダー（モバイル専用）
- 画面上部に固定表示（`md:hidden` でデスクトップでは非表示）
- 左側：FootBoard アイコン＋アプリ名＋チーム名
- 右側：テーマ切り替えボタン（🌙/☀️）＋ログアウトボタン

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
| `(app)/layout.tsx` | Server | 認証チェック・MobileHeader・サイドバー・BottomNav描画 |
| `admin/layout.tsx` | Server | 管理セクション共通レイアウト・タブバー |
| `matches/[id]/edit/page.tsx` | Server | データ取得・権限チェック |
| `matches/[id]/edit/EditForm.tsx` | Client | フォーム状態管理・保存/削除操作 |
| `matches/[id]/lineup/page.tsx` | Server | 試合・メンバー・ラインナップ並列取得 |
| `matches/[id]/lineup/LineupClient.tsx` | Client | タブ切り替え・ドラッグ・保存操作 |
| `rankings/page.tsx` | Server | 初期データ取得 |
| `rankings/RankingsClient.tsx` | Client | タブ・フィルター操作 |
| `members/[id]/MemberStats.tsx` | Client | Rechartsチャート描画 |
| `login/LoginBanner.tsx` | Client | `useSearchParams()` を Suspense 内で使用 |
| `admin/members/AdminMembersClient.tsx` | Client | メンバー管理・招待リンク発行UI |
| `invite/[code]/page.tsx` | Server | 招待コード検証・メンバー名取得 |
| `invite/[code]/ClaimForm.tsx` | Client | アカウント登録フォーム |

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
const publicPaths = ['/login', '/register', '/join', '/invite']
```

### Supabase Admin Client（`src/lib/supabase/admin.ts`）

招待フローでのアカウント作成・IDマイグレーションに Service Role Key を使用：

```typescript
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
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
| `members` | ユーザーとチームの紐付け、ロール管理、`has_login` フラグ、`deleted_at` でソフトデリート |
| `matches` | 試合情報（対戦相手・日付・スコア・ステータス・タグ・試合時間・ユニフォームカラー） |
| `lineups` | 出場記録（選手・ポジション・開始/終了時間・`member_name` スナップショット） |
| `events` | イベント記録（得点・アシスト・カード・相手得点・`member_name` / `assisted_by_name` スナップショット） |
| `member_invites` | 既存メンバーへのログイン招待コード管理 |

### `members` テーブルの主なカラム

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | uuid | Supabase Auth の `user.id` と一致（招待クレーム後に移行） |
| `team_id` | uuid | 所属チーム |
| `role` | text | `admin` or `member` |
| `has_login` | boolean | ログイン情報（Authアカウント）が設定済みかどうか |
| `deleted_at` | timestamptz | ソフトデリート日時（NULL = 有効）|

### `member_invites` テーブル

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | uuid | PK |
| `team_id` | uuid | 対象チーム |
| `member_id` | uuid | 対象メンバー（ON UPDATE CASCADE） |
| `code` | text | 招待コード（URLに含める） |
| `expires_at` | timestamptz | 有効期限（発行から7日） |
| `used_at` | timestamptz | 使用日時（NULL = 未使用） |

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
│   │   │   ├── members/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── AdminMembersClient.tsx  # メンバー管理・招待UI (Client)
│   │   │   │   └── actions.ts             # createMemberInvite / toggleMemberRole / deleteMember
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
│   ├── invite/
│   │   └── [code]/             # 招待リンク経由のアカウント登録（認証不要）
│   │       ├── page.tsx        # 招待コード検証・メンバー名取得 (Server)
│   │       ├── ClaimForm.tsx   # 登録フォーム (Client)
│   │       └── actions.ts      # claimMemberAccount (Server Action)
│   ├── join/                   # 招待コードでのチーム参加ページ
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
│   ├── MobileHeader.tsx        # モバイル専用トップヘッダー (Client)
│   ├── Sidebar.tsx             # デスクトップ専用サイドバー (Client)
│   ├── ThemeProvider.tsx       # next-themes ラッパー
│   └── ThemeToggle.tsx         # 🌙/☀️ トグルボタン（サイドバー用）
├── lib/
│   ├── auth.ts                 # getCurrentMember() with React cache()
│   ├── matchTags.ts
│   └── supabase/
│       ├── admin.ts            # createAdminClient() — Service Role Key使用
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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` は Supabase ダッシュボードの **Project Settings → Data API → service_role** から取得します。招待リンク発行・アカウントクレーム機能に必要です（サーバーサイドのみで使用）。

### 3. Supabase でのSQLマイグレーション

Supabase ダッシュボードの **SQL Editor** で以下を実行：

```sql
-- 試合時間カラム
ALTER TABLE matches ADD COLUMN IF NOT EXISTS duration integer;

-- ログイン状態管理カラム
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_login boolean NOT NULL DEFAULT false;
UPDATE members SET has_login = true WHERE role = 'admin';

-- 招待コード管理テーブル
CREATE TABLE IF NOT EXISTS member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL ON UPDATE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON member_invites USING (false);

-- メンバーのソフトデリート
ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 選手名スナップショット（記録時点の名前を保持）
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS member_name text;
ALTER TABLE events  ADD COLUMN IF NOT EXISTS member_name text;
ALTER TABLE events  ADD COLUMN IF NOT EXISTS assisted_by_name text;

-- ユニフォームカラー（試合ごとに白/青/赤を選択）
ALTER TABLE matches ADD COLUMN IF NOT EXISTS shirt_color text NOT NULL DEFAULT 'white';

-- 試合コメント（最大300文字）
ALTER TABLE matches ADD COLUMN IF NOT EXISTS note text;
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

---

## デプロイ

[Vercel](https://vercel.com) へのデプロイを推奨します。環境変数に以下を設定してください：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
