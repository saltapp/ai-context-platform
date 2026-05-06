interface StatusBadgeProps {
  status: 'none' | 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | string
}

const statusConfig: Record<
  string,
  { label: string; classes: string; spin?: boolean }
> = {
  none: {
    label: '未索引',
    classes: 'bg-gray-100 text-gray-700',
  },
  pending: {
    label: '等待中',
    classes: 'bg-amber-100 text-amber-700',
  },
  running: {
    label: '索引中',
    classes: 'bg-amber-100 text-amber-700',
    spin: true,
  },
  success: {
    label: '已索引',
    classes: 'bg-emerald-100 text-emerald-700',
  },
  cancelled: {
    label: '已取消',
    classes: 'bg-gray-100 text-gray-700',
  },
  failed: {
    label: '失败',
    classes: 'bg-red-100 text-red-700',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.none

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.spin && (
        <svg
          className="animate-spin h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {config.label}
    </span>
  )
}
