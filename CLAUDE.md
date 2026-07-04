@AGENTS.md

# FootBoard プロジェクト概要

サッカーチームの試合記録・メンバー管理・ランキング集計を行うWebアプリ。

- **フレームワーク**: Next.js App Router（`src/app/` 配下）
- **DB / 認証**: Supabase（PostgreSQL + Auth + RLS）
- **スタイル**: Tailwind CSS v4（CSS-first、`@custom-variant` 構文）
- **デプロイ**: Vercel

---

## 環境変数（`.env.local` および Vercel に設定）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Admin API使用（招待フロー）。Vercel環境変数への追加が必要
```

---

## 重要なアーキテクチャルール

### members.id = auth.users.id
`members` テーブルの `id` は Supabase Auth の `user.id` と一致させる設計。
メールなしで一括登録されたメンバーは `crypto.randomUUID()` がIDになるが、招待フローでアカウントを作成した際に auth UUID に移行する（lineups・events の FK も一緒に更新）。

### getCurrentMember()
`src/lib/auth.ts` の `getCurrentMember()` は React `cache()` でラップ済み。サーバーコンポーネントから複数回呼んでも Supabase クエリは1回だけ実行される。

### Admin Client
`src/lib/supabase/admin.ts` の `createAdminClient()` は `SUPABASE_SERVICE_ROLE_KEY` を使用。RLS を bypass して Admin API にアクセスできる。Server Action / Server Component でのみ使用すること（クライアントサイドに漏れない）。

### Supabase の多対1 FK join 問題
`events` テーブルが `members` に対して `member_id` と `assisted_by` の2つの FK を持つ場合、`select('*, members(name), assistMember:assisted_by(name)')` のような alias 構文は無効。代わりに `select('*')` で取得後、メンバーIDをまとめて `from('members').select('id, name').in('id', memberIds)` で別途取得すること。

### ミドルウェア
`src/proxy.ts` で未認証ユーザーを `/login` にリダイレクト。
公開パス: `/login`, `/register`, `/join`, `/invite`

---

## DB スキーマの補足（コードから読めない情報）

### 適用済みマイグレーション
```sql
-- 試合時間
ALTER TABLE matches ADD COLUMN IF NOT EXISTS duration integer;

-- ログイン状態管理
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_login boolean NOT NULL DEFAULT false;
UPDATE members SET has_login = true WHERE role = 'admin';

-- 招待コード管理
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

-- グループ管理（Aチーム・Bチーム・シニアなどの括り）
-- 完全な SQL は supabase/migrations/groups.sql を参照
CREATE TABLE IF NOT EXISTS groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- メンバーとグループの多対多。背番号はグループ単位で管理（members.number は廃止予定）
CREATE TABLE IF NOT EXISTS member_groups (
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  group_id      uuid NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
  jersey_number integer,
  PRIMARY KEY (member_id, group_id)
);
```

### SECURITY DEFINER 関数（既存）
- `register_team(...)` — チーム登録（管理者・共有アカウントを一括作成）
- `join_team(p_team_id, p_member_name, p_member_id)` — 招待コードでのメンバー参加
- `get_team_member_auth(p_team_name)` — チームメンバーログイン用メール取得
- `get_top_scorers(p_team_id, p_limit)` — 得点ランキング
- `get_team_rankings(p_team_id, p_tag, p_date_from, p_date_to)` — 全カテゴリランキング

---

## 主要フロー

### メンバーへのログイン付与（招待フロー）
1. 管理者が `/admin/members` で `has_login=false` のメンバーの「招待リンクを発行」をクリック
2. `createMemberInvite()` Server Action が `member_invites` にコードを INSERT（有効期限7日）
3. URL（`/invite/[code]`）をメンバーに共有
4. メンバーが `/invite/[code]` でメール・パスワードを入力
5. `claimMemberAccount()` Server Action が Admin API でアカウント作成 → lineups/events の FK を新 UUID に更新 → members.id を更新 → has_login=true → invite に used_at を記録

### ロール変更
`toggleMemberRole()` Server Action が role を admin ↔ member に切り替え。自分自身のロールは変更不可。

### グループ管理
`/admin/members` でグループ（Aチーム・Bチームなど）を作成・管理。
- `groups` テーブルにグループを登録し、`member_groups` でメンバーを多対多に紐付け
- 背番号（`jersey_number`）はグループ単位で管理。同一メンバーがグループごとに異なる背番号を持てる
- Server Actions: `createGroup / renameGroup / deleteGroup / upsertMemberGroup / removeMemberFromGroup`（`src/app/(app)/admin/members/actions.ts`）
- `/members?group=<id>` のURLパラメータでグループ別表示に切り替え
- スタメン設定画面（`/matches/[id]/lineup`）でもグループ絞り込みが可能
- `members.number` カラムは廃止予定（DBには残存）。背番号は必ず `member_groups.jersey_number` を参照すること

### オウンゴール記録
`MatchEventsClient`（`src/app/(app)/matches/[id]/MatchEventsClient.tsx`）でのイベント記録UI。
- オウンゴールは独立したボタンではなく「自チーム得点」フロー内のチェックボックスとして実装
- 「自チーム得点」選択 → 選手選択後に「オウンゴール（相手チームに+1点）」チェックボックスが表示
- チェック時: アシスト選択を非表示にし、DB には `type = 'own_goal'`・`member_id` あり・`score_them` +1 で記録
- 非チェック時: 通常の自チーム得点（`type = 'goal'`・`score_us` +1）

### 試合種別タグの動的補完
- 新規試合作成（`/matches/new`）: `useEffect` でチームの既存タグを取得し datalist に追加
- 試合編集（`/matches/[id]/edit`）: サーバー側で既存タグを取得し `EditForm` に `tagSuggestions` として渡す

---

## Tailwind CSS v4 の注意点

`globals.css` でダークモードを有効化：
```css
@custom-variant dark (&:where(.dark, .dark *));
```
`dark:` prefix はこれがないと動作しない。`tailwind.config.js` は存在しない（CSS-first）。
