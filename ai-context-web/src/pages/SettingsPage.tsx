import { useEffect, useState } from 'react'
import { listTokens, createToken, rotateToken, deleteToken } from '../api/tokens'
import type { ApiToken } from '../api/tokens'

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Rotate dialog
  const [rotatingToken, setRotatingToken] = useState<ApiToken | null>(null)
  const [rotatedToken, setRotatedToken] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  // Revoke dialog
  const [revokingToken, setRevokingToken] = useState<ApiToken | null>(null)
  const [revoking, setRevoking] = useState(false)

  const loadTokens = async () => {
    setLoading(true)
    try {
      const list = await listTokens()
      setTokens(list)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTokens()
  }, [])

  // ---------- Create Token ----------
  const handleCreate = async () => {
    if (!createName.trim() || creating) return
    setCreating(true)
    try {
      const res = await createToken(createName.trim())
      setCreatedToken(res.token)
      await loadTokens()
    } catch {
      /* ignore */
    } finally {
      setCreating(false)
    }
  }

  const closeCreateDialog = () => {
    setShowCreate(false)
    setCreateName('')
    setCreatedToken(null)
  }

  // ---------- Rotate Token ----------
  const handleRotate = async () => {
    if (!rotatingToken || rotating) return
    setRotating(true)
    try {
      const res = await rotateToken(rotatingToken.id)
      setRotatedToken(res.token)
      await loadTokens()
    } catch {
      /* ignore */
    } finally {
      setRotating(false)
    }
  }

  const closeRotateDialog = () => {
    setRotatingToken(null)
    setRotatedToken(null)
  }

  // ---------- Revoke Token ----------
  const handleRevoke = async () => {
    if (!revokingToken || revoking) return
    setRevoking(true)
    try {
      await deleteToken(revokingToken.id)
      setRevokingToken(null)
      await loadTokens()
    } catch {
      /* ignore */
    } finally {
      setRevoking(false)
    }
  }

  // ---------- Copy helper ----------
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
      </div>

      {/* ===== Token Management ===== */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Token 管理</h2>
          <button
            type="button"
            onClick={() => {
              setCreateName('')
              setCreatedToken(null)
              setShowCreate(true)
            }}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            生成新 Token
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">暂无 Token</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">前缀</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">过期时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后使用</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tokens.map((tok, i) => (
                  <tr key={tok.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{tok.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{tok.token_prefix}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          tok.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : tok.status === 'expired'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tok.status === 'active' ? '有效' : tok.status === 'expired' ? '已过期' : '已撤销'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(tok.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(tok.last_used_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {tok.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRotatedToken(null)
                              setRotatingToken(tok)
                            }}
                            className="text-indigo-600 hover:text-indigo-800 mr-3 cursor-pointer"
                          >
                            轮换
                          </button>
                          <button
                            type="button"
                            onClick={() => setRevokingToken(tok)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            撤销
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Create Token Modal ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">生成新 Token</h3>

            {!createdToken ? (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Token 名称</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="例如：CI/CD Pipeline"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreateDialog}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !createName.trim()}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? '生成中...' : '生成'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium mb-2">
                    Token 已生成！请立即复制，此 Token 仅显示一次。
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono break-all">
                      {createdToken}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdToken)}
                      className="shrink-0 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      复制
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeCreateDialog}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Rotate Token Modal ===== */}
      {rotatingToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">轮换 Token</h3>

            {!rotatedToken ? (
              <>
                <p className="text-sm text-gray-600 mb-6">
                  确认轮换 Token「{rotatingToken.name}」？轮换后旧 Token 将立即失效，新 Token 将生成。
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeRotateDialog}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    disabled={rotating}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {rotating ? '轮换中...' : '确认轮换'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium mb-2">
                    新 Token 已生成！请立即复制，此 Token 仅显示一次。
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono break-all">
                      {rotatedToken}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rotatedToken)}
                      className="shrink-0 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      复制
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeRotateDialog}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Revoke Token Confirm ===== */}
      {revokingToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">撤销 Token</h3>
            <p className="text-sm text-gray-600 mb-6">
              确认撤销 Token「{revokingToken.name}」？撤销后使用该 Token 的所有请求将被拒绝。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokingToken(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {revoking ? '撤销中...' : '确认撤销'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
