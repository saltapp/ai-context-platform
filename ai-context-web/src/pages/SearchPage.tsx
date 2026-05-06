import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { searchCode } from '../api/graph'
import { getApp } from '../api/apps'
import type { App } from '../api/systems'

interface SymbolResult {
  name: string
  type: string
  file: string
  summary?: string
  [key: string]: unknown
}

export default function SearchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<App | null>(null)
  const [loadingApp, setLoadingApp] = useState(true)

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid')
  const [limit, setLimit] = useState(20)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SymbolResult[]>([])
  const [total, setTotal] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  // Load app info on mount
  useState(() => {
    if (!id) return
    getApp(id)
      .then(setApp)
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoadingApp(false))
  })

  const handleSearch = async () => {
    if (!id || !query.trim()) return
    setSearching(true)
    setHasSearched(true)
    try {
      const data = await searchCode(id, query.trim(), mode, limit)
      setResults((data.results as SymbolResult[]) ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setResults([])
      setTotal(0)
    } finally {
      setSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  if (loadingApp) {
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
          代码搜索 - {app.name}
        </h1>
      </div>

      {/* Search area */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词搜索代码符号..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">搜索模式:</label>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as 'hybrid' | 'keyword' | 'semantic')
              }
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="hybrid">hybrid</option>
              <option value="keyword">keyword</option>
              <option value="semantic">semantic</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">结果数量:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Search results */}
      {!hasSearched && (
        <div className="text-center py-16">
          <svg
            className="mx-auto w-12 h-12 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="text-gray-400">输入关键词开始搜索</p>
        </div>
      )}

      {hasSearched && !searching && total === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400">未找到匹配结果</p>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            共找到 <span className="font-semibold text-gray-700">{total}</span> 个结果
          </div>

          {results.map((item, i) => (
            <div
              key={`${item.name}-${item.file}-${i}`}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* Type badge */}
                <span className="inline-block shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 mt-0.5">
                  {item.type || 'Unknown'}
                </span>

                <div className="min-w-0 flex-1">
                  {/* Symbol name */}
                  <div className="font-mono font-semibold text-gray-900 text-sm">
                    {item.name}
                  </div>

                  {/* File path */}
                  <div className="text-xs text-gray-500 font-mono mt-1 truncate">
                    {item.file}
                  </div>

                  {/* Summary */}
                  {item.summary && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
