'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  createMemberInvite, deleteMember, toggleMemberRole,
  createGroup, renameGroup, deleteGroup, upsertMemberGroup, removeMemberFromGroup,
} from './actions'

type Member = {
  id: string
  name: string
  position: string | null
  role: string
  birth_date: string | null
  preferred_foot: string | null
  has_login: boolean
}

type Group = { id: string; name: string; sort_order: number }
type MemberGroup = { member_id: string; group_id: string; jersey_number: number | null }

type MemberForm = {
  name: string
  position: string
  birth_date: string
  preferred_foot: string
}

const emptyForm: MemberForm = { name: '', position: '', birth_date: '', preferred_foot: '' }

function MemberFormFields({ form, onChange }: { form: MemberForm; onChange: (f: MemberForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名前 *</label>
        <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} required
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ポジション</label>
        <input type="text" value={form.position} onChange={e => onChange({ ...form, position: e.target.value })} placeholder="例：FW"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">生年月日</label>
        <input type="date" value={form.birth_date} onChange={e => onChange({ ...form, birth_date: e.target.value })}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">利き足</label>
        <select value={form.preferred_foot} onChange={e => onChange({ ...form, preferred_foot: e.target.value })}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100">
          <option value="">選択</option>
          <option value="right">右足</option>
          <option value="left">左足</option>
          <option value="both">両足</option>
        </select>
      </div>
    </div>
  )
}

const newBulkRow = (): MemberForm & { id: string } => ({
  id: crypto.randomUUID(), name: '', position: '', birth_date: '', preferred_foot: '',
})

