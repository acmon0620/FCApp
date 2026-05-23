'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createMemberInvite, deleteMember, toggleMemberRole } from './actions'

type Member = {
  id: string
  name: string
  number: number | null
  position: string | null
  role: string
  birth_date: string | null
  preferred_foot: string | null
  has_login: boolean
}

type MemberForm = {
  name: string
  number: string
  position: string
  birth_date: string
  preferred_foot: string
}

const emptyForm: MemberForm = { name: '', number: '', position: '', birth_date: '', preferred_foot: '' }

function MemberFormFields({ form, onChange }: { form: MemberForm; onChange: (f: MemberForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">名前 *</label>
        <input type="text" value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} required
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">背番号</label>
        <input type="number" value={form.number} onChange={e => onChange({ ...form, number: e.target.value })} min={1}
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
  id: crypto.randomUUID(), name: '', number: '', position: '', birth_date: '', preferred_foot: '',
})

export default function AdminMembersClient({ members, teamId }: { members: Member[]; teamId: string }) {
  const router = useRouter()
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

  function startEdit(member: Member) {
    setEditingId(member.id)
    setEditForm({
      name: member.name,
      number: member.number?.toString() ?? '',
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
      number: editForm.number ? Number(editForm.number) : null,
      position: editForm.position || null,
      birth_date: editForm.birth_date || null,
      preferred_foot: editForm.preferred_foot || null,
    }).eq('id', editingId)

    if (error) {
      setEditError('更新に失敗しました: ' + error.message)
      setEditLoading(false)
      return
    }
    setEditingId(null)
    setEditLoading(false)
    router.refresh()
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault()
    setBulkError('')
    const validRows = bulkRows.filter(r => r.name.trim())
    if (validRows.length === 0) {
      setBulkError('名前を少なくとも1件入力してください')
      return
    }
    setBulkLoading(true)
    const supabase = createClient()
    const inserts = validRows.map(r => ({
      id: crypto.randomUUID(),
      team_id: teamId,
      name: r.name.trim(),
      role: 'member',
      has_login: false,
      number: r.number ? Number(r.number) : null,
      position: r.position || null,
      birth_date: r.birth_date || null,
      preferred_foot: r.preferred_foot || null,
    }))
    const { error } = await supabase.from('members').insert(inserts)
    if (error) {
      setBulkError('登録に失敗しました: ' + error.message)
      setBulkLoading(false)
      return
    }
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
      number: addForm.number ? Number(addForm.number) : null,
      position: addForm.position || null,
      birth_date: addForm.birth_date || null,
      preferred_foot: addForm.preferred_foot || null,
    })

    if (memberError) {
      setAddError('メンバー登録に失敗しました: ' + memberError.message)
      setAddLoading(false)
      return
    }

    setShowAddForm(false)
    setAddForm(emptyForm)
    setEmail('')
    setAddLoading(false)
    router.refresh()
  }

  async function handleToggleRole(member: Member) {
    const result = await toggleMemberRole(member.id)
    if (result.error) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  async function handleIssueInvite(member: Member) {
    setInviteLoading(member.id)
    setInviteError('')
    const result = await createMemberInvite(member.id)
    setInviteLoading(null)
    if (result.error) {
      setInviteError(result.error)
      return
    }
    const url = `${window.location.origin}/invite/${result.code}`
    setInviteUrl(url)
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
    if (result.error) {
      alert('削除に失敗しました: ' + result.error)
      return
    }
    router.refresh()
  }

  return (
    <>
      {/* 招待URLモーダル */}
      {inviteUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">招待リンクを発行しました</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              このリンクをメンバーに送ってください。メンバーがリンクを開いてメールアドレスとパスワードを設定することでログインできるようになります。有効期限は7日間です。
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 break-all font-mono">
              {inviteUrl}
            </div>
            {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                {copied ? 'コピーしました ✓' : 'URLをコピー'}
              </button>
              <button
                onClick={() => setInviteUrl(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-8">#</th>
                    <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium">名前 *</th>
                    <th className="text-left py-2 pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium w-20">背番号</th>
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
                        <input type="number" value={row.number} min={1} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, number: e.target.value } : r))}
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
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">番号</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">ポジション</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">ロール</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {members.map(m => (
                <tr key={m.id} className={editingId === m.id ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {m.name}
                    {!m.has_login && (
                      <span className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">未登録</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.number ?? '-'}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
