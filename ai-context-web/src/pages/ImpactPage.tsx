import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { analyzeImpact } from '../api/impact'
import type { ImpactResult } from '../api/impact'
import { getApp } from '../api/apps'
import type { App } from '../api/systems'
import mermaid from 'mermaid'

const RISK_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  UNKNOWN: 'bg-gray-100 text-gray-600 border-gray-300',
}

const RISK_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-emerald-500',
  UNKNOWN: 'bg-gray-400',
}

interface DepthNode {
  name: string
  file?: string
  type?: string
  [key: string]: unknown
}

export default function ImpactPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState<'both' | 'upstream' | 'downstream'>('both')
  const [depth, setDepth] = useState(3)
  const [crossProject, setCrossProject] = useState(false)
  const [crossSystem, setCrossSystem] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // Result state
  const [result, setResult] = useState<ImpactResult | null>(null)

  // Expand/collapse
  const [showUpstream, setShowUpstream] = useState(false)
  const [showDownstream, setShowDownstream] = useState(false)

  // Mermaid ref
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [mermaidId] = useState(() => `mermaid-${Date.now()}`)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getApp(id)
      .then(setApp)
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoading(false))
  }, [id])

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    })
  }, [])

  // Render mermaid when result changes
  useEffect(() => {
    if (!result || !mermaidRef.current) return

    const graphCode = buildMermaidGraph(result)
    if (!graphCode) return

    const renderMermaid = async () => {
      try {
        mermaidRef.current!.innerHTML = ''
        const { svg } = await mermaid.render(mermaidId, graphCode)
        mermaidRef.current!.innerHTML = svg
      } catch {
        mermaidRef.current!.innerHTML =
          '<p class="text-sm text-gray-400">图表渲染失败</p>'
      }
    }
    renderMermaid()
  }, [result, mermaidId])

  const handleAnalyze = async () => {
    if (!id || !target.trim()) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const data = await analyzeImpact(id, {
        target: target.trim(),
        direction,
        depth,
        cross_project: crossProject,
        cross_system: crossSystem,
      })
      setResult(data)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { message?: string } } }).response
        setError(resp?.data?.message || '分析失败')
      } else {
        setError('网络错误，请稍后重试')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const buildMermaidGraph = (res: ImpactResult): string => {
    const nodes = new Set<string>()
    const edges: string[] = []

    const sanitize = (name: string) =>
      name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40)

    // Target node
    const targetId = sanitize(res.target.name)
    nodes.add(targetId)

    // Upstream nodes
    ;(res.upstream ?? []).forEach((level) => {
      ;(level.nodes as DepthNode[] ?? []).forEach((node) => {
        const nid = sanitize(node.name)
        nodes.add(nid)
        edges.push(`${nid} --> ${targetId}`)
      })
    })

    // Downstream nodes
    ;(res.downstream ?? []).forEach((level) => {
      ;(level.nodes as DepthNode[] ?? []).forEach((node) => {
        const nid = sanitize(node.name)
        nodes.add(nid)
        edges.push(`${targetId} --> ${nid}`)
      })
    })

    if (nodes.size <= 1) return ''

    const nodeDefs = Array.from(nodes)
      .map((n) => `${n}["${n}"]`)
      .join('\n  ')

    return `graph LR\n  ${nodeDefs}\n  ${edges.join('\n  ')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-400">加载中...</span>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-red-500">APP不存在或已删除</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-indigo-600 mb-2 inline-flex items-center gap-1"
        >
          <span aria-hidden="true">&larr;</span> 返回APP
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          影响分析 - {app.name}
        </h1>
      </div>

      {/* Search area */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目标（接口路径或符号名）
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="例如: POST /api/v1/payment 或 UserService"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分析方向
            </label>
            <div className="flex gap-4">
              {(['both', 'upstream', 'downstream'] as const).map((dir) => (
                <label key={dir} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={dir}
                    checked={direction === dir}
                    onChange={() => setDirection(dir)}
                    className="accent-indigo-600"
                  />
                  {dir}
                </label>
              ))}
            </div>
          </div>

          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分析深度
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选项
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crossProject}
                  onChange={(e) => setCrossProject(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                cross_project
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crossSystem}
                  onChange={(e) => setCrossSystem(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                cross_system
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !target.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {analyzing ? '分析中...' : '分析'}
          </button>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Risk level */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 text-lg font-bold px-4 py-2 rounded-lg border ${RISK_STYLES[result.risk] ?? RISK_STYLES.UNKNOWN}`}
              >
                <span
                  className={`w-3 h-3 rounded-full ${RISK_DOT[result.risk] ?? RISK_DOT.UNKNOWN}`}
                />
                {result.risk}
              </span>
              {result.target && (
                <span className="text-sm text-gray-500">
                  目标: <span className="font-mono font-medium text-gray-700">{result.target.name}</span>
                  {result.target.file && (
                    <span className="ml-2 font-mono text-gray-400">
                      {result.target.file}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {result.summary.direct_upstream}
              </div>
              <div className="text-sm text-gray-500 mt-1">直接上游调用者</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {result.summary.direct_downstream}
              </div>
              <div className="text-sm text-gray-500 mt-1">直接下游依赖</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {result.summary.affected_processes}
              </div>
              <div className="text-sm text-gray-500 mt-1">受影响执行流程</div>
            </div>
          </div>

          {/* Upstream details */}
          {result.upstream && result.upstream.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <button
                type="button"
                onClick={() => setShowUpstream(!showUpstream)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showUpstream ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                上游详情
              </button>
              {showUpstream && (
                <div className="mt-3 divide-y divide-gray-100">
                  {result.upstream.map((level) =>
                    (level.nodes as DepthNode[] ?? []).map((node, ni) => (
                      <div key={`${node.name}-${ni}`} className="py-2 flex items-center gap-4">
                        <span className="text-xs text-gray-400 w-16 shrink-0">
                          深度 {level.depth}
                        </span>
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {node.name}
                        </span>
                        {node.file && (
                          <span className="text-xs text-gray-500 font-mono">
                            {node.file}
                          </span>
                        )}
                      </div>
                    )),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Downstream details */}
          {result.downstream && result.downstream.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <button
                type="button"
                onClick={() => setShowDownstream(!showDownstream)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showDownstream ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                下游详情
              </button>
              {showDownstream && (
                <div className="mt-3 divide-y divide-gray-100">
                  {result.downstream.map((level) =>
                    (level.nodes as DepthNode[] ?? []).map((node, ni) => (
                      <div key={`${node.name}-${ni}`} className="py-2 flex items-center gap-4">
                        <span className="text-xs text-gray-400 w-16 shrink-0">
                          深度 {level.depth}
                        </span>
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {node.name}
                        </span>
                        {node.file && (
                          <span className="text-xs text-gray-500 font-mono">
                            {node.file}
                          </span>
                        )}
                      </div>
                    )),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Affected processes */}
          {result.affected_processes && result.affected_processes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                受影响执行流程
              </h3>
              <div className="space-y-3">
                {result.affected_processes.map((proc) => (
                  <div
                    key={proc.id}
                    className="border border-gray-100 rounded-md p-3"
                  >
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      {proc.label}
                    </div>
                    {(proc.steps as { name: string; file?: string }[] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(proc.steps as { name: string; file?: string }[]).map(
                          (step, si) => (
                            <span
                              key={`${step.name}-${si}`}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-50 text-gray-600"
                            >
                              <span className="text-gray-400">{si + 1}.</span>
                              {step.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mermaid graph */}
          {result.upstream && result.downstream && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                调用链路图
              </h3>
              <div ref={mermaidRef} className="overflow-x-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
