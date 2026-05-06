import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getIndexJob, cancelIndex } from '../api/index'
import type { IndexJob } from '../api/index'
import { getApp } from '../api/apps'

interface LogEntry {
  step: string
  message: string
  progress: number
  timestamp: Date
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: '等待中', color: 'text-gray-500', icon: '⏳' },
  running: { label: '运行中', color: 'text-indigo-600', icon: '⟳' },
  success: { label: '已完成', color: 'text-emerald-500', icon: '✓' },
  failed: { label: '失败', color: 'text-red-500', icon: '✗' },
  cancelled: { label: '已取消', color: 'text-gray-500', icon: '⊘' },
}

export default function IndexProgressPage() {
  const { id, jobId } = useParams<{ id: string; jobId: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<{ name: string } | null>(null)
  const [job, setJob] = useState<IndexJob | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  // Load initial data
  useEffect(() => {
    if (!id || !jobId) return

    let cancelled = false

    const loadData = async () => {
      try {
        const [appData, jobData] = await Promise.all([
          getApp(id),
          getIndexJob(Number(jobId)),
        ])
        if (cancelled) return
        setApp({ name: appData.name })
        setJob(jobData)

        if (jobData.status === 'success') {
          setProgress(100)
        } else if (jobData.status === 'failed' || jobData.status === 'cancelled') {
          setProgress(0)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id, jobId])

  // SSE connection for real-time progress
  useEffect(() => {
    if (!jobId) return
    if (job?.status === 'success' || job?.status === 'failed' || job?.status === 'cancelled') return

    const token = localStorage.getItem('access_token')
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
    const url = `${base}/index/jobs/${jobId}/progress${token ? `?token=${encodeURIComponent(token)}` : ''}`

    const eventSource = new EventSource(url)

    // Handle typed SSE events: progress, log, completed, failed, cancelled
    const handleProgress = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          step?: string
          message?: string
          progress?: number
        }
        if (typeof data.progress === 'number') {
          setProgress(data.progress)
        }
      } catch { /* ignore */ }
    }

    const handleLog = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          step?: string
          message?: string
          progress?: number
        }
        if (data.step && data.message) {
          setLogs((prev) => [
            ...prev,
            {
              step: data.step!,
              message: data.message!,
              progress: data.progress ?? 0,
              timestamp: new Date(),
            },
          ])
        }
      } catch { /* ignore */ }
    }

    const handleCompleted = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          stats?: Record<string, number>
        }
        setProgress(100)
        setJob((prev) =>
          prev
            ? { ...prev, status: 'success', stats: data.stats ?? prev.stats }
            : prev,
        )
      } catch { /* ignore */ }
      eventSource.close()
    }

    const handleFailed = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          error_message?: string
        }
        setJob((prev) =>
          prev
            ? { ...prev, status: 'failed', error_message: data.error_message ?? null }
            : prev,
        )
      } catch { /* ignore */ }
      eventSource.close()
    }

    const handleCancelled = () => {
      setJob((prev) =>
        prev ? { ...prev, status: 'cancelled' } : prev,
      )
      eventSource.close()
    }

    eventSource.addEventListener('progress', handleProgress)
    eventSource.addEventListener('log', handleLog)
    eventSource.addEventListener('completed', handleCompleted)
    eventSource.addEventListener('failed', handleFailed)
    eventSource.addEventListener('cancelled', handleCancelled)

    eventSource.onerror = () => {
      eventSource.close()
      if (jobId) {
        getIndexJob(Number(jobId)).then(setJob).catch(() => {})
      }
    }

    return () => {
      eventSource.close()
    }
  }, [jobId, job?.status])

  const handleCancel = async () => {
    if (!id || cancelling) return
    setCancelling(true)
    try {
      await cancelIndex(id)
    } catch {
      /* ignore */
    } finally {
      setCancelling(false)
    }
  }

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400">加载中...</span>
      </div>
    )
  }

  const appName = app?.name ?? 'APP'
  const status = job?.status ?? 'pending'
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const isRunning = status === 'running' || status === 'pending'

  return (
    <div className="space-y-6">
      {/* ===== Top bar ===== */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`/apps/${id}`)}
          className="text-sm text-gray-500 hover:text-indigo-600 mb-2 inline-flex items-center gap-1 cursor-pointer"
        >
          <span aria-hidden="true">&larr;</span> 返回 {appName}
        </button>

        <h1 className="text-2xl font-bold text-gray-900">
          索引进度 - {appName}
        </h1>
      </div>

      {/* ===== Status Card ===== */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{statusConfig.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {statusConfig.label}
              </h2>
              {job?.error_message && (
                <p className="text-sm text-red-500 mt-1">{job.error_message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${statusConfig.color}`}>
              Job #{jobId}
            </span>
            {isRunning && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? '取消中...' : '取消索引'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(status === 'running' || status === 'pending' || status === 'success') && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">进度</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: status === 'success'
                    ? '#10b981'
                    : 'linear-gradient(90deg, #4f46e5, #818cf8)',
                }}
              />
            </div>
          </div>
        )}

        {/* Step logs */}
        {logs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">步骤日志</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {logs.map((log, i) => {
                const isLast = i === logs.length - 1
                const logStatus = isLast && status === 'running'
                  ? 'running'
                  : status === 'success'
                    ? 'success'
                    : status === 'failed' && isLast
                      ? 'failed'
                      : status === 'cancelled' && isLast
                        ? 'cancelled'
                        : 'success'

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 px-3 rounded-md bg-gray-50"
                  >
                    <span className="shrink-0 text-sm mt-0.5">
                      {logStatus === 'success' && (
                        <span className="text-emerald-500">✓</span>
                      )}
                      {logStatus === 'running' && (
                        <span className="text-indigo-600">⟳</span>
                      )}
                      {logStatus === 'failed' && (
                        <span className="text-red-500">✗</span>
                      )}
                      {logStatus === 'cancelled' && (
                        <span className="text-gray-400">⊘</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {log.step}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {log.timestamp.toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{log.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== Completed State ===== */}
      {status === 'success' && job?.stats && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-emerald-500 mb-4">索引完成</h3>
          <div className="grid grid-cols-3 gap-4">
            {job.stats.nodes !== undefined && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{job.stats.nodes}</p>
                <p className="text-sm text-gray-500 mt-1">节点数</p>
              </div>
            )}
            {job.stats.edges !== undefined && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{job.stats.edges}</p>
                <p className="text-sm text-gray-500 mt-1">边数</p>
              </div>
            )}
            {job.stats.communities !== undefined && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{job.stats.communities}</p>
                <p className="text-sm text-gray-500 mt-1">社区数</p>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => navigate(`/apps/${id}`)}
              className="px-6 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            >
              查看Wiki
            </button>
          </div>
        </div>
      )}

      {/* ===== Failed State ===== */}
      {status === 'failed' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">✗</div>
            <h3 className="text-lg font-semibold text-red-500 mb-2">索引失败</h3>
            {job?.error_message && (
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                {job.error_message}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate(`/apps/${id}`)}
              className="px-6 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* ===== Cancelled State ===== */}
      {status === 'cancelled' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">⊘</div>
            <h3 className="text-lg font-semibold text-gray-500 mb-2">索引已取消</h3>
            <p className="text-sm text-gray-400 mb-6">
              索引任务已被取消，你可以重新触发索引。
            </p>
            <button
              type="button"
              onClick={() => navigate(`/apps/${id}`)}
              className="px-6 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
            >
              返回APP
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
