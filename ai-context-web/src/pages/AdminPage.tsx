import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  listUsers,
  createUser,
  updateUserStatus,
  listAuditLogs,
} from '../api/admin'
import type { AdminUser, AuditLog, AuditLogListResponse } from '../api/admin'

type TabKey = 'users' | 'audit'

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

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('users')

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-red-500">无权限访问此页面</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理员面板</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {(['users', 'audit'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'users' ? '用户管理' : '审计日志'}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  )
}

// ==================== Users Tab ====================
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createDisplayName, setCreateDisplayName] = useState('')
  const [createRole, setCreateRole] = useState<'admin' | 'user'>('user')
  const [creating, setCreating] = useState(false)

  // Disable confirm
  const [disablingUser, setDisablingUser] = useState<AdminUser | null>(null)
  const [toggling, setToggling] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const list = await listUsers()
      setUsers(list)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async () => {
    if (!createUsername.trim() || !createPassword.trim() || creating) return
    setCreating(true)
    try {
      await createUser({
        username: createUsername.trim(),
        password: createPassword,
        display_name: createDisplayName.trim() || undefined,
        role: createRole,
      })
      setShowCreate(false)
      setCreateUsername('')
      setCreatePassword('')
      setCreateDisplayName('')
      setCreateRole('user')
      loadUsers()
    } catch {
      /* ignore */
    } finally {
      setCreating(false)
    }
  }

  const handleToggleStatus = async (targetUser: AdminUser) => {
    if (toggling) return
    setToggling(true)
    try {
      const newStatus = targetUser.status === 'active' ? 'disabled' : 'active'
      await updateUserStatus(targetUser.id, newStatus)
      setDisablingUser(null)
      loadUsers()
    } catch {
      /* ignore */
    } finally {
      setToggling(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
        <button
          type="button"
          onClick={() => {
            setCreateUsername('')
            setCreatePassword('')
            setCreateDisplayName('')
            setCreateRole('user')
            setShowCreate(true)
          }}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
        >
          创建用户
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">显示名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">系统配额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-900">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.display_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {u.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.system_quota}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTime(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    {u.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setDisablingUser(u)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        禁用
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                      >
                        启用
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Create User Modal ===== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名</label>
                <input
                  type="text"
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'admin' | 'user')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !createUsername.trim() || !createPassword.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Disable User Confirm ===== */}
      {disablingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">确认禁用用户</h3>
            <p className="text-sm text-gray-600 mb-6">
              确认禁用用户 <strong>{disablingUser.username}</strong>？该用户所有 Token 将立即失效，运行中索引任务将被取消。
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisablingUser(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(disablingUser)}
                disabled={toggling}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {toggling ? '处理中...' : '确认禁用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Audit Log Tab ====================
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterUsername, setFilterUsername] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterTargetType, setFilterTargetType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const loadLogs = async (p = page) => {
    setLoading(true)
    try {
      const res: AuditLogListResponse = await listAuditLogs({
        page: p,
        page_size: pageSize,
        username: filterUsername || undefined,
        action: filterAction || undefined,
        target_type: filterTargetType || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
      })
      setLogs(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    setPage(1)
    loadLogs(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadLogs(newPage)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">审计日志</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">用户</label>
            <input
              type="text"
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
              placeholder="用户名"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">操作类型</label>
            <input
              type="text"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="例如：create"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">目标类型</label>
            <input
              type="text"
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value)}
              placeholder="例如：system"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">开始日期</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">结束日期</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">详情</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.username || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.target_type || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{log.target_id || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={log.details || ''}>
                    {log.details || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.source || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-400">暂无日志</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            共 {total} 条记录，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
