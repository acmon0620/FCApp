-- groups テーブル（チーム内の括り：Aチーム、Bチーム、シニアなど）
CREATE TABLE IF NOT EXISTS groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- チームメンバーなら閲覧可
CREATE POLICY "team_members_read_groups" ON groups
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM members
      WHERE id = auth.uid() AND deleted_at IS NULL
    )
  );

-- 管理者のみ書き込み可
CREATE POLICY "admins_write_groups" ON groups
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM members
      WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
    )
  );

-- member_groups テーブル（メンバーとグループの多対多、背番号はグループ単位）
CREATE TABLE IF NOT EXISTS member_groups (
  member_id    uuid NOT NULL REFERENCES members(id)  ON DELETE CASCADE,
  group_id     uuid NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  jersey_number integer,
  PRIMARY KEY (member_id, group_id)
);

ALTER TABLE member_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_read_member_groups" ON member_groups
  FOR SELECT USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN members m ON m.team_id = g.team_id
      WHERE m.id = auth.uid() AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "admins_write_member_groups" ON member_groups
  FOR ALL USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN members m ON m.team_id = g.team_id
      WHERE m.id = auth.uid() AND m.role = 'admin' AND m.deleted_at IS NULL
    )
  );

-- members.number は後方互換のため残すが、今後は member_groups.jersey_number を使う
-- 完全移行後に以下で削除できる:
-- ALTER TABLE members DROP COLUMN IF EXISTS number;