export default function AdminMembersClient({
  members, groups, memberGroups, teamId,
}: {
  members: Member[]
  groups: Group[]
  memberGroups: MemberGroup[]
  teamId: string
}) {
  const router = useRouter()

  // ─── グループタブ ──────────────────────────────────────────────────────────
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groupLoading, setGroupLoading] = useState(false)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ─── グループメンバー操作 ─────────────────────────────────────────────────
  const [showAddToGroup, setShowAddToGroup] = useState(false)
  const [addToGroupMemberId, setAddToGroupMemberId] = useState('')
  const [addToGroupNumber, setAddToGroupNumber] = useState('')
  const [addToGroupLoading, setAddToGroupLoading] = useState(false)
  const [editingNumberKey, setEditingNumberKey] = useState<string | null>(null) // `${memberId}:${groupId}`
  const [editingNumberValue, setEditingNumberValue] = useState('')

  // ─── メンバー追加・編集 ───────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [addForm, setAddForm] = useState<MemberForm>(emptyForm)
  const [email, setEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [bulkRows, setBulkRows] = useState<(MemberForm & { id: string })[]>([newBulkRow(), newBulkRow(), newBulkRow()])
  const [bulkError, setBulkError] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<MemberForm>(emptyForm)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [copied, setCopied] = useState(false)

  // ─── 派生データ ────────────────────────────────────────────────────────────
  // グループIDごとのメンバーリスト
  const groupMembersMap: Record<string, MemberGroup[]> = {}
  for (const mg of memberGroups) {
    if (!groupMembersMap[mg.group_id]) groupMembersMap[mg.group_id] = []
    groupMembersMap[mg.group_id].push(mg)
  }

  // メンバーIDごとのグループリスト
  const memberGroupsMap: Record<string, MemberGroup[]> = {}
  for (const mg of memberGroups) {
    if (!memberGroupsMap[mg.member_id]) memberGroupsMap[mg.member_id] = []
    memberGroupsMap[mg.member_id].push(mg)
  }

  // ─── グループ管理 ──────────────────────────────────────────────────────────
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setGroupLoading(true)
    const result = await createGroup(newGroupName.trim())
    setGroupLoading(false)
    if (result.error) { alert(result.error); return }
    setNewGroupName('')
    setShowNewGroupForm(false)
    router.refresh()
  }

  async function handleRenameGroup(groupId: string) {
    if (!renameValue.trim()) return
    setGroupLoading(true)
    const result = await renameGroup(groupId, renameValue.trim())
    setGroupLoading(false)
    if (result.error) { alert(result.error); return }
    setRenamingGroupId(null)
    router.refresh()
  }

  async function handleDeleteGroup(groupId: string, groupName: string) {
    if (!confirm(`グループ「${groupName}」を削除しますか？\nメンバーのグループ所属は解除されますが、メンバー自体は削除されません。`)) return
    setGroupLoading(true)
    const result = await deleteGroup(groupId)
    setGroupLoading(false)
    if (result.error) { alert(result.error); return }
    if (activeGroupId === groupId) setActiveGroupId(null)
    router.refresh()
  }

  // ─── グループへのメンバー追加 ──────────────────────────────────────────────
  async function handleAddToGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!activeGroupId || !addToGroupMemberId) return
    setAddToGroupLoading(true)
    const num = addToGroupNumber ? Number(addToGroupNumber) : null
    const result = await upsertMemberGroup(addToGroupMemberId, activeGroupId, num)
    setAddToGroupLoading(false)
    if (result.error) { alert(result.error); return }
    setShowAddToGroup(false)
    setAddToGroupMemberId('')
    setAddToGroupNumber('')
    router.refresh()
  }

  async function handleRemoveFromGroup(memberId: string, groupId: string) {
    const result = await removeMemberFromGroup(memberId, groupId)
    if (result.error) { alert(result.error); return }
    router.refresh()
  }

  async function handleSaveNumber(memberId: string, groupId: string) {
    const num = editingNumberValue ? Number(editingNumberValue) : null
    const result = await upsertMemberGroup(memberId, groupId, num)
    if (result.error) { alert(result.error); return }
    setEditingNumberKey(null)
    router.refresh()
  }

  // ─── メンバー編集 ──────────────────────────────────────────────────────────
  function startEdit(member: Member) {
    setEditingId(member.id)
    setEditForm({
      name: member.name,
      position: member.position ?? '',
      birth_date: member.birth_date ?? '',
      preferred_foot: member.preferred_foot ?? '',
    })
    setEditError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditLoading(true)
    setEditError('')

    const supabase = createClient()
    const { error } = await supabase.from('members').update({
      name: editForm.name,
      position: editForm.position || null,
      birth_date: editForm.birth_date || null,
      preferred_foot: editForm.preferred_foot || null,
    }).eq('id', editingId)

    if (error) { setEditError('更新に失敗しました: ' + error.message); setEditLoading(false); return }
    setEditingId(null)
    setEditLoading(false)
    router.refresh()
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault()
    setBulkError('')
    const validRows = bulkRows.filter(r => r.name.trim())
    if (validRows.length === 0) { setBulkError('名前を少なくとも1件入力してください'); return }
    setBulkLoading(true)
    const supabase = createClient()
    const inserts = validRows.map(r => ({
      id: crypto.randomUUID(),
      team_id: teamId,
      name: r.name.trim(),
      role: 'member',
      has_login: false,
      position: r.position || null,
      birth_date: r.birth_date || null,
      preferred_foot: r.preferred_foot || null,
    }))
    const { error } = await supabase.from('members').insert(inserts)
    if (error) { setBulkError('登録に失敗しました: ' + error.message); setBulkLoading(false); return }
    setShowBulkForm(false)
    setBulkRows([newBulkRow(), newBulkRow(), newBulkRow()])
    setBulkLoading(false)
    router.refresh()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')

    const supabase = createClient()
    let memberId: string

    if (email) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-10),
        options: { emailRedirectTo: `${location.origin}/login` },
      })
      if (authError || !authData.user) {
        setAddError(authError?.message ?? 'ユーザー作成に失敗しました')
        setAddLoading(false)
        return
      }
      memberId = authData.user.id
    } else {
      memberId = crypto.randomUUID()
    }

    const { error: memberError } = await supabase.from('members').insert({
      id: memberId,
      team_id: teamId,
      name: addForm.name,
      role: 'member',
      has_login: !!email,
      position: addForm.position || null,
      birth_date: addForm.birth_date || null,
      preferred_foot: addForm.preferred_foot || null,
    })

    if (memberError) { setAddError('メンバー登録に失敗しました: ' + memberError.message); setAddLoading(false); return }
    setShowAddForm(false)
    setAddForm(emptyForm)
    setEmail('')
    setAddLoading(false)
    router.refresh()
  }

  async function handleToggleRole(member: Member) {
    const result = await toggleMemberRole(member.id)
    if (result.error) { alert(result.error); return }
    router.refresh()
  }

  async function handleIssueInvite(member: Member) {
    setInviteLoading(member.id)
    setInviteError('')
    const result = await createMemberInvite(member.id)
    setInviteLoading(null)
    if (result.error) { setInviteError(result.error); return }
    setInviteUrl(`${window.location.origin}/invite/${result.code}`)
    setCopied(false)
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(memberId: string) {
    if (!confirm('このメンバーを削除しますか？')) return
    const result = await deleteMember(memberId)
    if (result.error) { alert('削除に失敗しました: ' + result.error); return }
    router.refresh()
  }

  // ─── グループタブ内: メンバー一覧 ────────────────────────────────────────
  const currentGroup = groups.find(g => g.id === activeGroupId)
  const currentGroupMembers = activeGroupId ? (groupMembersMap[activeGroupId] ?? []) : []
  const membersInGroup = currentGroupMembers
    .map(mg => ({ mg, member: members.find(m => m.id === mg.member_id) }))
    .filter(({ member }) => !!member)
    .sort((a, b) => {
      const na = a.mg.jersey_number ?? Infinity
      const nb = b.mg.jersey_number ?? Infinity
      return na !== nb ? na - nb : a.member!.name.localeCompare(b.member!.name, 'ja')
    })

  const membersNotInGroup = activeGroupId
    ? members.filter(m => !currentGroupMembers.some(mg => mg.member_id === m.id))
    : []

  return (
    <>
      {/* 招待URLモーダル */}
      {inviteUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">招待リンクを発行しました</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              このリンクをメンバーに送ってください。有効期限は7日間です。
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 break-all font-mono">
              {inviteUrl}
            </div>
            {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                {copied ? 'コピーしました ✓' : 'URLをコピー'}
              </button>
              <button onClick={() => setInviteUrl(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* ─── グループタブバー ─────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setActiveGroupId(null); setShowNewGroupForm(false) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeGroupId === null && !showNewGroupForm
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
            }`}
          >
            全メンバー
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { setActiveGroupId(g.id); setShowNewGroupForm(false); setShowAddForm(false); setShowBulkForm(false); setEditingId(null) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeGroupId === g.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {g.name}
              <span className="ml-1 opacity-70">({(groupMembersMap[g.id] ?? []).length})</span>
            </button>
          ))}
          <button
            onClick={() => { setShowNewGroupForm(true); setActiveGroupId(null) }}
            className="px-3 py-1.5 rounded-full text-sm border border-dashed border-green-400 text-green-600 dark:text-green-400 hover:border-green-600 transition-colors"
          >
            + グループを追加
          </button>
        </div>

        {/* ─── 新規グループ作成フォーム ───────────────────────────────── */}
        {showNewGroupForm && (
          <form onSubmit={handleCreateGroup} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="グループ名（例：Aチーム、シニア）"
              autoFocus
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
            />
            <button type="submit" disabled={groupLoading || !newGroupName.trim()}
              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-green-700">
              作成
            </button>
            <button type="button" onClick={() => setShowNewGroupForm(false)}
              className="border border-gray-300 dark:border-gray-600 text-gray-500 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
              キャンセル
            </button>
          </form>
        )}

        {/* ─── グループ詳細ビュー ──────────────────────────────────────── */}
        {activeGroupId && currentGroup && (
          <div className="space-y-3">
            {/* グループ名・管理 */}
            <div className="flex items-center gap-2">
              {renamingGroupId === currentGroup.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    autoFocus
                    className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button onClick={() => handleRenameGroup(currentGroup.id)}
                    disabled={groupLoading} className="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50">
                    保存
                  </button>
                  <button onClick={() => setRenamingGroupId(null)}
                    className="text-xs text-gray-400 hover:underline">キャンセル</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setRenamingGroupId(currentGroup.id); setRenameValue(currentGroup.name) }}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:underline"
                  >
                    グループ名を変更
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(currentGroup.id, currentGroup.name)}
                    className="text-xs text-red-400 hover:text-red-600 hover:underline"
                  >
                    グループを削除
                  </button>
                </div>
              )}
            </div>

            {/* グループ内メンバーテーブル */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">背番号</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">名前</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">ポジション</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {membersInGroup.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                        このグループにメンバーがいません
                      </td>
                    </tr>
                  )}
                  {membersInGroup.map(({ mg, member }) => {
                    const key = `${mg.member_id}:${mg.group_id}`
                    const isEditing = editingNumberKey === key
                    return (
                      <tr key={mg.member_id}>
                        <td className="px-4 py-3 w-28">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingNumberValue}
                                onChange={e => setEditingNumberValue(e.target.value)}
                                min={1}
                                autoFocus
                                className="w-16 border border-green-400 rounded px-2 py-0.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none"
                              />
                              <button onClick={() => handleSaveNumber(mg.member_id, mg.group_id)}
                                className="text-xs text-green-600 dark:text-green-400 hover:underline">✓</button>
                              <button onClick={() => setEditingNumberKey(null)}
                                className="text-xs text-gray-400 hover:underline">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNumberKey(key); setEditingNumberValue(mg.jersey_number?.toString() ?? '') }}
                              className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 font-medium"
                              title="クリックして編集"
                            >
                              {mg.jersey_number != null ? `#${mg.jersey_number}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{member!.name}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{member!.position ?? '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveFromGroup(mg.member_id, mg.group_id)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            グループから除外
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* グループへメンバー追加 */}
            {!showAddToGroup ? (
              membersNotInGroup.length > 0 && (
                <button
                  onClick={() => setShowAddToGroup(true)}
                  className="w-full border border-dashed border-green-400 dark:border-green-700 text-green-600 dark:text-green-400 py-2.5 rounded-xl text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  + メンバーをグループに追加
                </button>
              )
            ) : (
              <form onSubmit={handleAddToGroup} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">メンバーを追加</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">メンバー</label>
                    <select
                      value={addToGroupMemberId}
                      onChange={e => setAddToGroupMemberId(e.target.value)}
                      required
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">選択してください</option>
                      {membersNotInGroup
                        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">背番号（任意）</label>
                    <input
                      type="number"
                      value={addToGroupNumber}
                      onChange={e => setAddToGroupNumber(e.target.value)}
                      min={1}
                      placeholder="例：10"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAddToGroup(false); setAddToGroupMemberId(''); setAddToGroupNumber('') }}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    キャンセル
                  </button>
                  <button type="submit" disabled={addToGroupLoading || !addToGroupMemberId}
                    className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-green-700">
                    {addToGroupLoading ? '追加中...' : '追加する'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── 全メンバービュー ────────────────────────────────────────── */}
        {activeGroupId === null && !showNewGroupForm && (
          <>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowBulkForm(true); setShowAddForm(false); setEditingId(null) }}
                className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors">
                一括入力
              </button>
              <button onClick={() => { setShowAddForm(true); setShowBulkForm(false); setEditingId(null) }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                + 1人追加
              </button>
            </div>

            {showBulkForm && (
              <form onSubmit={handleBulkAdd} className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm space-y-3">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">メンバー一括入力</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">背番号はグループに追加したあと設定できます</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-8">#</th>
                        <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium">名前 *</th>
                        <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-24">ポジション</th>
                        <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-36">生年月日</th>
                        <th className="text-left py-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-24">利き足</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, i) => (
                        <tr key={row.id} className="border-b dark:border-gray-700 last:border-0">
                          <td className="py-1 pr-2 text-gray-400 dark:text-gray-500 text-xs">{i + 1}</td>
                          <td className="py-1 pr-2">
                            <input value={row.name} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
                          </td>
                          <td className="py-1 pr-2">
                            <input value={row.position} placeholder="FW" onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, position: e.target.value } : r))}
                              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
                          </td>
                          <td className="py-1 pr-2">
                            <input type="date" value={row.birth_date} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, birth_date: e.target.value } : r))}
                              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
                          </td>
                          <td className="py-1">
                            <select value={row.preferred_foot} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, preferred_foot: e.target.value } : r))}
                              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100">
                              <option value="">-</option>
                              <option value="right">右</option>
                              <option value="left">左</option>
                              <option value="both">両</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={() => setBulkRows(rows => [...rows, newBulkRow()])}
                  className="text-sm text-green-600 dark:text-green-400 hover:underline">+ 行を追加</button>
                {bulkError && <p className="text-red-500 text-sm">{bulkError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowBulkForm(false)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    キャンセル
                  </button>
                  <button type="submit" disabled={bulkLoading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-green-700">
                    {bulkLoading ? '登録中...' : `${bulkRows.filter(r => r.name.trim()).length}人を登録する`}
                  </button>
                </div>
              </form>
            )}

            {showAddForm && (
              <form onSubmit={handleAdd} className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm space-y-3">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">新しいメンバー</h2>
                <MemberFormFields form={addForm} onChange={setAddForm} />
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    メールアドレス
                    <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">（任意・アプリにログインさせる場合に入力）</span>
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                {addError && <p className="text-red-500 text-sm">{addError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    キャンセル
                  </button>
                  <button type="submit" disabled={addLoading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-green-700">
                    {addLoading ? '追加中...' : '追加する'}
                  </button>
                </div>
              </form>
            )}

            {editingId && (
              <form onSubmit={handleSaveEdit} className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm space-y-3 border-2 border-green-400">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">メンバー情報を編集</h2>
                <MemberFormFields form={editForm} onChange={setEditForm} />
                {editError && <p className="text-red-500 text-sm">{editError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingId(null)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    キャンセル
                  </button>
                  <button type="submit" disabled={editLoading}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-green-700">
                    {editLoading ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            )}

            {inviteError && !inviteUrl && (
              <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{inviteError}</p>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">名前</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">所属グループ</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">ポジション</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">ロール</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {members.map(m => {
                    const mgs = memberGroupsMap[m.id] ?? []
                    return (
                      <tr key={m.id} className={editingId === m.id ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {m.name}
                          {!m.has_login && (
                            <span className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">未登録</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {mgs.length === 0 ? (
                            <span className="text-xs text-gray-300 dark:text-gray-600">未所属</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {mgs.map(mg => {
                                const g = groups.find(g => g.id === mg.group_id)
                                if (!g) return null
                                return (
                                  <span key={mg.group_id} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                                    {g.name}{mg.jersey_number != null ? ` #${mg.jersey_number}` : ''}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{m.position ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                            {m.role === 'admin' ? '管理者' : 'メンバー'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <button onClick={() => startEdit(m)} className="text-xs text-green-600 dark:text-green-400 hover:underline">編集</button>
                            <button onClick={() => handleToggleRole(m)} className="text-xs text-blue-500 hover:underline">
                              {m.role === 'admin' ? 'メンバーに変更' : '管理者に変更'}
                            </button>
                            {!m.has_login && (
                              <button
                                onClick={() => handleIssueInvite(m)}
                                disabled={inviteLoading === m.id}
                                className="text-xs text-purple-500 hover:underline disabled:opacity-50"
                              >
                                {inviteLoading === m.id ? '発行中...' : '招待リンクを発行'}
                              </button>
                            )}
                            <button onClick={() => removeMember(m.id)} className="text-xs text-red-400 hover:underline">削除</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
