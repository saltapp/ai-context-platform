import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRoutes } from '../api/graph'
import { getApp } from '../api/apps'
import type { App } from '../api/systems'

interface RouteConsumer {
  name: string
  file: string
}

interface RouteItem {
  method: string
  path: string
  handler: string
  handler_file: string
  middleware: string[]
  consumers: RouteConsumer[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-indigo-100 text-indigo-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
}

export default function RoutesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<App | null>(null)
  const [routes, setRoutes] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getApp(id), getRoutes(id)])
      .then(([appData, routeData]) => {
        setApp(appData)
        setRoutes(routeData.routes ?? [])
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoading(false))
  }, [id])

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

  const isIndexed = app.index_status === 'completed' || app.index_status === 'indexed'

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
          接口路由 - {app.name}
        </h1>
      </div>

      {/* Not indexed notice */}
      {!isIndexed && (
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-amber-700">
              请先完成索引，索引完成后可查看接口路由信息。
            </p>
          </div>
        </div>
      )}

      {/* Routes table */}
      {isIndexed && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {routes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无路由数据</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Path
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Handler
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Handler文件
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    中间件
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    消费者
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.map((route, i) => {
                  const isExpanded = expandedIndex === i
                  return (
                    <tr
                      key={`${route.method}-${route.path}-${i}`}
                      className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50/40 transition-colors`}
                    >
                      {/* Expand/collapse arrow */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIndex(isExpanded ? null : i)
                          }
                          className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          aria-label={isExpanded ? '折叠消费者' : '展开消费者'}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </td>

                      {/* Method badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${METHOD_COLORS[route.method] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {route.method}
                        </span>
                      </td>

                      {/* Path */}
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {route.path}
                      </td>

                      {/* Handler */}
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                        {route.handler || '-'}
                      </td>

                      {/* Handler file */}
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono truncate max-w-[200px]">
                        <span title={route.handler_file}>
                          {route.handler_file || '-'}
                        </span>
                      </td>

                      {/* Middleware */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {route.middleware.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {route.middleware.map((mw) => (
                              <span
                                key={mw}
                                className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                              >
                                {mw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Consumers count */}
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {route.consumers.length > 0 ? (
                          <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full w-6 h-6">
                            {route.consumers.length}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Expanded consumer details */}
      {expandedIndex !== null && routes[expandedIndex] && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            消费者列表 - {routes[expandedIndex].method}{' '}
            {routes[expandedIndex].path}
          </h3>
          {routes[expandedIndex].consumers.length === 0 ? (
            <p className="text-sm text-gray-400">暂无消费者</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {routes[expandedIndex].consumers.map((consumer, ci) => (
                <div
                  key={`${consumer.name}-${ci}`}
                  className="py-2 flex items-center gap-4"
                >
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {consumer.name}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {consumer.file}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
