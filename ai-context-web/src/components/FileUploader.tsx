import { useState, useRef, type DragEvent } from 'react'

interface FileUploaderProps {
  onUpload: (file: File, docType: string, title: string) => Promise<void>
  loading?: boolean
}

const docTypes = [
  { value: 'architecture', label: '架构文档' },
  { value: 'testcase', label: '测试用例' },
  { value: 'config', label: '配置文档' },
  { value: 'other', label: '其他' },
]

export default function FileUploader({ onUpload, loading }: FileUploaderProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('architecture')
  const [title, setTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      setFile(dropped)
      if (!title) setTitle(dropped.name)
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    await onUpload(file, docType, title)
    setFile(null)
    setDocType('architecture')
    setTitle('')
    setOpen(false)
  }

  const handleClose = () => {
    setFile(null)
    setDocType('architecture')
    setTitle('')
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        上传文档
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="relative bg-white rounded-xl shadow-xl max-w-[520px] w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              上传文档
            </h3>

            {/* 拖拽区域 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFile(f)
                    if (!title) setTitle(f.name)
                  }
                }}
              />
              {file ? (
                <p className="text-sm text-gray-700">{file.name}</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">
                    点击选择文件或拖拽文件到此处
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持任意文档格式
                  </p>
                </div>
              )}
            </div>

            {/* 文档类型 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文档类型
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {docTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 文档标题 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文档标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入文档标题"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 按钮 */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || !title || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
